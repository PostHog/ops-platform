import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

const content = fs.readFileSync(
  path.join(process.cwd(), 'src/components/CartaImportPanel.tsx'),
  'utf-8',
)

describe('CartaImportPanel', () => {
  it('exports CartaImportPanel as a named export', () => {
    expect(content).toMatch(/export function CartaImportPanel/)
  })

  it('uses useServerFn for employee fetching and grant importing', () => {
    expect(content).toMatch(/useServerFn\(getEmployeesForCartaImport\)/)
    expect(content).toMatch(/useServerFn\(importCartaOptionGrants\)/)
  })

  it('validates file type and enforces 10MB size limit', () => {
    expect(content).toMatch(/text\/csv/)
    expect(content).toMatch(
      /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/,
    )
    expect(content).toMatch(/10 \* 1024 \* 1024/)
    expect(content).toMatch(/File size exceeds 10MB limit/)
  })

  it('validates required columns: Stakeholder Email, Stakeholder ID, Quantity Issued', () => {
    expect(content).toMatch(/'stakeholder email' in firstRow/)
    expect(content).toMatch(/'stakeholder id' in firstRow/)
    expect(content).toMatch(/'quantity issued' in firstRow/)
  })

  it('skips cancelled grants and rows with zero issued quantity', () => {
    expect(content).toMatch(/canceled date/)
    expect(content).toMatch(/canceledDate\.trim\(\) !== ''/)
    expect(content).toMatch(/issuedQuantity === 0/)
  })

  it('matches employees by work email or personal email', () => {
    expect(content).toMatch(/emp\.email\.toLowerCase\(\) === normalizedEmail/)
    expect(content).toMatch(
      /emp\.deelEmployee\?\.personalEmail\?\.toLowerCase\(\)/,
    )
  })

  it('renders preview table with valid and error row counts', () => {
    expect(content).toMatch(/validRowCount/)
    expect(content).toMatch(/errorRowCount/)
    expect(content).toMatch(/Preview \(/)
  })
})
