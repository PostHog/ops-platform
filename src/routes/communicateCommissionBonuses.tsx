import { createFileRoute } from '@tanstack/react-router'
import prisma from '@/db'
import { sendEmail } from '@/lib/email-service'
import { generateCommissionBonusEmail } from '@/lib/email-templates'
import {
  calculateQuarterBreakdown,
  getNextQuarter,
  getPreviousNQuarters,
} from '@/lib/commission-calculator'

export const Route = createFileRoute('/communicateCommissionBonuses')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get('Authorization')?.split(' ')[1]
        if (token !== process.env.SYNC_ENDPOINT_KEY) {
          return new Response('Unauthorized', { status: 401 })
        }

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
            const attainmentPercentage = (bonus.attainment / bonus.quota) * 100
            const employeeName =
              bonus.employee.deelEmployee?.name ||
              bonus.employee.email.split('@')[0]

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
            if (historicalBonuses.length === 4) {
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

            const emailHtml = generateCommissionBonusEmail({
              employeeName,
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
            })

            const emailResult = await sendEmail({
              to: bonus.employee.email,
              subject: `${bonus.quarter} Commission confirmation - ${employeeName}`,
              html: emailHtml,
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
