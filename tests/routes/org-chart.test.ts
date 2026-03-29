import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('org-chart route server functions', () => {
  const filePath = path.join(process.cwd(), 'src/routes/org-chart.tsx')
  const content = fs.readFileSync(filePath, 'utf-8')

  it('uses createInternalFn middleware (not createAdminFn or raw createServerFn)', () => {
    expect(content).toMatch(/import.*createInternalFn.*from/)
    expect(content).not.toMatch(/import.*createAdminFn.*from/)
    expect(content).not.toMatch(/import.*createServerFn.*from/)
  })

  it('defines getDeelEmployeesAndProposedHires as a GET internal function', () => {
    expect(content).toMatch(/getDeelEmployeesAndProposedHires\s*=\s*createInternalFn\(\{\s*method:\s*['"]GET['"]/)
  })

  it('exports getDeelEmployeesAndProposedHires for use by other modules', () => {
    expect(content).toMatch(/export const getDeelEmployeesAndProposedHires/)
  })

  it('checks user role for admin vs manager access to performance programs', () => {
    expect(content).toMatch(/context\.user\.role\s*===\s*ROLES\.ADMIN/)
    expect(content).toMatch(/isAdmin/)
    expect(content).toMatch(/isManager/)
    expect(content).toMatch(/managedEmployeeIds/)
  })

  it('queries deelEmployee with employee, performancePrograms, and manager relations', () => {
    expect(content).toMatch(/prisma\.deelEmployee\.findMany/)
    expect(content).toMatch(/performancePrograms/)
    expect(content).toMatch(/PerformanceProgramStatus\.ACTIVE/)
  })

  it('queries proposedHire with manager and talentPartners relations', () => {
    expect(content).toMatch(/prisma\.proposedHire\.findMany/)
    expect(content).toMatch(/talentPartners/)
    expect(content).toMatch(/topLevelManager/)
  })

  it('returns employees, proposedHires, managerDeelEmployeeId, and managedEmployeeIds', () => {
    expect(content).toMatch(/return\s*\{\s*employees,\s*proposedHires,\s*managerDeelEmployeeId,\s*managedEmployeeIds\s*\}/)
  })

  it('uses managerInfo from context for scoping visibility', () => {
    expect(content).toMatch(/context\.managerInfo/)
    expect(content).toMatch(/managerDeelEmployeeId/)
  })

  it('imports ROLES constant for role-based access control', () => {
    expect(content).toMatch(/import.*ROLES.*from/)
  })

  it('conditionally filters performancePrograms by managedEmployeeIds for managers', () => {
    expect(content).toMatch(/employeeId:\s*\{/)
    expect(content).toMatch(/in:\s*Array\.from\(managedEmployeeIds\)/)
  })

  it('uses ReactFlow for org chart visualization', () => {
    // Import is multiline, so check for the component and package separately
    expect(content).toContain('ReactFlow')
    expect(content).toContain('@xyflow/react')
    expect(content).toMatch(/ReactFlowProvider/)
  })

  it('supports manager and team view modes', () => {
    expect(content).toMatch(/export type OrgChartMode\s*=\s*'manager'\s*\|\s*'team'/)
  })
})
