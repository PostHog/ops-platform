import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('equity-vesting-audit route server functions', () => {
  const filePath = path.join(
    process.cwd(),
    'src/routes/equity-vesting-audit.tsx',
  )
  const content = fs.readFileSync(filePath, 'utf-8')

  it('imports createAdminFn from auth-middleware', () => {
    expect(content).toMatch(
      /import\s*\{[^}]*createAdminFn[^}]*\}\s*from\s*['"]@\/lib\/auth-middleware['"]/,
    )
  })

  it('defines getEmployeesWithGrants as a GET server function', () => {
    expect(content).toMatch(
      /const\s+getEmployeesWithGrants\s*=\s*createAdminFn\(\{/,
    )
    expect(content).toMatch(
      /getEmployeesWithGrants\s*=\s*createAdminFn\(\{\s*method:\s*['"]GET['"]/,
    )
  })

  it('queries prisma.employee.findMany with cartaOptionGrants', () => {
    expect(content).toMatch(/prisma\.employee\.findMany/)
    expect(content).toMatch(/cartaOptionGrants:\s*\{/)
  })

  it('includes cartaOptionGrants relation in the query', () => {
    expect(content).toMatch(/include:\s*\{[\s\S]*?cartaOptionGrants:\s*true/)
  })

  it('imports and uses calculateVestedQuantity from vesting lib', () => {
    expect(content).toMatch(
      /import\s*\{[^}]*calculateVestedQuantity[^}]*\}\s*from\s*['"]@\/lib\/vesting['"]/,
    )
    expect(content).toMatch(/calculateVestedQuantity\(grant\)/)
  })

  it('computes MATCH or MISMATCH status by comparing db vs calculated vested', () => {
    expect(content).toMatch(
      /dbVestedTotal\s*===\s*calculatedVestedTotal\s*\?\s*['"]MATCH['"]\s*:\s*['"]MISMATCH['"]/,
    )
  })

  it('defines EmployeeVestingData type with expected fields', () => {
    expect(content).toMatch(/type\s+EmployeeVestingData\s*=\s*\{/)
    expect(content).toContain('dbVested')
    expect(content).toContain('calculatedVested')
    expect(content).toContain('difference')
    expect(content).toContain('status')
  })

  it('creates the route at /equity-vesting-audit', () => {
    expect(content).toMatch(/createFileRoute\(['"]\/equity-vesting-audit['"]\)/)
  })
})
