import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('runScheduledJobs route server functions', () => {
  const filePath = path.join(process.cwd(), 'src/routes/runScheduledJobs.tsx')
  const content = fs.readFileSync(filePath, 'utf-8')

  it('uses createFileRoute (not createAdminFn) since this is a raw POST handler', () => {
    expect(content).toMatch(
      /import.*createFileRoute.*from.*@tanstack\/react-router/,
    )
    // This route does NOT use createAdminFn — it authenticates via Authorization header
    expect(content).not.toMatch(/import.*createAdminFn.*from/)
  })

  it('defines a POST handler on the server object', () => {
    expect(content).toMatch(/server:\s*\{/)
    expect(content).toMatch(/handlers:\s*\{/)
    expect(content).toMatch(/POST:\s*async/)
  })

  it('authenticates via Authorization bearer token against SYNC_ENDPOINT_KEY', () => {
    expect(content).toMatch(/Authorization/)
    expect(content).toMatch(/SYNC_ENDPOINT_KEY/)
    expect(content).toMatch(/status:\s*401/)
  })

  it('uses CyclotronJob prisma model with raw SQL for job locking', () => {
    expect(content).toMatch(/import.*CyclotronJob.*from.*@prisma\/client/)
    expect(content).toMatch(/prisma\.\$queryRaw/)
    expect(content).toMatch(/FOR UPDATE SKIP LOCKED/)
  })

  it('handles send_keeper_test queue', () => {
    expect(content).toMatch(/send_keeper_test/)
    expect(content).toMatch(/getSlackMessageBody/)
  })

  it('handles send_manager_feedback queue', () => {
    expect(content).toMatch(/send_manager_feedback/)
    expect(content).toMatch(/getManagerFeedbackSlackMessageBody/)
  })

  it('handles receive_keeper_test_results queue for reminders', () => {
    expect(content).toMatch(/receive_keeper_test_results/)
  })

  it('handles receive_manager_feedback_results queue for reminders', () => {
    expect(content).toMatch(/receive_manager_feedback_results/)
  })

  it('uses Slack API for user lookup and message posting', () => {
    expect(content).toMatch(/slack\.com\/api\/users\.lookupByEmail/)
    expect(content).toMatch(/slack\.com\/api\/chat\.postMessage/)
    expect(content).toMatch(/SLACK_TOKEN/)
  })

  it('checks deelEmployee existence before sending reminders', () => {
    expect(content).toMatch(/prisma\.deelEmployee\.findFirst/)
    // Cancelled if employee not found
    expect(content).toMatch(/state:\s*'cancelled'/)
  })

  it('tracks overdue notifications and posts them to a feedback channel', () => {
    expect(content).toMatch(/overdueNotifications/)
    expect(content).toMatch(/SLACK_FEEDBACK_NOTIFICATION_CHANNEL_ID/)
    expect(content).toMatch(/daysSinceCreation\s*>=\s*3/)
  })

  it('consolidates overdue notifications into a thread when more than 3', () => {
    expect(content).toMatch(/overdueNotifications\.length\s*<=\s*3/)
    expect(content).toMatch(/thread_ts/)
  })

  it('has a failure count threshold for dead-lettering failed jobs', () => {
    expect(content).toMatch(/FAILURE_COUNT_THRESHOLD\s*=\s*5/)
    expect(content).toMatch(/dead_letter/)
  })

  it('updates CyclotronJob state after processing via prisma', () => {
    expect(content).toMatch(/prisma\.cyclotronJob\.update/)
    expect(content).toMatch(/state:\s*'available'/)
    expect(content).toMatch(/lock_id:\s*null/)
  })

  it('exports KeeperTestJobPayload and JobResult types', () => {
    expect(content).toMatch(/export type KeeperTestJobPayload/)
    expect(content).toMatch(/export type JobResult/)
  })
})
