import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('syncDeelEmployees route server functions', () => {
  const filePath = path.join(process.cwd(), 'src/routes/syncDeelEmployees.tsx')
  const content = fs.readFileSync(filePath, 'utf-8')

  it('uses server handler pattern with POST method', () => {
    expect(content).toMatch(/server:\s*\{[\s\S]*?handlers:\s*\{[\s\S]*?POST:/)
  })

  it('authenticates via Authorization bearer token against SYNC_ENDPOINT_KEY', () => {
    expect(content).toMatch(/request\.headers\.get\(['"]Authorization['"]\)/)
    expect(content).toMatch(/process\.env\.SYNC_ENDPOINT_KEY/)
  })

  it('calls Deel SCIM API to fetch users', () => {
    expect(content).toMatch(/https:\/\/api\.letsdeel\.com\/scim\/v2\/Users/)
    expect(content).toMatch(/process\.env\.DEEL_API_KEY/)
  })

  it('calls Deel REST API to fetch individual employees', () => {
    expect(content).toMatch(/https:\/\/api\.letsdeel\.com\/rest\/v2\/people/)
  })

  it('filters to active full-time employees only', () => {
    expect(content).toMatch(/employee\.active/)
    expect(content).toMatch(/full_time_headcount.*Full-Time/)
  })

  it('creates employee records via prisma.employee.createMany with skipDuplicates', () => {
    expect(content).toMatch(/prisma\.employee\.createMany/)
    expect(content).toMatch(/skipDuplicates:\s*true/)
  })

  it('replaces all deel employees via deleteMany then createMany', () => {
    expect(content).toMatch(/prisma\.deelEmployee\.deleteMany/)
    expect(content).toMatch(/prisma\.deelEmployee\.createMany/)
  })

  it('resolves top-level manager via recursive getManager function', () => {
    expect(content).toMatch(/const\s+getManager\s*=/)
    expect(content).toMatch(/getManager\(employee\.managerId\)/)
    expect(content).toMatch(/topLevelManagerId/)
  })
})
