import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('onboarding route server functions', () => {
  const filePath = path.join(process.cwd(), 'src/routes/onboarding.tsx')
  const content = fs.readFileSync(filePath, 'utf-8')

  it('imports createAdminFn and createOrgChartFn from auth-middleware', () => {
    expect(content).toMatch(
      /import\s*\{[^}]*createAdminFn[^}]*\}\s*from\s*['"]@\/lib\/auth-middleware['"]/,
    )
    expect(content).toMatch(/createOrgChartFn/)
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

  it('defines createOnboardingRecord as a POST admin function with inputValidator', () => {
    expect(content).toMatch(/createOnboardingRecord\s*=\s*createAdminFn\(\{/)
    expect(content).toMatch(/createOnboardingRecord[\s\S]*?\.inputValidator\(/)
  })

  it('defines updateOnboardingStatus as a POST admin function with inputValidator', () => {
    expect(content).toMatch(/updateOnboardingStatus\s*=\s*createAdminFn\(\{/)
    expect(content).toMatch(/updateOnboardingStatus[\s\S]*?\.inputValidator\(/)
  })

  it('defines importOnboardingRecords as a POST admin function', () => {
    expect(content).toMatch(/importOnboardingRecords\s*=\s*createAdminFn\(\{/)
  })

  it('uses prisma.onboardingRecord for CRUD operations', () => {
    expect(content).toMatch(/prisma\.onboardingRecord\.findMany/)
    expect(content).toMatch(/prisma\.onboardingRecord\.create/)
    expect(content).toMatch(/prisma\.onboardingRecord\.update/)
    expect(content).toMatch(/prisma\.onboardingRecord\.delete/)
  })

  it('imports OnboardingStatus type from prisma client', () => {
    expect(content).toMatch(
      /import\s+type\s*\{[^}]*OnboardingStatus[^}]*\}\s*from\s*['"]@prisma\/client['"]/,
    )
  })
})
