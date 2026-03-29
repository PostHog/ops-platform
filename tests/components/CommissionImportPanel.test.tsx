import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

const content = fs.readFileSync(
  path.join(process.cwd(), 'src/components/CommissionImportPanel.tsx'),
  'utf-8',
)

describe('CommissionImportPanel', () => {
  it('exports CommissionImportPanel as a named export', () => {
    expect(content).toMatch(/export function CommissionImportPanel/)
  })

  it('uses useServerFn for getEmployeesForImport and importCommissionBonuses', () => {
    expect(content).toMatch(/useServerFn\(getEmployeesForImport\)/)
    expect(content).toMatch(/useServerFn\(importCommissionBonuses\)/)
  })

  it('validates file type to CSV and Excel formats', () => {
    expect(content).toMatch(/text\/csv/)
    expect(content).toMatch(/application\/vnd\.ms-excel/)
    expect(content).toMatch(
      /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/,
    )
    expect(content).toMatch(/\.csv.*\.xls.*\.xlsx/)
  })

  it('enforces 10MB file size limit', () => {
    expect(content).toMatch(/10 \* 1024 \* 1024/)
    expect(content).toMatch(/File size exceeds 10MB limit/)
  })

  it('validates required columns: email, quota, attainment', () => {
    expect(content).toMatch(/'email' in firstRow/)
    expect(content).toMatch(/'quota' in firstRow/)
    expect(content).toMatch(/'attainment' in firstRow/)
    expect(content).toMatch(
      /File must contain columns: email, quota, and attainment/,
    )
  })

  it('uses commission calculator utilities for processing rows', () => {
    expect(content).toMatch(/calculateCommissionBonus/)
    expect(content).toMatch(/calculateAttainmentPercentage/)
    expect(content).toMatch(/calculateQuarterBreakdown/)
    expect(content).toMatch(/validateQuarterFormat/)
  })

  it('defaults quarter to previous quarter', () => {
    expect(content).toMatch(/getPreviousQuarter\(\)/)
  })

  it('renders a preview table with valid and error counts', () => {
    expect(content).toMatch(/Preview \(/)
    expect(content).toMatch(/previewData\.filter\(\(r\) => !r\.error\)\.length/)
    expect(content).toMatch(/previewData\.filter\(\(r\) => r\.error\)\.length/)
  })
})
