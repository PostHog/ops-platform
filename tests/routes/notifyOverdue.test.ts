import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('notifyOverduePerformanceProgramChecklistItems route server functions', () => {
  const filePath = path.join(process.cwd(), 'src/routes/notifyOverduePerformanceProgramChecklistItems.tsx')
  const content = fs.readFileSync(filePath, 'utf-8')

  it('uses server handler pattern with POST method', () => {
    expect(content).toMatch(/server:\s*\{[\s\S]*?handlers:\s*\{[\s\S]*?POST:/)
  })

  it('authenticates via Authorization bearer token against SYNC_ENDPOINT_KEY', () => {
    expect(content).toMatch(/request\.headers\.get\(['"]Authorization['"]\)/)
    expect(content).toMatch(/process\.env\.SYNC_ENDPOINT_KEY/)
  })

  it('queries prisma.performanceProgramChecklistItem.findMany for overdue items', () => {
    expect(content).toMatch(/prisma\.performanceProgramChecklistItem\.findMany/)
    expect(content).toMatch(/completed:\s*false/)
    expect(content).toMatch(/dueDate:\s*\{\s*lt:\s*new\s+Date\(\)/)
  })

  it('uses Slack API to look up users by email', () => {
    expect(content).toMatch(/https:\/\/slack\.com\/api\/users\.lookupByEmail/)
    expect(content).toMatch(/process\.env\.SLACK_TOKEN/)
  })

  it('sends Slack messages via chat.postMessage', () => {
    expect(content).toMatch(/https:\/\/slack\.com\/api\/chat\.postMessage/)
  })

  it('supports threaded Slack reminders using thread_ts', () => {
    expect(content).toMatch(/thread_ts:\s*item\.slackThreadId/)
  })

  it('updates checklist items with lastNotificationSentAt and slackThreadId', () => {
    expect(content).toMatch(/prisma\.performanceProgramChecklistItem\.update/)
    expect(content).toMatch(/lastNotificationSentAt:\s*new\s+Date\(\)/)
    expect(content).toMatch(/slackThreadId:\s*messageResponse\.ts/)
  })

  it('tracks results with initial, reminders, skipped, and errors counts', () => {
    expect(content).toMatch(/initial:\s*0/)
    expect(content).toMatch(/reminders:\s*0/)
    expect(content).toMatch(/skipped:\s*0/)
    expect(content).toMatch(/errors:\s*0/)
  })
})
