import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('syncAshbyInterviewScores route server functions', () => {
  const filePath = path.join(process.cwd(), 'src/routes/syncAshbyInterviewScores.tsx')
  const content = fs.readFileSync(filePath, 'utf-8')

  it('uses server handler pattern with POST method', () => {
    expect(content).toMatch(/server:\s*\{[\s\S]*?handlers:\s*\{[\s\S]*?POST:/)
  })

  it('authenticates via Authorization bearer token against SYNC_ENDPOINT_KEY', () => {
    expect(content).toMatch(/request\.headers\.get\(['"]Authorization['"]\)/)
    expect(content).toMatch(/process\.env\.SYNC_ENDPOINT_KEY/)
  })

  it('queries prisma.employee.findMany for employees not yet imported', () => {
    expect(content).toMatch(/prisma\.employee\.findMany/)
    expect(content).toMatch(/ashbyInterviewScoresImported:\s*false/)
  })

  it('calls Ashby candidate.search API', () => {
    expect(content).toMatch(/https:\/\/api\.ashbyhq\.com\/candidate\.search/)
  })

  it('calls Ashby applicationFeedback.list API', () => {
    expect(content).toMatch(/https:\/\/api\.ashbyhq\.com\/applicationFeedback\.list/)
  })

  it('calls Ashby interview.info API', () => {
    expect(content).toMatch(/https:\/\/api\.ashbyhq\.com\/interview\.info/)
  })

  it('creates ashbyInterviewScore records via prisma', () => {
    expect(content).toMatch(/prisma\.ashbyInterviewScore\.create/)
  })

  it('validates rating is between 1 and 4', () => {
    expect(content).toMatch(/rating\s*<\s*1\s*\|\|\s*rating\s*>\s*4/)
  })

  it('marks employee as imported after processing', () => {
    expect(content).toMatch(/prisma\.employee\.update/)
    expect(content).toMatch(/ashbyInterviewScoresImported:\s*true/)
  })
})
