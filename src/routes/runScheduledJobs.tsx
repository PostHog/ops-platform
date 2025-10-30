import { createFileRoute } from '@tanstack/react-router'
import type { CyclotronJob } from '@prisma/client'
import prisma from '@/db'

export type KeeperTestJobPayload = {
  employee: {
    id: string
    email: string
    name: string
  }
  manager: {
    id: string
    email: string
    name: string
  }
}

export type JobResult = {
  id: string
  success: boolean
  data?: Record<string, any>
}

export const Route = createFileRoute('/runScheduledJobs')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get('Authorization')?.split(' ')[1]
        if (token !== process.env.SYNC_ENDPOINT_KEY) {
          return new Response('Unauthorized' + token, { status: 401 })
        }

        const getSlackMessageBody = (
          email: string,
          employeeId: string,
          managerName: string,
          jobId: string,
        ) => ({
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `Hey! It's Keeper Test Time! Please submit feedback for ${email}. If you get stuck or aren't familiar, check out <https://posthog.com/handbook/company/management#the-keeper-test|this> section of the Handbook.`,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: 'If this team member was leaving for a similar role at another company, would you try to keep them?',
              },
              accessory: {
                type: 'radio_buttons',
                options: [
                  {
                    text: {
                      type: 'plain_text',
                      text: 'Yes',
                      emoji: true,
                    },
                    value: 'yes',
                  },
                  {
                    text: {
                      type: 'plain_text',
                      text: 'No',
                      emoji: true,
                    },
                    value: 'no',
                  },
                ],
                action_id: 'keeper-test-question-1',
              },
            },
            {
              type: 'input',
              element: {
                type: 'plain_text_input',
                action_id: 'keeper-test-question-1-text',
              },
              label: {
                type: 'plain_text',
                text: 'If yes, what is it specifically that makes them so valuable to your team and PostHog?',
                emoji: true,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: 'Are they a driver or a passenger?',
              },
              accessory: {
                type: 'radio_buttons',
                options: [
                  {
                    text: {
                      type: 'plain_text',
                      text: 'Driver',
                      emoji: true,
                    },
                    value: 'driver',
                  },
                  {
                    text: {
                      type: 'plain_text',
                      text: 'Passenger',
                      emoji: true,
                    },
                    value: 'passenger',
                  },
                ],
                action_id: 'keeper-test-question-2',
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: 'Do they get things done proactively, today?',
              },
              accessory: {
                type: 'radio_buttons',
                options: [
                  {
                    text: {
                      type: 'plain_text',
                      text: 'Yes',
                      emoji: true,
                    },
                    value: 'yes',
                  },
                  {
                    text: {
                      type: 'plain_text',
                      text: 'No',
                      emoji: true,
                    },
                    value: 'no',
                  },
                ],
                action_id: 'keeper-test-question-3',
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: 'Are they optimistic by default?',
              },
              accessory: {
                type: 'radio_buttons',
                options: [
                  {
                    text: {
                      type: 'plain_text',
                      text: 'Yes',
                      emoji: true,
                    },
                    value: 'yes',
                  },
                  {
                    text: {
                      type: 'plain_text',
                      text: 'No',
                      emoji: true,
                    },
                    value: 'no',
                  },
                ],
                action_id: 'keeper-test-question-4',
              },
            },
            {
              type: 'input',
              element: {
                type: 'plain_text_input',
                action_id: 'keeper-test-question-4-text',
              },
              label: {
                type: 'plain_text',
                text: 'Areas to watch',
                emoji: true,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: 'Have you shared this feedback with your team member?',
              },
              accessory: {
                type: 'radio_buttons',
                options: [
                  {
                    text: {
                      type: 'plain_text',
                      text: 'Yes',
                      emoji: true,
                    },
                    value: 'yes',
                  },
                  {
                    text: {
                      type: 'plain_text',
                      text: 'No, but I will do right now!',
                      emoji: true,
                    },
                    value: 'no',
                  },
                ],
                action_id: 'keeper-test-question-5',
              },
            },
            {
              type: 'actions',
              block_id: 'submit_block',
              elements: [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: 'Submit',
                    emoji: true,
                  },
                  action_id: 'submit_keeper_test',
                  value: `${email}|${employeeId}|${managerName}|${jobId}`,
                },
              ],
            },
          ],
        })

        const lock_id = crypto.randomUUID()

        const jobs = await prisma.$queryRaw<Array<CyclotronJob>>`
                    WITH available AS (
                        SELECT id
                        FROM "CyclotronJob"
                        WHERE 
                            state = 'available'::"CyclotronJobState"
                            AND scheduled <= NOW()
                        ORDER BY scheduled ASC
                        LIMIT 100
                        FOR UPDATE SKIP LOCKED
                    )
                    UPDATE "CyclotronJob"
                    SET 
                        state = 'running'::"CyclotronJobState",
                        lock_id = ${lock_id},
                        last_heartbeat = NOW()
                    FROM available
                    WHERE "CyclotronJob".id = available.id
                    RETURNING 
                        "CyclotronJob".id,
                        created,
                        scheduled,
                        queue_name,
                        lock_id,
                        state,
                        last_heartbeat,
                        data,
                        failure_count
                `

        const jobResults: Array<JobResult> = []

        await Promise.allSettled(
          jobs.map(async (job) => {
            try {
              if (job.queue_name === 'send_keeper_test') {
                const { employee, manager } = JSON.parse(
                  job.data as string,
                ) as KeeperTestJobPayload

                const userRes = await fetch(
                  `https://slack.com/api/users.lookupByEmail?email=${manager.email}`,
                  {
                    method: 'GET',
                    headers: {
                      Authorization: `Bearer ${process.env.SLACK_TOKEN}`,
                    },
                  },
                )

                const userBody = await userRes.json()
                // @ts-ignore
                const slackUserId = userBody.user.id

                await fetch('https://slack.com/api/chat.postMessage', {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${process.env.SLACK_TOKEN}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    // channel: slackUserId,
                    channel: 'U05LD9R5P6E',
                    blocks: getSlackMessageBody(
                      employee.email,
                      employee.id,
                      manager.name,
                      job.id,
                    ).blocks,
                  }),
                })

                jobResults.push({
                  id: job.id,
                  success: true,
                  data: {
                    queue_name: 'receive_keeper_test_results',
                  },
                })
              } else if (job.queue_name === 'receive_keeper_test_results') {
                // TODO: remind people to fill out the keeper test form

                jobResults.push({
                  id: job.id,
                  success: true,
                })
              }
            } catch (error) {
              console.error(error)
              jobResults.push({
                id: job.id,
                success: false,
                data: {
                  failure_count: job.failure_count + 1,
                },
              })
            }
          }),
        )

        await Promise.all(
          jobResults.map(async ({ id, success, data }) => {
            if (success) {
              await prisma.cyclotronJob.update({
                where: { id, lock_id },
                data: {
                  ...data,
                  state: 'available',
                  lock_id: null,
                  last_heartbeat: new Date(),
                },
              })
            } else {
              const isDead = data?.failure_count && data.failure_count >= 5
              await prisma.cyclotronJob.update({
                where: { id, lock_id },
                data: {
                  ...data,
                  state: 'available',
                  lock_id: null,
                  last_heartbeat: new Date(),
                  ...(isDead
                    ? { state: 'failed', queue_name: 'dead_letter' }
                    : {}),
                },
              })
            }
          }),
        )

        return new Response(
          JSON.stringify({
            success: true,
            results: jobResults,
          }),
        )
      },
    },
  },
})
