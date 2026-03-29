import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('salaryDeviationChecker route server functions', () => {
  const filePath = path.join(
    process.cwd(),
    'src/routes/salaryDeviationChecker.tsx',
  )
  const content = fs.readFileSync(filePath, 'utf-8')

  it('uses server handler pattern with POST method', () => {
    expect(content).toMatch(/server:\s*\{[\s\S]*?handlers:\s*\{[\s\S]*?POST:/)
  })

  it('authenticates via Authorization bearer token against SYNC_ENDPOINT_KEY', () => {
    expect(content).toMatch(/request\.headers\.get\(['"]Authorization['"]\)/)
    expect(content).toMatch(/process\.env\.SYNC_ENDPOINT_KEY/)
  })

  it('queries employees with salaries and deel data, ordered by last checked', () => {
    expect(content).toMatch(/prisma\.employee\.findMany/)
    expect(content).toMatch(/salaryDeviationCheckedAt:\s*['"]asc['"]/)
  })

  it('imports fetchDeelEmployee from syncDeelEmployees', () => {
    expect(content).toMatch(
      /import\s*\{[^}]*fetchDeelEmployee[^}]*\}\s*from\s*['"]\.\/syncDeelEmployees['"]/,
    )
  })

  it('imports BambooHR utilities for US employees', () => {
    expect(content).toMatch(
      /import\s*\{[^}]*getBambooCompTable[^}]*\}\s*from\s*['"]\.\/syncSalaryUpdates['"]/,
    )
    expect(content).toMatch(
      /import\s*\{[^}]*getBambooEmployees[^}]*\}\s*from\s*['"]\.\/syncSalaryUpdates['"]/,
    )
  })

  it('handles annual vs monthly salary scales from Deel', () => {
    expect(content).toMatch(/scale\s*===\s*['"]annual['"]/)
    expect(content).toMatch(/rate\s*\*\s*12/)
  })

  it('updates employee salary deviation status via prisma.$transaction', () => {
    expect(content).toMatch(/prisma\.\$transaction/)
    expect(content).toMatch(/salaryDeviationStatus/)
    expect(content).toMatch(/['"]DEVIATED['"]/)
    expect(content).toMatch(/['"]IN_SYNC['"]/)
  })

  it('uses a 0.1% threshold for deviation detection', () => {
    expect(content).toMatch(/deviationPercentage\s*>\s*0\.001/)
  })
})
