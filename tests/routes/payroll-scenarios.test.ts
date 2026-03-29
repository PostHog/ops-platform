import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('payroll-scenarios route server functions', () => {
  const filePath = path.join(process.cwd(), 'src/routes/payroll-scenarios.tsx')
  const content = fs.readFileSync(filePath, 'utf-8')

  it('uses createAdminFn middleware (not raw createServerFn)', () => {
    expect(content).toMatch(/import.*createAdminFn.*from/)
    expect(content).not.toMatch(/import.*createServerFn.*from/)
  })

  it('defines getPayrollScenariosData as a GET admin function', () => {
    expect(content).toMatch(/getPayrollScenariosData\s*=\s*createAdminFn\(\{\s*method:\s*['"]GET['"]/)
  })

  it('defines savePayrollScenario as a POST admin function with input validation', () => {
    expect(content).toMatch(/savePayrollScenario\s*=\s*createAdminFn\(\{\s*method:\s*['"]POST['"]/)
    expect(content).toMatch(/savePayrollScenario[\s\S]*?\.inputValidator/)
  })

  it('defines deletePayrollScenario as a POST admin function with input validation', () => {
    expect(content).toMatch(/deletePayrollScenario\s*=\s*createAdminFn\(\{\s*method:\s*['"]POST['"]/)
    expect(content).toMatch(/deletePayrollScenario[\s\S]*?\.inputValidator/)
  })

  it('queries deelEmployee with salary includes for payroll data', () => {
    expect(content).toMatch(/prisma\.deelEmployee\.findMany/)
    expect(content).toMatch(/salaries/)
    expect(content).toMatch(/totalSalary/)
    expect(content).toMatch(/locationFactor/)
  })

  it('queries payrollScenario model for saved scenarios', () => {
    expect(content).toMatch(/prisma\.payrollScenario\.findMany/)
    expect(content).toMatch(/prisma\.payrollScenario\.create/)
    expect(content).toMatch(/prisma\.payrollScenario\.delete/)
  })

  it('includes createdBy user relation in scenario queries', () => {
    expect(content).toMatch(/createdBy:\s*\{/)
    expect(content).toMatch(/createdByUserId:\s*context\.user\.id/)
  })

  it('savePayrollScenario input accepts name, locationOverrides, and benchmarkOverrides', () => {
    expect(content).toMatch(/name:\s*string/)
    expect(content).toMatch(/locationOverrides:\s*Record<string,\s*string>/)
    expect(content).toMatch(/benchmarkOverrides:\s*Record<string,\s*string>/)
  })

  it('deletePayrollScenario input accepts an id', () => {
    expect(content).toMatch(/deletePayrollScenario[\s\S]*?inputValidator[\s\S]*?\{\s*id:\s*string\s*\}/)
  })

  it('uses sfBenchmark utility for benchmark salary calculations', () => {
    expect(content).toMatch(/import.*sfBenchmark.*from/)
    expect(content).toMatch(/sfBenchmark\[/)
  })

  it('filters employees by startDate lte current date', () => {
    expect(content).toMatch(/startDate:\s*\{\s*lte:\s*new Date\(\)/)
  })

  it('uses Promise.all to fetch employees and scenarios in parallel', () => {
    expect(content).toMatch(/Promise\.all\(\[/)
  })
})
