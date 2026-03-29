import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('salary-sync-status route server functions', () => {
  const filePath = path.join(process.cwd(), 'src/routes/salary-sync-status.tsx')
  const content = fs.readFileSync(filePath, 'utf-8')

  it('imports createAdminFn from auth-middleware', () => {
    expect(content).toMatch(/import\s*\{[^}]*createAdminFn[^}]*\}\s*from\s*['"]@\/lib\/auth-middleware['"]/)
  })

  it('defines getSalarySyncStatus as a GET server function', () => {
    expect(content).toMatch(/const\s+getSalarySyncStatus\s*=\s*createAdminFn\(\{/)
    expect(content).toMatch(/getSalarySyncStatus\s*=\s*createAdminFn\(\{\s*method:\s*['"]GET['"]/)
  })

  it('queries prisma.employee.findMany with salaries and deelEmployee included', () => {
    expect(content).toMatch(/prisma\.employee\.findMany/)
    expect(content).toMatch(/include:\s*\{[\s\S]*?salaries:/)
    expect(content).toMatch(/deelEmployee:\s*true/)
  })

  it('takes only the most recent salary record', () => {
    expect(content).toMatch(/salaries:\s*\{[\s\S]*?orderBy:\s*\{[\s\S]*?timestamp:\s*['"]desc['"]/)
    expect(content).toMatch(/take:\s*1/)
  })

  it('filters to employees with at least one salary and who have started', () => {
    expect(content).toMatch(/salaries:\s*\{\s*some:\s*\{\}\s*\}/)
    expect(content).toMatch(/startDate:\s*\{\s*lte:\s*new\s+Date\(\)/)
  })

  it('creates the route at /salary-sync-status path', () => {
    expect(content).toMatch(/createFileRoute\(['"]\/salary-sync-status['"]\)/)
  })

  it('tracks salary deviation status with IN_SYNC, DEVIATED, and N/A filter options', () => {
    expect(content).toMatch(/salaryDeviationStatus/)
    expect(content).toMatch(/IN_SYNC/)
    expect(content).toMatch(/DEVIATED/)
  })

  it('uses salaryDeviationCheckedAt for staleness detection', () => {
    expect(content).toMatch(/salaryDeviationCheckedAt/)
    expect(content).toMatch(/out of date/)
  })

  it('imports formatCurrency and getFullName utility functions', () => {
    expect(content).toMatch(/import\s*\{[^}]*formatCurrency[^}]*\}\s*from\s*['"]@\/lib\/utils['"]/)
    expect(content).toMatch(/import\s*\{[^}]*getFullName[^}]*\}\s*from\s*['"]@\/lib\/utils['"]/)
  })

  it('uses dayjs with relativeTime plugin for timestamp display', () => {
    expect(content).toMatch(/import\s+dayjs\s+from\s*['"]dayjs['"]/)
    expect(content).toMatch(/import\s+relativeTime\s+from\s*['"]dayjs\/plugin\/relativeTime['"]/)
    expect(content).toMatch(/dayjs\.extend\(relativeTime\)/)
  })
})
