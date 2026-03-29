import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('scheduleCheckIns route server functions', () => {
  const filePath = path.join(process.cwd(), 'src/routes/scheduleCheckIns.tsx')
  const content = fs.readFileSync(filePath, 'utf-8')

  it('uses server handler pattern with POST method', () => {
    expect(content).toMatch(/server:\s*\{[\s\S]*?handlers:\s*\{[\s\S]*?POST:/)
  })

  it('authenticates via Authorization bearer token against SYNC_ENDPOINT_KEY', () => {
    expect(content).toMatch(/request\.headers\.get\(['"]Authorization['"]\)/)
    expect(content).toMatch(/process\.env\.SYNC_ENDPOINT_KEY/)
  })

  it('queries employees for 30, 60, and 80 day check-ins', () => {
    expect(content).toMatch(/checkIn30DaysScheduled:\s*false/)
    expect(content).toMatch(/checkIn60DaysScheduled:\s*false/)
    expect(content).toMatch(/checkIn80DaysScheduled:\s*false/)
  })

  it('excludes Blitzscale team from check-ins', () => {
    expect(content).toMatch(/team:\s*\{[\s\S]*?not:\s*['"]Blitzscale['"]/)
  })

  it('creates cyclotronJob records for the send_keeper_test queue', () => {
    expect(content).toMatch(/prisma\.cyclotronJob\.createMany/)
    expect(content).toMatch(/queue_name:\s*['"]send_keeper_test['"]/)
  })

  it('imports KeeperTestJobPayload type from runScheduledJobs', () => {
    expect(content).toMatch(
      /import\s*\{[^}]*KeeperTestJobPayload[^}]*\}\s*from\s*['"]\.\/runScheduledJobs['"]/,
    )
  })

  it('marks employees as scheduled after creating jobs', () => {
    expect(content).toMatch(/prisma\.employee\.updateMany/)
    expect(content).toMatch(/checkIn30DaysScheduled:\s*true/)
    expect(content).toMatch(/checkIn60DaysScheduled:\s*true/)
    expect(content).toMatch(/checkIn80DaysScheduled:\s*true/)
  })
})
