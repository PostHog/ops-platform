import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('Proposed hires route', () => {
  const filePath = path.join(process.cwd(), 'src/routes/proposed-hires.tsx')
  const content = fs.readFileSync(filePath, 'utf-8')

  it('does not define its own server functions (uses imported ones)', () => {
    // This route has no createAdminFn or createInternalFn calls
    expect(content).not.toMatch(/createAdminFn/)
    expect(content).not.toMatch(/createInternalFn/)
    expect(content).not.toMatch(/import.*createServerFn.*from/)
  })

  it('imports getDeelEmployeesAndProposedHires from org-chart route', () => {
    expect(content).toMatch(
      /import\s*\{.*getDeelEmployeesAndProposedHires.*\}\s*from\s*['"]\.\/org-chart['"]/,
    )
  })

  it('imports updateProposedHire and deleteProposedHire from AddProposedHirePanel', () => {
    expect(content).toContain('updateProposedHire')
    expect(content).toContain('deleteProposedHire')
    expect(content).toMatch(/from\s*['"]@\/components\/AddProposedHirePanel['"]/)
  })

  it('uses react-query for data fetching', () => {
    expect(content).toMatch(/import.*useQuery.*from\s*['"]@tanstack\/react-query['"]/)
    expect(content).toMatch(/import.*useQueryClient.*from\s*['"]@tanstack\/react-query['"]/)
  })

  it('fetches employees and proposed hires via react-query', () => {
    expect(content).toMatch(/queryFn:\s*\(\)\s*=>\s*getDeelEmployeesAndProposedHires\(\)/)
  })

  it('defines Prisma types for ProposedHire with manager and talentPartners relations', () => {
    expect(content).toMatch(/Prisma\.ProposedHireGetPayload/)
    expect(content).toMatch(/manager:\s*\{/)
    expect(content).toMatch(/talentPartners:\s*\{/)
  })

  it('defines Prisma types for DeelEmployee with employee relation', () => {
    expect(content).toMatch(/Prisma\.DeelEmployeeGetPayload/)
  })

  it('uses TanStack Table for data display with filtering and sorting', () => {
    expect(content).toMatch(/getCoreRowModel/)
    expect(content).toMatch(/getFilteredRowModel/)
    expect(content).toMatch(/getSortedRowModel/)
    expect(content).toMatch(/useReactTable/)
  })

  it('supports editable cells for text, manager, and talent partners', () => {
    expect(content).toMatch(/EditableTextCell/)
    expect(content).toMatch(/EditableManagerCell/)
    expect(content).toMatch(/EditableTalentPartnersCell/)
  })

  it('includes a delete button for proposed hires', () => {
    expect(content).toMatch(/DeleteButton/)
    expect(content).toMatch(/deleteProposedHire\(\{.*data:.*\{.*id/)
  })

  it('uses local storage for persisting filter/table state', () => {
    expect(content).toMatch(/useLocalStorage/)
  })

  it('defines special filter values for unassigned talent partners and no-team', () => {
    expect(content).toMatch(/UNASSIGNED_TALENT_PARTNER_FILTER/)
    expect(content).toMatch(/NO_TEAM_FILTER/)
  })

  it('includes PriorityBadge and TableFilters components', () => {
    expect(content).toMatch(/PriorityBadge/)
    expect(content).toMatch(/TableFilters/)
  })

  it('creates the route with createFileRoute for /proposed-hires', () => {
    expect(content).toMatch(/createFileRoute\(['"]\/proposed-hires['"]\)/)
  })
})
