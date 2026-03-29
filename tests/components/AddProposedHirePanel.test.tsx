import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

const content = fs.readFileSync(
  path.join(process.cwd(), 'src/components/AddProposedHirePanel.tsx'),
  'utf-8',
)

describe('AddProposedHirePanel', () => {
  it('exports AddProposedHirePanel as default export', () => {
    expect(content).toMatch(/export default AddProposedHirePanel/)
  })

  it('exports updateProposedHire and deleteProposedHire server functions', () => {
    expect(content).toMatch(/export const updateProposedHire/)
    expect(content).toMatch(/export const deleteProposedHire/)
  })

  it('supports both add and edit modes based on proposedHire prop', () => {
    expect(content).toMatch(/const editingExisting = !!proposedHire/)
    expect(content).toMatch(/editingExisting \? 'Edit proposed hire' : 'Add proposed hire'/)
  })

  it('uses zod validation on form submit', () => {
    expect(content).toMatch(/validators:\s*\{/)
    expect(content).toMatch(/onSubmit:\s*z\.object/)
    expect(content).toMatch(/z\.string\(\)\.min\(1, 'You must enter a title'\)/)
    expect(content).toMatch(/z\.string\(\)\.min\(1, 'You must select a manager'\)/)
  })

  it('renders form fields for title, priority, department, quarter, and hiring profile', () => {
    expect(content).toMatch(/name="title"/)
    expect(content).toMatch(/name="priority"/)
    expect(content).toMatch(/name="department"/)
    expect(content).toMatch(/name="quarter"/)
    expect(content).toMatch(/name="hiringProfile"/)
  })

  it('supports multi-select for talent partners', () => {
    expect(content).toMatch(/name="talentPartnerIds"/)
    expect(content).toMatch(/Select talent partners\.\.\./)
    expect(content).toMatch(/talentTeamEmployees/)
  })

  it('only shows quantity field when adding (not editing)', () => {
    expect(content).toMatch(/\{!editingExisting &&/)
    expect(content).toMatch(/name="quantity"/)
  })

  it('invalidates router and query client after submit', () => {
    expect(content).toMatch(/router\.invalidate\(\)/)
    expect(content).toMatch(/queryClient\.invalidateQueries\(\{.*queryKey:.*\['proposedHires'\]/)
  })
})
