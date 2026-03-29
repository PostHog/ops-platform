import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('onboarding route server functions', () => {
  const filePath = path.join(process.cwd(), 'src/routes/onboarding.tsx')
  const content = fs.readFileSync(filePath, 'utf-8')

  it('imports createAdminFn from auth-middleware', () => {
    expect(content).toMatch(
      /import\s*\{[^}]*createAdminFn[^}]*\}\s*from\s*['"]@\/lib\/auth-middleware['"]/,
    )
  })

  it('defines getOnboardingHires as a GET server function', () => {
    expect(content).toMatch(
      /const\s+getOnboardingHires\s*=\s*createAdminFn\(\{/,
    )
    expect(content).toMatch(
      /getOnboardingHires\s*=\s*createAdminFn\(\{\s*method:\s*['"]GET['"]/,
    )
  })

  it('defines getOnboardingRecords as a GET server function', () => {
    expect(content).toMatch(
      /const\s+getOnboardingRecords\s*=\s*createAdminFn\(\{/,
    )
    expect(content).toMatch(
      /getOnboardingRecords\s*=\s*createAdminFn\(\{\s*method:\s*['"]GET['"]/,
    )
  })

  it('defines getDeelEmployeesForPicker as a GET server function', () => {
    expect(content).toMatch(
      /const\s+getDeelEmployeesForPicker\s*=\s*createAdminFn\(\{/,
    )
    expect(content).toMatch(
      /getDeelEmployeesForPicker\s*=\s*createAdminFn\(\{\s*method:\s*['"]GET['"]/,
    )
  })

  it('defines createOnboardingRecord as a POST server function with inputValidator', () => {
    expect(content).toMatch(
      /const\s+createOnboardingRecord\s*=\s*createAdminFn\(\{/,
    )
    expect(content).toMatch(
      /createOnboardingRecord\s*=\s*createAdminFn\(\{\s*method:\s*['"]POST['"]/,
    )
    // The inputValidator should accept name, role, team, startDate, etc.
    expect(content).toMatch(/createOnboardingRecord[\s\S]*?\.inputValidator\(/)
  })

  it('defines updateOnboardingStatus as a POST server function with inputValidator', () => {
    expect(content).toMatch(
      /const\s+updateOnboardingStatus\s*=\s*createAdminFn\(\{/,
    )
    expect(content).toMatch(
      /updateOnboardingStatus\s*=\s*createAdminFn\(\{\s*method:\s*['"]POST['"]/,
    )
    expect(content).toMatch(/updateOnboardingStatus[\s\S]*?\.inputValidator\(/)
  })

  it('uses prisma.deelEmployee.findMany for pipeline hires', () => {
    expect(content).toMatch(/prisma\.deelEmployee\.findMany/)
  })

  it('uses prisma.onboardingRecord for CRUD operations', () => {
    expect(content).toMatch(/prisma\.onboardingRecord\.findMany/)
    expect(content).toMatch(/prisma\.onboardingRecord\.create/)
    expect(content).toMatch(/prisma\.onboardingRecord\.update/)
  })

  it('filters pipeline hires to last 90 days', () => {
    expect(content).toMatch(/ninetyDaysAgo/)
    expect(content).toMatch(/startDate:\s*\{\s*gte:\s*ninetyDaysAgo\s*\}/)
  })

  it('imports OnboardingStatus type from prisma client', () => {
    expect(content).toMatch(
      /import\s+type\s*\{[^}]*OnboardingStatus[^}]*\}\s*from\s*['"]@prisma\/client['"]/,
    )
  })
})
