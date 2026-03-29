import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('Onboarding server functions', () => {
  const filePath = path.join(process.cwd(), 'src/routes/onboarding.tsx')
  const content = fs.readFileSync(filePath, 'utf-8')

  it('uses createAdminFn and createOrgChartFn (not raw createServerFn)', () => {
    expect(content).toMatch(/import.*createAdminFn.*from/)
    expect(content).toMatch(/import.*createOrgChartFn.*from/)
    expect(content).not.toMatch(/import.*\bcreateServerFn\b.*from.*@tanstack/)
  })

  it('defines getOnboardingRecords as a GET function', () => {
    expect(content).toMatch(
      /getOnboardingRecords\s*=\s*create(Admin|OrgChart)Fn\(\{/,
    )
  })

  it('defines getDeelEmployeesForPicker as a GET function', () => {
    expect(content).toMatch(
      /getDeelEmployeesForPicker\s*=\s*create(Admin|OrgChart)Fn\(\{/,
    )
  })

  it('defines createOnboardingRecord as a POST admin function with input validation', () => {
    expect(content).toMatch(/createOnboardingRecord\s*=\s*createAdminFn\(\{/)
    expect(content).toMatch(/createOnboardingRecord[\s\S]*?\.inputValidator/)
  })

  it('defines updateOnboardingStatus as a POST admin function with input validation', () => {
    expect(content).toMatch(/updateOnboardingStatus\s*=\s*createAdminFn\(\{/)
    expect(content).toMatch(/updateOnboardingStatus[\s\S]*?\.inputValidator/)
  })

  it('defines importOnboardingRecords as a POST admin function', () => {
    expect(content).toMatch(/importOnboardingRecords\s*=\s*createAdminFn\(\{/)
  })

  it('includes manager relation in queries', () => {
    const managerIncludes = content.match(
      /include:\s*\{[\s\S]*?manager:\s*true/g,
    )
    expect(managerIncludes).not.toBeNull()
    expect(managerIncludes!.length).toBeGreaterThanOrEqual(1)
  })

  it('uses prisma.onboardingRecord for CRUD operations', () => {
    expect(content).toMatch(/prisma\.onboardingRecord\.findMany/)
    expect(content).toMatch(/prisma\.onboardingRecord\.create/)
    expect(content).toMatch(/prisma\.onboardingRecord\.update/)
    expect(content).toMatch(/prisma\.onboardingRecord\.delete/)
  })
})
