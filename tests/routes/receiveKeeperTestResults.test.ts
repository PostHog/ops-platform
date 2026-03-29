import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('receiveKeeperTestResults route', () => {
  const filePath = path.join(
    process.cwd(),
    'src/routes/receiveKeeperTestResults.tsx',
  )
  const content = fs.readFileSync(filePath, 'utf-8')

  it('uses raw server handlers instead of createAdminFn (webhook endpoint)', () => {
    // This route uses TanStack Start server handlers directly, not createAdminFn
    expect(content).toMatch(/server:\s*\{/)
    expect(content).toMatch(/handlers:\s*\{/)
    expect(content).toMatch(/POST:\s*async/)
  })

  it('validates requests via SYNC_ENDPOINT_KEY token', () => {
    expect(content).toMatch(/process\.env\.SYNC_ENDPOINT_KEY/)
    expect(content).toMatch(/Unauthorized/)
    expect(content).toMatch(/status:\s*401/)
  })

  it('parses Slack interactive payload from formData', () => {
    expect(content).toMatch(/request\.formData\(\)/)
    expect(content).toMatch(/formData\.get\(['"]payload['"]\)/)
    expect(content).toMatch(/JSON\.parse\(payloadString/)
  })

  it('handles submit_keeper_test action', () => {
    expect(content).toMatch(/action_id\s*===\s*['"]submit_keeper_test['"]/)
  })

  it('handles submit_manager_feedback action', () => {
    expect(content).toMatch(/action_id\s*===\s*['"]submit_manager_feedback['"]/)
  })

  it('creates keeperTestFeedback records in prisma', () => {
    expect(content).toMatch(/prisma\.keeperTestFeedback\.create/)
  })

  it('looks up manager via prisma.deelEmployee.findUnique', () => {
    expect(content).toMatch(/prisma\.deelEmployee\.findUnique/)
  })

  it('deletes cyclotronJob after successful processing', () => {
    expect(content).toMatch(/prisma\.cyclotronJob\.delete/)
  })

  it('posts notification to Slack via chat.postMessage API', () => {
    expect(content).toMatch(/https:\/\/slack\.com\/api\/chat\.postMessage/)
    expect(content).toMatch(/process\.env\.SLACK_TOKEN/)
    expect(content).toMatch(
      /process\.env\.SLACK_FEEDBACK_NOTIFICATION_CHANNEL_ID/,
    )
  })

  it('implements flag logic with red/yellow/green/star indicators', () => {
    expect(content).toMatch(/:red_circle:/)
    expect(content).toMatch(/:large_yellow_circle:/)
    expect(content).toMatch(/:large_green_circle:/)
    expect(content).toMatch(/:star:/)
  })

  it('validates required fields and reports invalid fields back via response_url', () => {
    expect(content).toMatch(/invalidFields/)
    expect(content).toMatch(/response_url/)
    expect(content).toMatch(/Please complete all required fields/)
  })

  it('maps recommendation strings to enum values', () => {
    expect(content).toMatch(/STRONG_HIRE_ON_TRACK_TO_PASS_PROBATION/)
    expect(content).toMatch(/AVERAGE_HIRE_NEED_TO_SEE_IMPROVEMENTS/)
    expect(content).toMatch(/NOT_A_FIT_NEEDS_ESCALATING/)
  })
})
