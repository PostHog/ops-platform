import { createFileRoute } from '@tanstack/react-router'
import prisma from '@/db'
import { getFullName, getChecklistItemTypeLabel } from '@/lib/utils'

export const Route = createFileRoute(
  '/notifyOverduePerformanceProgramChecklistItems',
)({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get('Authorization')?.split(' ')[1]
        if (token !== process.env.SYNC_ENDPOINT_KEY) {
          return new Response('Unauthorized', { status: 401 })
        }

        const overdueItems =
          await prisma.performanceProgramChecklistItem.findMany({
            where: {
              completed: false,
              dueDate: { lt: new Date() },
              assignedToEmployeeId: { not: null },
            },
            include: {
              assignedTo: {
                include: { deelEmployee: true },
              },
              program: {
                include: { employee: { include: { deelEmployee: true } } },
              },
            },
          })

        const results = {
          initial: 0,
          reminders: 0,
          skipped: 0,
          errors: 0,
        }

        for (const item of overdueItems) {
          try {
            // Skip if no assignee email
            if (!item.assignedTo?.email) {
              results.skipped++
              continue
            }

            const assigneeEmail = item.assignedTo.email
            const programEmployeeName = getFullName(
              item.program.employee.deelEmployee?.firstName,
              item.program.employee.deelEmployee?.lastName,
              item.program.employee.email,
            )
            const itemTypeLabel = getChecklistItemTypeLabel(item.type)

            // Look up Slack user ID
            const userRes = await fetch(
              `https://slack.com/api/users.lookupByEmail?email=${assigneeEmail}`,
              {
                method: 'GET',
                headers: {
                  Authorization: `Bearer ${process.env.SLACK_TOKEN}`,
                },
              },
            )

            const userBody = await userRes.json()

            if (userRes.status !== 200 || !userBody.ok) {
              console.error(
                `Error looking up Slack user for ${assigneeEmail}: ${userRes.status}: ${JSON.stringify(userBody)}`,
              )
              results.errors++
              continue
            }

            const slackUserId = userBody.user.id

            // Initial notification (if never sent)
            if (!item.lastNotificationSentAt) {
              const messageBody = {
                blocks: [
                  {
                    type: 'section',
                    text: {
                      type: 'mrkdwn',
                      text: `Hey! You have an overdue checklist item for ${programEmployeeName}'s performance program.`,
                    },
                    accessory: {
                      type: 'button',
                      text: {
                        type: 'plain_text',
                        text: 'View Employee Page',
                        emoji: true,
                      },
                      url: `${process.env.VITE_APP_BETTER_AUTH_URL}/employee/${item.program.employeeId}`,
                      action_id: 'view_employee_page',
                    },
                  },
                ],
              }

              const response = await fetch(
                'https://slack.com/api/chat.postMessage',
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${process.env.SLACK_TOKEN}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    channel: slackUserId,
                    ...messageBody,
                  }),
                },
              )

              const messageResponse = await response.json()

              if (response.status !== 200 || !messageResponse.ok) {
                console.error(
                  `Error sending initial notification: ${response.status}: ${JSON.stringify(messageResponse)}`,
                )
                results.errors++
                continue
              }

              // Save thread_id and lastNotificationSentAt
              await prisma.performanceProgramChecklistItem.update({
                where: { id: item.id },
                data: {
                  lastNotificationSentAt: new Date(),
                  slackThreadId: messageResponse.ts,
                },
              })

              results.initial++
            }
            // Reminder (if >= 24 hours since last notification)
            else if (
              Date.now() - item.lastNotificationSentAt.getTime() >=
              24 * 60 * 60 * 1000
            ) {
              if (!item.slackThreadId) {
                // If no thread_id, send as new message (fallback)
                const messageBody = {
                  blocks: [
                    {
                      type: 'section',
                      text: {
                        type: 'mrkdwn',
                        text:
                          `Reminder: You have an overdue checklist item for ${programEmployeeName}'s performance program.\n\n` +
                          `*Item Type:* ${itemTypeLabel}\n` +
                          `*Due Date:* ${item.dueDate!.toLocaleDateString()}\n\n` +
                          `Please complete this item as soon as possible.`,
                      },
                    },
                  ],
                }

                const response = await fetch(
                  'https://slack.com/api/chat.postMessage',
                  {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${process.env.SLACK_TOKEN}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      channel: slackUserId,
                      ...messageBody,
                    }),
                  },
                )

                const messageResponse = await response.json()

                if (response.status !== 200 || !messageResponse.ok) {
                  console.error(
                    `Error sending reminder: ${response.status}: ${JSON.stringify(messageResponse)}`,
                  )
                  results.errors++
                  continue
                }

                // Update thread_id and lastNotificationSentAt
                await prisma.performanceProgramChecklistItem.update({
                  where: { id: item.id },
                  data: {
                    lastNotificationSentAt: new Date(),
                    slackThreadId: messageResponse.ts,
                  },
                })
              } else {
                // Send reminder in thread
                const response = await fetch(
                  'https://slack.com/api/chat.postMessage',
                  {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${process.env.SLACK_TOKEN}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      channel: slackUserId,
                      thread_ts: item.slackThreadId,
                      text: `<@${slackUserId}> please make sure to complete this checklist item`,
                    }),
                  },
                )

                const messageResponse = await response.json()

                if (response.status !== 200 || !messageResponse.ok) {
                  console.error(
                    `Error sending reminder in thread: ${response.status}: ${JSON.stringify(messageResponse)}`,
                  )
                  results.errors++
                  continue
                }

                // Update lastNotificationSentAt
                await prisma.performanceProgramChecklistItem.update({
                  where: { id: item.id },
                  data: {
                    lastNotificationSentAt: new Date(),
                  },
                })
              }

              results.reminders++
            }
          } catch (error) {
            console.error(`Error processing item ${item.id}:`, error)
            results.errors++
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            results,
          }),
        )
      },
    },
  },
})
