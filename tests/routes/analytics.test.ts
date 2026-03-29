import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('analytics route server functions', () => {
  const filePath = path.join(process.cwd(), 'src/routes/analytics.tsx')
  const content = fs.readFileSync(filePath, 'utf-8')

  it('imports createAdminFn from auth-middleware', () => {
    expect(content).toMatch(
      /import\s*\{[^}]*createAdminFn[^}]*\}\s*from\s*['"]@\/lib\/auth-middleware['"]/,
    )
  })

  it('defines getEmployees as a GET server function', () => {
    expect(content).toMatch(/const\s+getEmployees\s*=\s*createAdminFn\(\{/)
    expect(content).toMatch(
      /getEmployees\s*=\s*createAdminFn\(\{\s*method:\s*['"]GET['"]/,
    )
  })

  it('queries prisma.deelEmployee.findMany with employee and salaries included', () => {
    expect(content).toMatch(/prisma\.deelEmployee\.findMany/)
    expect(content).toMatch(/include:\s*\{[\s\S]*?employee:/)
    expect(content).toMatch(/salaries:\s*\{[\s\S]*?orderBy:/)
  })

  it('filters to employees who have already started', () => {
    expect(content).toMatch(/startDate:\s*\{[\s\S]*?lte:\s*new\s+Date\(\)/)
  })

  it('filters to employees with at least one salary record', () => {
    expect(content).toMatch(/salaries:\s*\{[\s\S]*?some:\s*\{\}/)
  })

  it('uses getEmployees as route loader', () => {
    expect(content).toMatch(
      /loader:\s*async\s*\(\)\s*=>\s*await\s+getEmployees\(\)/,
    )
  })

  it('imports getReferenceEmployees from employee route for comparison data', () => {
    expect(content).toMatch(
      /import\s*\{[^}]*getReferenceEmployees[^}]*\}\s*from\s*['"]\.\/employee\.\$employeeId['"]/,
    )
  })

  it('uses useQuery to fetch referenceEmployees with filter parameters', () => {
    expect(content).toMatch(
      /useQuery\(\{[\s\S]*?queryKey:\s*\[[\s\S]*?['"]referenceEmployees['"]/,
    )
    expect(content).toMatch(/getReferenceEmployees\(\{/)
    expect(content).toMatch(/filterByExec/)
    expect(content).toMatch(/filterByLevel/)
    expect(content).toMatch(/filterByTitle/)
  })

  it('creates the route at /analytics path', () => {
    expect(content).toMatch(/createFileRoute\(['"]\/analytics['"]\)/)
  })
})
