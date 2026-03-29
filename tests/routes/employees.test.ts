import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('Employees route server functions', () => {
  const filePath = path.join(process.cwd(), 'src/routes/employees.tsx')
  const content = fs.readFileSync(filePath, 'utf-8')

  it('uses createAdminFn for all server functions (not raw createServerFn)', () => {
    expect(content).toMatch(/import.*createAdminFn.*from/)
    expect(content).not.toMatch(/import.*createServerFn.*from/)
  })

  // --- Server functions ---

  it('defines getEmployees as a GET admin function', () => {
    expect(content).toMatch(
      /getEmployees\s*=\s*createAdminFn\(\{\s*method:\s*['"]GET['"]/,
    )
  })

  it('defines updateEmployeePriority as a POST admin function with input validation', () => {
    expect(content).toMatch(
      /updateEmployeePriority\s*=\s*createAdminFn\(\{\s*method:\s*['"]POST['"]/,
    )
    expect(content).toMatch(/updateEmployeePriority[\s\S]*?\.inputValidator/)
  })

  // --- Prisma model usage ---

  it('queries employees with salaries and deelEmployee relations', () => {
    expect(content).toMatch(/prisma\.employee\.findMany/)
    expect(content).toMatch(/prisma\.employee\.update/)
  })

  it('includes salary data ordered by timestamp descending with take 1', () => {
    expect(content).toMatch(/salaries:\s*\{/)
    expect(content).toMatch(/orderBy:\s*\{[\s\S]*?timestamp:\s*['"]desc['"]/)
    expect(content).toMatch(/take:\s*1/)
  })

  it('includes deelEmployee with topLevelManager relation', () => {
    expect(content).toMatch(/deelEmployee:\s*\{/)
    expect(content).toMatch(/topLevelManager:\s*true/)
  })

  it('filters to only employees with at least one salary and started before today', () => {
    expect(content).toMatch(/salaries:\s*\{\s*some:\s*\{\}\s*\}/)
    expect(content).toMatch(/startDate:\s*\{[\s\S]*?lte:\s*new Date\(\)/)
  })

  // --- Business logic ---

  it('casts priority to Priority enum type', () => {
    expect(content).toMatch(/data\.priority\s*as\s*Priority/)
  })

  it('guards against empty priority values', () => {
    expect(content).toMatch(/if\s*\(\s*!data\.priority\s*\)\s*return/)
  })

  it('exports months array for shared use by other routes', () => {
    expect(content).toMatch(/export\s+const\s+months\s*=/)
  })

  // --- UI patterns ---

  it('uses TanStack Table with sorting and filtering', () => {
    expect(content).toMatch(/getCoreRowModel/)
    expect(content).toMatch(/getFilteredRowModel/)
    expect(content).toMatch(/getSortedRowModel/)
    expect(content).toMatch(/useReactTable/)
  })

  it('uses review queue atom from jotai', () => {
    expect(content).toMatch(/import.*reviewQueueAtom.*from/)
    expect(content).toMatch(/useAtom/)
  })

  it('creates the route with createFileRoute for /employees', () => {
    expect(content).toMatch(/createFileRoute\(['"]\/employees['"]\)/)
  })
})
