import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('Actions route server functions', () => {
  const filePath = path.join(process.cwd(), 'src/routes/actions.tsx')
  const content = fs.readFileSync(filePath, 'utf-8')

  it('uses createAdminFn for all server functions (not raw createServerFn)', () => {
    expect(content).toMatch(/import.*createAdminFn.*from/)
    expect(content).not.toMatch(/import.*createServerFn.*from/)
  })

  // --- Server functions ---

  it('defines getUpdatedSalaries as a GET admin function', () => {
    expect(content).toMatch(
      /getUpdatedSalaries\s*=\s*createAdminFn\(\{\s*method:\s*['"]GET['"]/,
    )
  })

  it('defines updateCommunicated as a POST admin function with input validation', () => {
    expect(content).toMatch(
      /updateCommunicated\s*=\s*createAdminFn\(\{\s*method:\s*['"]POST['"]/,
    )
    expect(content).toMatch(/updateCommunicated[\s\S]*?\.inputValidator/)
  })

  // --- Prisma model usage ---

  it('queries salaries with employee and deelEmployee relations', () => {
    expect(content).toMatch(/prisma\.salary\.findMany/)
    expect(content).toMatch(/prisma\.salary\.update/)
  })

  it('includes employee with all salaries and deelEmployee topLevelManager', () => {
    expect(content).toMatch(/employee:\s*\{[\s\S]*?include:/)
    expect(content).toMatch(/topLevelManager:\s*true/)
  })

  // --- Business logic ---

  it('filters salaries to last 30 days with non-zero change or non-empty notes', () => {
    expect(content).toMatch(/new Date\(new Date\(\)\.setDate\(new Date\(\)\.getDate\(\)\s*-\s*30\)\)/)
    expect(content).toMatch(/changePercentage:\s*\{[\s\S]*?not:\s*0/)
    expect(content).toMatch(/notes:\s*\{[\s\S]*?not:\s*['"]["']/)
  })

  it('uses the route loader to prefetch salary data', () => {
    expect(content).toMatch(
      /loader:\s*async\s*\(\)\s*=>\s*await\s+getUpdatedSalaries\(\)/,
    )
  })

  it('defines a default message template with placeholder variables', () => {
    expect(content).toMatch(/defaultTemplate/)
    expect(content).toMatch(/\{firstName\}/)
    expect(content).toMatch(/\{changePercentage\}/)
    expect(content).toMatch(/\{salaryLocal\}/)
    expect(content).toMatch(/\{changeAmountLocal\}/)
  })

  it('defines a processTemplate function that replaces all placeholder variables', () => {
    expect(content).toMatch(/function\s+processTemplate/)
    expect(content).toMatch(/\.replace\(\/\\{name\\}\/g/)
    expect(content).toMatch(/\.replace\(\/\\{firstName\\}\/g/)
    expect(content).toMatch(/\.replace\(\/\\{reviewer\\}\/g/)
    expect(content).toMatch(/\.replace\(\/\\{step\\}\/g/)
    expect(content).toMatch(/\.replace\(\/\\{level\\}\/g/)
  })

  it('supports CSV export via export-to-csv', () => {
    expect(content).toMatch(/import.*generateCsv.*from\s*['"]export-to-csv['"]/)
    expect(content).toMatch(/import.*download.*from\s*['"]export-to-csv['"]/)
  })

  it('supports marking multiple rows as communicated via row selection', () => {
    expect(content).toMatch(/handleMarkSelectedAsCommunicated/)
    expect(content).toMatch(/RowSelectionState/)
    expect(content).toMatch(/rowSelection/)
  })

  it('provides a customizable message template with local storage persistence', () => {
    expect(content).toMatch(/useLocalStorage/)
    expect(content).toMatch(/actions-template-text/)
    expect(content).toMatch(/handleSaveTemplate/)
  })

  it('displays communicated status with toggle capability', () => {
    expect(content).toMatch(/communicated/)
    expect(content).toMatch(/updateCommunicated/)
  })

  it('creates the route with createFileRoute for /actions', () => {
    expect(content).toMatch(/createFileRoute\(['"]\/actions['"]\)/)
  })
})
