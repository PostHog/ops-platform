import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('communicateCommissionBonuses route server functions', () => {
  const filePath = path.join(
    process.cwd(),
    'src/routes/communicateCommissionBonuses.tsx',
  )
  const content = fs.readFileSync(filePath, 'utf-8')

  it('uses server handler pattern with POST method', () => {
    expect(content).toMatch(/server:\s*\{[\s\S]*?handlers:\s*\{[\s\S]*?POST:/)
  })

  it('authenticates via Authorization bearer token against SYNC_ENDPOINT_KEY', () => {
    expect(content).toMatch(/request\.headers\.get\(['"]Authorization['"]\)/)
    expect(content).toMatch(/process\.env\.SYNC_ENDPOINT_KEY/)
  })

  it('queries prisma.commissionBonus.findMany for uncommunicated bonuses', () => {
    expect(content).toMatch(/prisma\.commissionBonus\.findMany/)
    expect(content).toMatch(/communicated:\s*false/)
  })

  it('imports and uses sendEmail from email-service', () => {
    expect(content).toMatch(
      /import\s*\{[^}]*sendEmail[^}]*\}\s*from\s*['"]@\/lib\/email-service['"]/,
    )
    expect(content).toMatch(/sendEmail\(/)
  })

  it('imports and uses generateCommissionBonusEmail from email-templates', () => {
    expect(content).toMatch(
      /import\s*\{[^}]*generateCommissionBonusEmail[^}]*\}\s*from\s*['"]@\/lib\/email-templates['"]/,
    )
    expect(content).toMatch(/generateCommissionBonusEmail\(/)
  })

  it('builds report chain by walking manager hierarchy via prisma.deelEmployee', () => {
    expect(content).toMatch(/async\s+function\s+getReportChain/)
    expect(content).toMatch(/prisma\.deelEmployee\.findUnique/)
    expect(content).toMatch(/managerId/)
  })

  it('marks bonus as communicated after successful email', () => {
    expect(content).toMatch(/prisma\.commissionBonus\.update/)
    expect(content).toMatch(/communicated:\s*true/)
  })

  it('imports commission calculator utilities for attainment and quarter breakdown', () => {
    expect(content).toMatch(
      /import\s*\{[^}]*calculateAttainmentPercentage[^}]*\}\s*from\s*['"]@\/lib\/commission-calculator['"]/,
    )
    expect(content).toMatch(
      /import\s*\{[^}]*calculateQuarterBreakdown[^}]*\}\s*from\s*['"]@\/lib\/commission-calculator['"]/,
    )
  })
})
