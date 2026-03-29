import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('syncSalaryUpdates route', () => {
  const filePath = path.join(process.cwd(), 'src/routes/syncSalaryUpdates.tsx')
  const content = fs.readFileSync(filePath, 'utf-8')

  it('uses raw server handlers with a POST method (not createAdminFn)', () => {
    expect(content).toMatch(/server:\s*\{/)
    expect(content).toMatch(/handlers:\s*\{/)
    expect(content).toMatch(/POST:\s*async/)
  })

  it('authenticates via Authorization Bearer token against SYNC_ENDPOINT_KEY', () => {
    expect(content).toMatch(/Authorization.*split\(['"].*['"]\)\[1\]/)
    expect(content).toMatch(/process\.env\.SYNC_ENDPOINT_KEY/)
    expect(content).toMatch(/Unauthorized/)
    expect(content).toMatch(/status:\s*401/)
  })

  it('queries unsynced, communicated salaries from prisma', () => {
    expect(content).toMatch(/prisma\.salary\.findMany/)
    expect(content).toMatch(/synced:\s*false/)
    expect(content).toMatch(/communicated:\s*true/)
  })

  it('includes employee with deelEmployee and recent salaries', () => {
    expect(content).toMatch(/include:\s*\{[\s\S]*?employee:/)
    expect(content).toMatch(/deelEmployee:\s*true/)
    expect(content).toMatch(/salaries:\s*\{[\s\S]*?take:\s*2/)
  })

  it('limits batch processing to 5 salaries at a time', () => {
    expect(content).toMatch(/take:\s*5/)
  })

  it('guards against excessive salary change percentage', () => {
    expect(content).toMatch(/changePercentage\s*>\s*0\.5/)
    expect(content).toMatch(/Change percentage is too high/)
  })

  it('handles direct_employee hiring type via Deel GP compensation PATCH', () => {
    expect(content).toMatch(/hiring_type\s*===\s*['"]direct_employee['"]/)
    expect(content).toMatch(/api\.letsdeel\.com\/rest\/v2\/gp\/workers/)
    expect(content).toMatch(/method:\s*['"]PATCH['"]/)
  })

  it('handles eor hiring type via Deel EOR amendments POST and confirm', () => {
    expect(content).toMatch(/hiring_type\s*===\s*['"]eor['"]/)
    expect(content).toMatch(/api\.letsdeel\.com\/rest\/v2\/eor\/contracts/)
    expect(content).toMatch(/amendments/)
    expect(content).toMatch(/confirm/)
  })

  it('handles contractor hiring type via Deel contract amendments and signatures', () => {
    expect(content).toMatch(/hiring_type\s*===\s*['"]contractor['"]/)
    expect(content).toMatch(/api\.letsdeel\.com\/rest\/v2\/contracts/)
    expect(content).toMatch(/signatures/)
    expect(content).toMatch(/process\.env\.DEEL_SIGNATURE_TEXT/)
  })

  it('integrates with BambooHR API for compensation table lookup', () => {
    expect(content).toMatch(/posthog\.bamboohr\.com\/api/)
    expect(content).toMatch(/process\.env\.BAMBOO_API_KEY/)
    expect(content).toMatch(/getBambooCompTable/)
    expect(content).toMatch(/getBambooEmployees/)
  })

  it('marks salaries as synced after successful processing', () => {
    expect(content).toMatch(/prisma\.salary\.update/)
    expect(content).toMatch(/synced:\s*true/)
  })

  it('validates previous salary matches before updating', () => {
    expect(content).toMatch(/Previous salary does not match/)
    expect(content).toMatch(/Previous bamboo salary does not match/)
  })
})
