import { createFileRoute } from '@tanstack/react-router'
import prisma from '@/db'
import { sendEmail } from '@/lib/email-service'
import { generateCommissionBonusEmail } from '@/lib/email-templates'

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

            const emailText = generateCommissionBonusEmail({
              employeeName,
              quarter: bonus.quarter,
              quota: bonus.quota,
              attainment: bonus.attainment,
              attainmentPercentage,
              bonusAmount: bonus.bonusAmount,
              calculatedAmount: bonus.calculatedAmount,
              calculatedAmountLocal: bonus.calculatedAmountLocal ?? undefined,
              localCurrency: bonus.localCurrency,
            })

            const emailResult = await sendEmail({
              to: bonus.employee.email,
              subject: `${bonus.quarter} Commission confirmation - ${employeeName}`,
              text: emailText,
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
