import { createFileRoute } from '@tanstack/react-router'
import prisma from '@/db'

export const Route = createFileRoute('/receiveKeeperTestResults')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = new URL(request.url).searchParams.get('token')
        if (token !== process.env.SYNC_ENDPOINT_KEY) {
          return new Response('Unauthorized' + token, { status: 401 })
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
            `- *If this team member was leaving for a similar role at another company, would you try to keep them?* ${fieldData['keeper-test-question-1']?.selected_option.value}\n` +
            `- *If yes, what is it specifically that makes them so valuable to your team and PostHog?* ${fieldData['keeper-test-question-1-text']?.value}\n` +
            `- *Are they a driver or a passenger?* ${fieldData['keeper-test-question-2']?.selected_option.value}\n` +
            `- *Do they get things done proactively, today?* ${fieldData['keeper-test-question-3']?.selected_option.value}\n` +
            `- *Are they optimistic by default?* ${fieldData['keeper-test-question-4']?.selected_option.value}\n` +
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
              employeeId: employeeId,
              managerId: deelManager?.employee?.id,
              title: title,
              wouldYouTryToKeepThem:
                fieldData['keeper-test-question-1']?.selected_option.value ===
                'yes',
              whatMakesThemValuable:
                fieldData['keeper-test-question-1-text']?.value,
              driverOrPassenger:
                fieldData['keeper-test-question-2']?.selected_option.value ===
                'driver'
                  ? 'DRIVER'
                  : 'PASSENGER',
              proactiveToday:
                fieldData['keeper-test-question-3']?.selected_option.value ===
                'yes',
              optimisticByDefault:
                fieldData['keeper-test-question-4']?.selected_option.value ===
                'yes',
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

          await prisma.cyclotronJob.delete({
            where: { id: jobId },
          })

          if (
            ['30 Day check-in', '60 Day check-in', '80 Day check-in'].includes(
              title,
            )
          ) {
            const flag =
              createdFeedback.driverOrPassenger === 'DRIVER' &&
              createdFeedback.proactiveToday &&
              createdFeedback.optimisticByDefault &&
              createdFeedback.wouldYouTryToKeepThem &&
              createdFeedback.recommendation ===
                'STRONG_HIRE_ON_TRACK_TO_PASS_PROBATION'
                ? ':large_green_circle:'
                : ':red_circle:'
            const res = await fetch('https://slack.com/api/chat.postMessage', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.SLACK_TOKEN}`,
              },
              body: JSON.stringify({
                channel: 'C09D5B4AYG3',
                text:
                  `${flag} ${managerName} has submitted keeper test feedback for ${employeeEmail}\n\nSummary:\n\n` +
                  feedback,
              }),
            })

            const body = await res.json()

            if (res.status !== 200) {
              return new Response(
                JSON.stringify({
                  success: false,
                  error: `Error from Slack API: ${res.status}: ${JSON.stringify(body)}`,
                }),
                { status: 500 },
              )
            }
          }

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
