import { createFileRoute } from '@tanstack/react-router'
import prisma from '@/db'
import type { KeeperTestRating, KeeperTestRecommendation } from '@prisma/client'
import {
  ratingToText,
  driverRatingToText,
  proactiveRatingToText,
  optimisticRatingToText,
} from '@/lib/utils'

export const Route = createFileRoute('/receiveKeeperTestResults')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = new URL(request.url).searchParams.get('token')
        if (token !== process.env.SYNC_ENDPOINT_KEY) {
          return new Response('Unauthorized', { status: 401 })
        }

        const formData = await request.formData()
        const payloadString = formData.get('payload')

        let body
        try {
          body = JSON.parse(payloadString as string)
        } catch (error) {
          return new Response('Invalid JSON payload' + error, { status: 400 })
        }

        const invalidFields = []

        if (body.actions[0].action_id === 'submit_keeper_test') {
          const [
            employeeEmail,
            employeeId,
            managerName,
            managerId,
            jobId,
            title,
          ] = body.actions[0].value.split('|')
          for (const [, value] of Object.entries(
            body.state.values as Record<string, any>,
          )) {
            const fieldId = Object.keys(value)[0]
            const { type, selected_option } = value[fieldId]
            if (type === 'radio_buttons' && selected_option === null) {
              invalidFields.push(fieldId)
            } else if (
              type === 'plain_text_input' &&
              value[fieldId].value === null
            ) {
              invalidFields.push(fieldId)
            }
          }

          if (invalidFields.length > 0) {
            await fetch(body.response_url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                thread_ts: body.container.message_ts,
                text:
                  'Please complete all required fields: ' +
                  invalidFields.join(', '),
                response_type: 'in_channel',
                replace_original: false,
              }),
            })

            return new Response(
              JSON.stringify({
                success: false,
                invalidFields: invalidFields,
              }),
              { status: 400 },
            )
          }

          const fieldData: Record<string, any> = {}

          for (const [, value] of Object.entries(
            body.state.values as Record<string, any>,
          )) {
            const fieldId = Object.keys(value)[0]
            fieldData[fieldId] = value[fieldId]
          }

          const feedback =
            `### ${title} feedback from ${managerName}:\n` +
            `- *If this team member was leaving for a similar role at another company, would you try to keep them?* ${ratingToText(fieldData['keeper-test-question-1']?.selected_option.value)}\n` +
            `- *If yes, what is it specifically that makes them so valuable to your team and PostHog?* ${fieldData['keeper-test-question-1-text']?.value}\n` +
            `- *Are they a driver or a passenger?* ${driverRatingToText(fieldData['keeper-test-question-2']?.selected_option.value)}\n` +
            `- *Do they get things done proactively, today?* ${proactiveRatingToText(fieldData['keeper-test-question-3']?.selected_option.value)}\n` +
            `- *Are they optimistic by default?* ${optimisticRatingToText(fieldData['keeper-test-question-4']?.selected_option.value)}\n` +
            `- *Areas to watch:* ${fieldData['keeper-test-question-4-text']?.value}\n` +
            (['30 Day check-in', '60 Day check-in', '80 Day check-in'].includes(
              title,
            )
              ? `- *Recommendation:* ${fieldData['keeper-test-question-5']?.selected_option.value}\n`
              : '') +
            `- *Have you shared this feedback with your team member?* ${fieldData['keeper-test-question-6']?.selected_option.value}`

          const deelManager = await prisma.deelEmployee.findUnique({
            where: {
              id: managerId,
            },
            select: {
              id: true,
              employee: {
                select: {
                  id: true,
                },
              },
            },
          })

          if (!deelManager?.employee?.id) {
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Manager not found',
              }),
              { status: 400 },
            )
          }

          const createdFeedback = await prisma.keeperTestFeedback.create({
            data: {
              employee: {
                connect: {
                  id: employeeId,
                },
              },
              manager: {
                connect: {
                  id: deelManager.employee.id,
                },
              },
              title: title,
              wouldYouTryToKeepThem: fieldData['keeper-test-question-1']
                ?.selected_option.value as KeeperTestRating,
              whatMakesThemValuable:
                fieldData['keeper-test-question-1-text']?.value,
              driverOrPassenger: fieldData['keeper-test-question-2']
                ?.selected_option.value as KeeperTestRating,
              proactiveToday: fieldData['keeper-test-question-3']
                ?.selected_option.value as KeeperTestRating,
              optimisticByDefault: fieldData['keeper-test-question-4']
                ?.selected_option.value as KeeperTestRating,
              areasToWatch: fieldData['keeper-test-question-4-text']?.value,
              recommendation:
                fieldData['keeper-test-question-5']?.selected_option.value ===
                'Strong Hire, on track to pass probation'
                  ? 'STRONG_HIRE_ON_TRACK_TO_PASS_PROBATION'
                  : fieldData['keeper-test-question-5']?.selected_option
                        .value === 'Average Hire, need to see improvements'
                    ? 'AVERAGE_HIRE_NEED_TO_SEE_IMPROVEMENTS'
                    : fieldData['keeper-test-question-5']?.selected_option
                          .value === 'Not a fit, needs escalating'
                      ? 'NOT_A_FIT_NEEDS_ESCALATING'
                      : null,
              sharedWithTeamMember:
                fieldData['keeper-test-question-6']?.selected_option.value ===
                'yes',
            },
          })

          if (
            [
              '30 Day check-in',
              '60 Day check-in',
              '80 Day check-in',
              'Keeper test',
            ].includes(title)
          ) {
            const getFlag = (
              ratings: KeeperTestRating[],
              recommendation: KeeperTestRecommendation | null,
            ): { flag: string; mention: boolean } => {
              // Flag logic:
              // Red circle + mention: Any STRONG_NO or (NO on 80 Day check-in or Keeper test)
              // Yellow circle: Any NO (on 30/60 day check-ins)
              // Green circle: All responses are YES
              // Star: Any STRONG_YES
              const hasStrongNo =
                ratings.some((rating) => rating === 'STRONG_NO') ||
                recommendation === 'NOT_A_FIT_NEEDS_ESCALATING'
              const hasNo =
                ratings.some((rating) => rating === 'NO') ||
                recommendation === 'AVERAGE_HIRE_NEED_TO_SEE_IMPROVEMENTS'
              const allYes = ratings.every((rating) => rating === 'YES')
              const hasStrongYes = ratings.some(
                (rating) => rating === 'STRONG_YES',
              )

              if (
                hasStrongNo ||
                (hasNo &&
                  (title === '80 Day check-in' || title === 'Keeper test'))
              ) {
                return { flag: ':red_circle:', mention: true }
              } else if (hasNo) {
                return { flag: ':large_yellow_circle:', mention: false }
              } else if (allYes) {
                return { flag: ':large_green_circle:', mention: false }
              } else if (hasStrongYes) {
                return { flag: ':star:', mention: false }
              } else {
                return { flag: ':max-error:', mention: false }
              }
            }

            const ratings = [
              createdFeedback.wouldYouTryToKeepThem,
              createdFeedback.driverOrPassenger,
              createdFeedback.proactiveToday,
              createdFeedback.optimisticByDefault,
            ]

            const { flag, mention } = getFlag(
              ratings,
              createdFeedback.recommendation,
            )

            const res = await fetch('https://slack.com/api/chat.postMessage', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.SLACK_TOKEN}`,
              },
              body: JSON.stringify({
                channel: process.env.SLACK_FEEDBACK_NOTIFICATION_CHANNEL_ID,
                text:
                  `${flag} ${mention ? process.env.SLACK_PERFORMANCE_CHECK_IN_MENTION : ''} ${managerName} has submitted keeper test feedback for ${employeeEmail}\n\nSummary:\n\n` +
                  feedback,
              }),
            })

            const body = await res.json()

            if (res.status !== 200 || !body.ok) {
              return new Response(
                JSON.stringify({
                  success: false,
                  error: `Error from Slack API: ${res.status}: ${JSON.stringify(body)}`,
                }),
                { status: 500 },
              )
            }
          }

          await prisma.cyclotronJob.delete({
            where: { id: jobId },
          })

          await fetch(body.response_url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text:
                `Successfully submitted keeper test feedback for ${employeeEmail}\n\nSummary:\n\n` +
                feedback,
            }),
          })
        } else if (body.actions[0].action_id === 'submit_manager_feedback') {
          const [
            managerEmail,
            employeeId,
            employeeName,
            managerId,
            jobId,
            title,
          ] = body.actions[0].value.split('|')
          for (const [, value] of Object.entries(
            body.state.values as Record<string, any>,
          )) {
            const fieldId = Object.keys(value)[0]
            const { type, selected_option } = value[fieldId]
            if (type === 'radio_buttons' && selected_option === null) {
              invalidFields.push(fieldId)
            } else if (
              type === 'plain_text_input' &&
              value[fieldId].value === null
            ) {
              invalidFields.push(fieldId)
            }
          }

          if (invalidFields.length > 0) {
            await fetch(body.response_url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                thread_ts: body.container.message_ts,
                text:
                  'Please complete all required fields: ' +
                  invalidFields.join(', '),
                response_type: 'in_channel',
                replace_original: false,
              }),
            })

            return new Response(
              JSON.stringify({
                success: false,
                invalidFields: invalidFields,
              }),
              { status: 400 },
            )
          }

          const fieldData: Record<string, any> = {}

          for (const [, value] of Object.entries(
            body.state.values as Record<string, any>,
          )) {
            const fieldId = Object.keys(value)[0]
            fieldData[fieldId] = value[fieldId]
          }

          const feedback =
            `### ${title} feedback from ${employeeName}:\n` +
            `- *Given the above, how would you rate your manager?* ${fieldData['keeper-test-question-1']?.selected_option.value}\n` +
            `- *Why have you given this answer?* ${fieldData['keeper-test-question-2']?.value}`

          const deelManager = await prisma.deelEmployee.findUnique({
            where: {
              id: managerId,
            },
            select: {
              id: true,
              employee: {
                select: {
                  id: true,
                },
              },
            },
          })

          if (!deelManager?.employee?.id) {
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Manager not found',
              }),
              { status: 400 },
            )
          }

          const createdFeedback = await prisma.keeperTestFeedback.create({
            data: {
              employee: {
                connect: {
                  id: deelManager.employee.id,
                },
              },
              manager: {
                connect: {
                  id: employeeId,
                },
              },
              title: title,
              wouldYouTryToKeepThem: fieldData['keeper-test-question-1']
                ?.selected_option.value as KeeperTestRating,
              whatMakesThemValuable: fieldData['keeper-test-question-2']?.value,
              driverOrPassenger: 'STRONG_YES',
              proactiveToday: 'STRONG_YES',
              optimisticByDefault: 'STRONG_YES',
              areasToWatch: '',
              sharedWithTeamMember: true,
            },
          })

          if (['Manager feedback'].includes(title)) {
            // Flag logic:
            // Green: All responses are STRONG_YES
            // Yellow: All responses are YES or STRONG_YES (but at least one is YES)
            // Red: At least one response is NO or STRONG_NO
            const ratings = [createdFeedback.wouldYouTryToKeepThem]

            const hasNegative = ratings.some(
              (rating) => rating === 'NO' || rating === 'STRONG_NO',
            )
            const allStrongYes = ratings.every(
              (rating) => rating === 'STRONG_YES',
            )
            const allPositive = ratings.every(
              (rating) => rating === 'YES' || rating === 'STRONG_YES',
            )

            let flag: string
            if (hasNegative) {
              flag = ':red_circle:'
            } else if (allStrongYes) {
              flag = ':large_green_circle:'
            } else if (allPositive) {
              flag = ':large_yellow_circle:'
            } else {
              flag = ':red_circle:'
            }
            const res = await fetch('https://slack.com/api/chat.postMessage', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.SLACK_TOKEN}`,
              },
              body: JSON.stringify({
                channel: process.env.SLACK_FEEDBACK_NOTIFICATION_CHANNEL_ID,
                text:
                  `${flag} ${employeeName} has submitted manager feedback for ${managerEmail}\n\nSummary:\n\n` +
                  feedback,
              }),
            })

            const body = await res.json()

            if (res.status !== 200 || !body.ok) {
              return new Response(
                JSON.stringify({
                  success: false,
                  error: `Error from Slack API: ${res.status}: ${JSON.stringify(body)}`,
                }),
                { status: 500 },
              )
            }
          }

          await prisma.cyclotronJob.delete({
            where: { id: jobId },
          })

          await fetch(body.response_url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text:
                `Successfully submitted manager feedback for ${managerEmail}\n\nSummary:\n\n` +
                feedback,
            }),
          })
        }

        return new Response(
          JSON.stringify({
            success: true,
          }),
        )
      },
    },
  },
})
