import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('missingCommissions route server functions', () => {
  const filePath = path.join(process.cwd(), 'src/routes/missingCommissions.tsx')
  const content = fs.readFileSync(filePath, 'utf-8')

  it('imports createAdminFn from auth-middleware', () => {
    expect(content).toMatch(/import\s*\{[^}]*createAdminFn[^}]*\}\s*from\s*['"]@\/lib\/auth-middleware['"]/)
  })

  it('defines getEmployeesWithMissingCommissions as a GET server function', () => {
    expect(content).toMatch(/const\s+getEmployeesWithMissingCommissions\s*=\s*createAdminFn\(\{/)
    expect(content).toMatch(/getEmployeesWithMissingCommissions\s*=\s*createAdminFn\(\{\s*method:\s*['"]GET['"]/)
  })

  it('queries prisma.employee.findMany with salary and commission includes', () => {
    expect(content).toMatch(/prisma\.employee\.findMany/)
    expect(content).toMatch(/salaries:\s*\{/)
    expect(content).toMatch(/commissionBonuses:\s*true/)
    expect(content).toMatch(/deelEmployee:\s*true/)
  })

  it('imports commission calculator utilities', () => {
    expect(content).toMatch(/import\s*\{[^}]*getPreviousQuarter[^}]*\}\s*from\s*['"]@\/lib\/commission-calculator['"]/)
    expect(content).toMatch(/import\s*\{[^}]*calculateQuarterBreakdown[^}]*\}\s*from\s*['"]@\/lib\/commission-calculator['"]/)
  })

  it('computes commission eligibility cutoff date', () => {
    expect(content).toMatch(/function\s+getCommissionEligibilityCutoff/)
    expect(content).toMatch(/lastMonthOfQuarter/)
  })

  it('filters employees by bonusAmount > 0', () => {
    expect(content).toMatch(/latestSalary\.bonusAmount\s*<=\s*0/)
  })

  it('checks whether employee has commission for the selected quarter', () => {
    expect(content).toMatch(/hasCommissionForQuarter/)
    expect(content).toMatch(/cb\.quarter\s*===\s*quarter/)
  })

  it('creates the route at /missingCommissions', () => {
    expect(content).toMatch(/createFileRoute\(['"]\/missingCommissions['"]\)/)
  })
})
