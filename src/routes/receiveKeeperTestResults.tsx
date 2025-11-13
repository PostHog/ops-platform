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
            `- **If this team member was leaving for a similar role at another company, would you try to keep them?** ${fieldData['keeper-test-question-1']?.selected_option.value}\n` +
            `- **If yes, what is it specifically that makes them so valuable to your team and PostHog?** ${fieldData['keeper-test-question-1-text']?.value}\n` +
            `- **Are they a driver or a passenger?** ${fieldData['keeper-test-question-2']?.selected_option.value}\n` +
            `- **Do they get things done proactively, today?** ${fieldData['keeper-test-question-3']?.selected_option.value}\n` +
            `- **Are they optimistic by default?** ${fieldData['keeper-test-question-4']?.selected_option.value}\n` +
            `- **Areas to watch:** ${fieldData['keeper-test-question-4-text']?.value}\n` +
            (['30 Day check-in', '60 Day check-in', '80 Day check-in'].includes(
              title,
            )
              ? `- **Recommendation**: ${fieldData['keeper-test-question-5']?.selected_option.value}\n`
              : '') +
            `- **Have you shared this feedback with your team member?** ${fieldData['keeper-test-question-6']?.selected_option.value}`

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

          await prisma.keeperTestFeedback.create({
            data: {
              employeeId: employeeId,
              managerId: managerId,
              title: title,
              wouldYouTryToKeepThem:
                fieldData['keeper-test-question-1']?.selected_option.value,
              whatMakesThemValuable:
                fieldData['keeper-test-question-1-text']?.value,
              driverOrPassenger:
                fieldData['keeper-test-question-2']?.selected_option.value ===
                'Driver'
                  ? 'DRIVER'
                  : 'PASSENGER',
              proactiveToday:
                fieldData['keeper-test-question-3']?.selected_option.value ===
                'Yes'
                  ? true
                  : false,
              optimisticByDefault:
                fieldData['keeper-test-question-4']?.selected_option.value ===
                'Yes'
                  ? true
                  : false,
              areasToWatch: fieldData['keeper-test-question-4-text']?.value,
              recommendation:
                fieldData['keeper-test-question-5']?.selected_option.value ===
                'Strong Hire, on track to pass probation'
                  ? 'STRONG_HIRE_ON_TRACK_TO_PASS_PROBATION'
                  : fieldData['keeper-test-question-5']?.selected_option
                        .value === 'Average Hire, need to see improvements'
                    ? 'AVERAGE_HIRE_NEED_TO_SEE_IMPROVEMENTS'
                    : 'NOT_A_FIT_NEEDS_ESCALATING',
              sharedWithTeamMember:
                fieldData['keeper-test-question-6']?.selected_option.value ===
                'Yes'
                  ? true
                  : false,
            },
          })

          await prisma.cyclotronJob.delete({
            where: { id: jobId },
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
