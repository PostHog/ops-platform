import { createFileRoute } from '@tanstack/react-router'
import prisma from '@/db'
import { sendEmail } from '@/lib/email-service'
import { generateCommissionBonusEmail } from '@/lib/email-templates'
import {
  calculateQuarterBreakdown,
  getNextQuarter,
  getPreviousNQuarters,
  calculateAttainmentPercentage,
  isCSMCommissionType,
} from '@/lib/commission-calculator'

/**
 * Get the report chain (all managers up the hierarchy) for an employee
 * Returns an array of work emails for all managers in the chain
 * Excludes co-founders (people with no manager themselves)
 */
async function getReportChain(employeeEmail: string): Promise<string[]> {
  const reportChain: string[] = []

  // Start with the employee's deel record to get their manager
  let currentEmployee = await prisma.deelEmployee.findUnique({
    where: { workEmail: employeeEmail },
    select: { managerId: true },
  })

  while (currentEmployee?.managerId) {
    const manager = await prisma.deelEmployee.findUnique({
      where: { id: currentEmployee.managerId },
      select: { workEmail: true, managerId: true },
    })

    // Only include if this manager has a manager themselves (excludes co-founders)
    if (manager?.workEmail && manager.managerId) {
      reportChain.push(manager.workEmail)
    }

    currentEmployee = manager
  }

  return reportChain
}

/**
 * Get CC recipients from environment variable COMMISSION_PAYOUT_CCS
 * Expects a comma-separated list of email addresses
 */
function getCommissionPayoutCCs(): string[] {
  const ccEnv = process.env.COMMISSION_PAYOUT_EMAIL_CCS
  if (!ccEnv) return []

  return ccEnv
    .split(',')
    .map((email) => email.trim())
    .filter((email) => email.length > 0)
}

export const Route = createFileRoute('/communicateCommissionBonuses')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get('Authorization')?.split(' ')[1]
        if (token !== process.env.SYNC_ENDPOINT_KEY) {
          return new Response('Unauthorized', { status: 401 })
        }

        // Get static CC list from env
        const staticCCs = getCommissionPayoutCCs()

        const bonuses = await prisma.commissionBonus.findMany({
          where: {
            communicated: false,
          },
          include: {
            employee: {
              include: {
                deelEmployee: {
                  select: {
                    name: true,
                    firstName: true,
                    lastName: true,
                    startDate: true,
                  },
                },
              },
            },
          },
          take: 10, // Process in batches
        })

        const errors: string[] = []
        const results: { bonusId: string; email: string }[] = []

        for (const bonus of bonuses) {
          try {
            const attainmentPercentage = calculateAttainmentPercentage(
              bonus.attainment,
              bonus.quota,
              bonus.commissionType,
            )
            const firstName = bonus.employee.deelEmployee?.firstName || ''
            const lastName = bonus.employee.deelEmployee?.lastName

            // Calculate quarter breakdown for ramp-up info
            const startDate = bonus.employee.deelEmployee?.startDate
              ? new Date(bonus.employee.deelEmployee.startDate)
              : null
            const quarterBreakdown = calculateQuarterBreakdown(
              startDate,
              bonus.quarter,
            )

            // Calculate next quarter ramp-up amount if applicable
            let nextQuarterRampUpAmount: number | undefined
            if (
              quarterBreakdown.rampUpMonths > 0 &&
              quarterBreakdown.postRampUpMonths === 0
            ) {
              // Check if there's ramp-up in the next quarter too
              const nextQuarter = getNextQuarter(bonus.quarter)
              const nextQuarterBreakdown = calculateQuarterBreakdown(
                startDate,
                nextQuarter,
              )
              if (nextQuarterBreakdown.rampUpMonths > 0) {
                // Calculate the ramp-up amount for next quarter in local currency
                const monthlyBonus = bonus.bonusAmount / 3
                nextQuarterRampUpAmount =
                  nextQuarterBreakdown.rampUpMonths *
                  monthlyBonus *
                  bonus.exchangeRate
              }
            }

            // Calculate trailing 12-month performance (last 4 quarters including current)
            let trailing12MonthsPerformance: number | undefined
            const previous3Quarters = getPreviousNQuarters(bonus.quarter, 3)
            const allQuarters = [bonus.quarter, ...previous3Quarters]

            // Get all bonuses for this employee in the last 4 quarters
            const historicalBonuses = await prisma.commissionBonus.findMany({
              where: {
                employeeId: bonus.employeeId,
                quarter: { in: allQuarters },
              },
            })

            // Only calculate if we have all 4 quarters of data
            // Note: For mixed commission types, we use weighted average
            if (historicalBonuses.length === 4) {
              // For CSM, sum up the attainment percentages directly
              // For others, calculate total attainment / total quota
              const hasCSM = historicalBonuses.some((b) =>
                isCSMCommissionType(b.commissionType),
              )
              const allCSM = historicalBonuses.every((b) =>
                isCSMCommissionType(b.commissionType),
              )

              if (allCSM) {
                // All CSM - average the percentages
                const totalPercentage = historicalBonuses.reduce((sum, b) => {
                  const pct = calculateAttainmentPercentage(
                    b.attainment,
                    b.quota,
                    b.commissionType,
                  )
                  return sum + pct
                }, 0)
                trailing12MonthsPerformance = totalPercentage / 4
              } else if (!hasCSM) {
                // All non-CSM - use traditional calculation
                const totalAttainment = historicalBonuses.reduce(
                  (sum, b) => sum + b.attainment,
                  0,
                )
                const totalQuota = historicalBonuses.reduce(
                  (sum, b) => sum + b.quota,
                  0,
                )
                if (totalQuota > 0) {
                  trailing12MonthsPerformance =
                    (totalAttainment / totalQuota) * 100
                }
              }
              // For mixed, we skip the calculation (undefined)
            }

            const emailHtml = generateCommissionBonusEmail({
              firstName,
              quarter: bonus.quarter,
              quota: bonus.quota,
              attainment: bonus.attainment,
              attainmentPercentage,
              bonusAmount: bonus.bonusAmount,
              calculatedAmount: bonus.calculatedAmount,
              calculatedAmountLocal: bonus.calculatedAmountLocal ?? undefined,
              localCurrency: bonus.localCurrency,
              quarterBreakdown,
              nextQuarterRampUpAmount,
              notes: bonus.notes ?? undefined,
              sheet: bonus.sheet ?? undefined,
              amountHeld: bonus.amountHeld ?? undefined,
              exchangeRate: bonus.exchangeRate,
              trailing12MonthsPerformance,
              commissionType: bonus.commissionType,
            })

            // Get the employee's report chain (all managers up the hierarchy)
            const reportChain = await getReportChain(bonus.employee.email)

            // Combine report chain with static CCs, removing duplicates
            const allCCs = [...new Set([...reportChain, ...staticCCs])]

            const emailResult = await sendEmail({
              to: bonus.employee.email,
              subject: `${bonus.quarter} Commission confirmation - ${firstName}, ${lastName}`,
              html: emailHtml,
              cc: allCCs,
            })

            if (emailResult.success) {
              // Mark as communicated
              await prisma.commissionBonus.update({
                where: { id: bonus.id },
                data: { communicated: true },
              })
              results.push({
                bonusId: bonus.id,
                email: bonus.employee.email,
              })
            } else {
              throw new Error(emailResult.error || 'Failed to send email')
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error'
            errors.push(
              `Error sending email for bonus ${bonus.id} (${bonus.employee.email}): ${errorMessage}`,
            )
          }
        }

        if (errors.length > 0) {
          console.log(errors)
        }

        return Response.json({
          successCount: results.length,
          errorCount: errors.length,
          errors,
        })
      },
    },
  },
})
