import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('Onboarding server functions', () => {
  const filePath = path.join(process.cwd(), 'src/routes/onboarding.tsx')
  const content = fs.readFileSync(filePath, 'utf-8')

  it('uses createAdminFn for all server functions (not raw createServerFn)', () => {
    // Should import createAdminFn
    expect(content).toMatch(/import.*createAdminFn.*from/)

    // Should NOT import raw createServerFn
    expect(content).not.toMatch(/import.*createServerFn.*from/)
  })

  it('defines getOnboardingHires as a GET admin function', () => {
    expect(content).toMatch(/getOnboardingHires\s*=\s*createAdminFn\(\{\s*method:\s*['"]GET['"]/)
  })

  it('defines getOnboardingRecords as a GET admin function', () => {
    expect(content).toMatch(/getOnboardingRecords\s*=\s*createAdminFn\(\{\s*method:\s*['"]GET['"]/)
  })

  it('defines getDeelEmployeesForPicker as a GET admin function', () => {
    expect(content).toMatch(/getDeelEmployeesForPicker\s*=\s*createAdminFn\(\{\s*method:\s*['"]GET['"]/)
  })

  it('defines createOnboardingRecord as a POST admin function with input validation', () => {
    expect(content).toMatch(/createOnboardingRecord\s*=\s*createAdminFn\(\{\s*method:\s*['"]POST['"]/)
    expect(content).toMatch(/createOnboardingRecord[\s\S]*?\.inputValidator/)
  })

  it('defines updateOnboardingStatus as a POST admin function with input validation', () => {
    expect(content).toMatch(/updateOnboardingStatus\s*=\s*createAdminFn\(\{\s*method:\s*['"]POST['"]/)
    expect(content).toMatch(/updateOnboardingStatus[\s\S]*?\.inputValidator/)
  })

  it('filters pipeline hires to last 90 days', () => {
    expect(content).toMatch(/ninetyDaysAgo/)
    expect(content).toMatch(/startDate.*gte.*ninetyDaysAgo/)
  })

  it('includes manager relation in both queries', () => {
    // Both getOnboardingHires and getOnboardingRecords include { manager: true }
    const managerIncludes = content.match(/include:\s*\{\s*manager:\s*true\s*\}/g)
    expect(managerIncludes).not.toBeNull()
    expect(managerIncludes!.length).toBeGreaterThanOrEqual(2)
  })
})
