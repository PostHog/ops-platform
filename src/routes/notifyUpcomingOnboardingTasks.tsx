import { createFileRoute } from '@tanstack/react-router'
import prisma from '@/db'

export const Route = createFileRoute('/notifyUpcomingOnboardingTasks')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get('Authorization')?.split(' ')[1]
        if (token !== process.env.SYNC_ENDPOINT_KEY) {
          return new Response('Unauthorized', { status: 401 })
        }

        const notificationEmail = process.env.ONBOARDING_NOTIFICATION_EMAIL
        if (!notificationEmail) {
          return new Response(
            JSON.stringify({ success: false, error: 'ONBOARDING_NOTIFICATION_EMAIL not configured' }),
            { status: 500 },
          )
        }

        // Find incomplete tasks due within the next 7 days (or already overdue)
        const sevenDaysFromNow = new Date()
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

        const tasks = await prisma.onboardingTask.findMany({
          where: {
            completed: false,
            dueDate: { lte: sevenDaysFromNow },
          },
          include: {
            onboardingRecord: true,
          },
          orderBy: { dueDate: 'asc' },
        })

        if (tasks.length === 0) {
          return new Response(JSON.stringify({ success: true, message: 'No upcoming tasks', sent: 0 }))
        }

        // Group tasks by onboarding record
        const byRecord = new Map<string, { record: typeof tasks[0]['onboardingRecord']; tasks: typeof tasks }>()
        for (const task of tasks) {
          const existing = byRecord.get(task.onboardingRecordId)
          if (existing) {
            existing.tasks.push(task)
          } else {
            byRecord.set(task.onboardingRecordId, {
              record: task.onboardingRecord,
              tasks: [task],
            })
          }
        }

        // Look up Carol's Slack user ID
        const userRes = await fetch(
          `https://slack.com/api/users.lookupByEmail?email=${notificationEmail}`,
          {
            method: 'GET',
            headers: { Authorization: `Bearer ${process.env.SLACK_TOKEN}` },
          },
        )
        const userBody = await userRes.json()

        if (userRes.status !== 200 || !userBody.ok) {
          console.error(`Error looking up Slack user for ${notificationEmail}:`, JSON.stringify(userBody))
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to look up Slack user' }),
            { status: 500 },
          )
        }

        const slackUserId = userBody.user.id
        const now = new Date()

        // Build Block Kit message — one section per hire
        const blocks: any[] = [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:clipboard: *Onboarding Task Digest* — ${tasks.length} upcoming/overdue task${tasks.length === 1 ? '' : 's'}`,
            },
          },
          { type: 'divider' },
        ]

        for (const [, { record, tasks: recordTasks }] of byRecord) {
          const startDateStr = record.startDate
            ? new Date(record.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
            : 'No start date'

          const taskLines = recordTasks.map((t) => {
            const dueDate = new Date(t.dueDate)
            const dueDateStr = dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
            const overdue = dueDate < now
            const prefix = overdue ? ':red_circle:' : ':large_yellow_circle:'
            return `${prefix} ${t.description} _(due ${dueDateStr})_`
          })

          blocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${record.name}* — ${record.role}, ${record.team} (starts ${startDateStr})\n${taskLines.join('\n')}`,
            },
          })
        }

        blocks.push(
          { type: 'divider' },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'View Onboarding Dashboard', emoji: true },
                url: `${process.env.VITE_APP_BETTER_AUTH_URL}/onboarding`,
                action_id: 'view_onboarding',
              },
            ],
          },
        )

        // Send the digest DM
        const msgRes = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.SLACK_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channel: slackUserId,
            blocks,
            text: `You have ${tasks.length} upcoming onboarding tasks`, // fallback
          }),
        })

        const msgBody = await msgRes.json()

        if (msgRes.status !== 200 || !msgBody.ok) {
          console.error('Error sending Slack digest:', JSON.stringify(msgBody))
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to send Slack message' }),
            { status: 500 },
          )
        }

        // Update lastNotificationSentAt for all notified tasks
        await prisma.onboardingTask.updateMany({
          where: { id: { in: tasks.map((t) => t.id) } },
          data: { lastNotificationSentAt: new Date() },
        })

        return new Response(
          JSON.stringify({
            success: true,
            sent: 1,
            tasksNotified: tasks.length,
            hiresIncluded: byRecord.size,
          }),
        )
      },
    },
  },
})
