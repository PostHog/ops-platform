import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

const content = fs.readFileSync(
  path.join(process.cwd(), 'src/components/NewSalaryForm.tsx'),
  'utf-8',
)

describe('NewSalaryForm', () => {
  it('exports NewSalaryForm as a named export', () => {
    expect(content).toMatch(/export function NewSalaryForm/)
  })

  it('uses useServerFn for saving salary drafts', () => {
    expect(content).toMatch(/useServerFn\(saveSalaryDraft\)/)
  })

  it('calls updateSalary on form submission', () => {
    expect(content).toMatch(/await updateSalary\(\{/)
  })

  it('accepts all required props', () => {
    expect(content).toMatch(/employeeId:\s*string/)
    expect(content).toMatch(/showOverride:\s*boolean/)
    expect(content).toMatch(/onSuccess:\s*\(\)/)
    expect(content).toMatch(/onCancel:\s*\(\)/)
    expect(content).toMatch(/latestSalary:\s*Salary\s*\|\s*undefined/)
    expect(content).toMatch(/salaryDraft:\s*SalaryDraft\s*\|\s*null/)
  })

  it('has debounce-based draft saving with 2 second delay', () => {
    expect(content).toMatch(/setTimeout\(async\s*\(\)/)
    expect(content).toMatch(/2000/)
    expect(content).toMatch(/setSaveStatus\('saving'\)/)
    expect(content).toMatch(/setSaveStatus\('saved'\)/)
  })

  it('cleans up debounce timer on unmount', () => {
    expect(content).toMatch(/clearTimeout\(debounceTimerRef\.current\)/)
    expect(content).toMatch(/return \(\) =>/)
  })

  it('renders form fields for country, area, benchmark, level, and step', () => {
    expect(content).toMatch(/name="country"/)
    expect(content).toMatch(/name="area"/)
    expect(content).toMatch(/name="benchmark"/)
    expect(content).toMatch(/name="level"/)
    expect(content).toMatch(/name="step"/)
  })

  it('conditionally renders salary override inputs when showOverride is true', () => {
    expect(content).toMatch(/showOverride \?/)
    expect(content).toMatch(/Total Salary \(\$\) Override/)
    expect(content).toMatch(/Bonus Percentage \(%\) Override/)
  })

  it('conditionally renders equity refresh fields when eligible', () => {
    expect(content).toMatch(/eligibleForEquityRefresh &&/)
    expect(content).toMatch(/Equity Refresh \(%\)/)
    expect(content).toMatch(/equityRefreshPercentage/)
  })

  it('disables save button when step is out of range or submitting', () => {
    expect(content).toMatch(
      /disabled=\{isSubmitting \|\| step < 0\.85 \|\| step > 1\.2\}/,
    )
  })

  it('shows a toast on successful submission', () => {
    expect(content).toMatch(/createToast\('Salary added successfully\.',/)
  })
})
