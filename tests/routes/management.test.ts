import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('Management route server functions', () => {
  const filePath = path.join(process.cwd(), 'src/routes/management.tsx')
  const content = fs.readFileSync(filePath, 'utf-8')

  it('uses createAdminFn for all server functions (not raw createServerFn)', () => {
    expect(content).toMatch(/import.*createAdminFn.*from/)
    expect(content).not.toMatch(/import.*createServerFn.*from/)
  })

  // --- GET functions ---

  it('defines getUsers as a GET admin function', () => {
    expect(content).toMatch(
      /getUsers\s*=\s*createAdminFn\(\{\s*method:\s*['"]GET['"]/,
    )
  })

  it('defines getEmployeesForCartaImport as a GET admin function', () => {
    expect(content).toMatch(
      /getEmployeesForCartaImport\s*=\s*createAdminFn\(\{\s*method:\s*['"]GET['"]/,
    )
  })

  it('defines getEmployeesForImport as a GET admin function', () => {
    expect(content).toMatch(
      /getEmployeesForImport\s*=\s*createAdminFn\(\{\s*method:\s*['"]GET['"]/,
    )
  })

  // --- POST functions ---

  it('defines updateUserRole as a POST admin function with input validation', () => {
    expect(content).toMatch(
      /updateUserRole\s*=\s*createAdminFn\(\{\s*method:\s*['"]POST['"]/,
    )
    expect(content).toMatch(/updateUserRole[\s\S]*?\.inputValidator/)
  })

  it('defines startReviewCycle as a POST admin function', () => {
    expect(content).toMatch(
      /startReviewCycle\s*=\s*createAdminFn\(\{\s*method:\s*['"]POST['"]/,
    )
  })

  it('defines populateInitialEmployeeSalaries as a POST admin function', () => {
    expect(content).toMatch(
      /populateInitialEmployeeSalaries\s*=\s*createAdminFn\(\{\s*method:\s*['"]POST['"]/,
    )
  })

  it('defines scheduleKeeperTests as a POST admin function', () => {
    expect(content).toMatch(
      /scheduleKeeperTests\s*=\s*createAdminFn\(\{\s*method:\s*['"]POST['"]/,
    )
  })

  it('defines scheduleKeeperTestForEmployee as a POST admin function with input validation', () => {
    expect(content).toMatch(
      /scheduleKeeperTestForEmployee\s*=\s*createAdminFn\(\{\s*method:\s*['"]POST['"]/,
    )
    expect(content).toMatch(
      /scheduleKeeperTestForEmployee[\s\S]*?\.inputValidator/,
    )
  })

  it('defines importCartaOptionGrants as a POST admin function with zod schema validation', () => {
    expect(content).toMatch(
      /importCartaOptionGrants\s*=\s*createAdminFn\(\{\s*method:\s*['"]POST['"]/,
    )
    expect(content).toMatch(/importCartaOptionGrantsSchema/)
    expect(content).toMatch(
      /importCartaOptionGrants[\s\S]*?\.inputValidator\(importCartaOptionGrantsSchema\)/,
    )
  })

  it('defines importCommissionBonuses as a POST admin function with zod schema validation', () => {
    expect(content).toMatch(
      /importCommissionBonuses\s*=\s*createAdminFn\(\{\s*method:\s*['"]POST['"]/,
    )
    expect(content).toMatch(/importCommissionBonusesSchema/)
    expect(content).toMatch(
      /importCommissionBonuses[\s\S]*?\.inputValidator\(importCommissionBonusesSchema\)/,
    )
  })

  // --- Audit logging ---

  it('creates audit log entries when updating user roles', () => {
    expect(content).toMatch(/import.*createAuditLogEntry.*from/)
    expect(content).toMatch(/createAuditLogEntry\(\{/)
    expect(content).toMatch(/entityType:\s*['"]USER_ROLE['"]/)
  })

  // --- Prisma model usage ---

  it('queries key prisma models', () => {
    expect(content).toMatch(/prisma\.user\.findMany/)
    expect(content).toMatch(/prisma\.user\.update/)
    expect(content).toMatch(/prisma\.employee\.updateMany/)
    expect(content).toMatch(/prisma\.deelEmployee\.findMany/)
    expect(content).toMatch(/prisma\.salary\.create/)
    expect(content).toMatch(/prisma\.cyclotronJob\.createMany/)
    expect(content).toMatch(/prisma\.cartaOptionGrant\.create/)
    expect(content).toMatch(/prisma\.cartaOptionGrant\.deleteMany/)
    expect(content).toMatch(/prisma\.commissionBonus\.create/)
  })

  // --- Business logic ---

  it('excludes probation employees from keeper test scheduling (90-day filter)', () => {
    expect(content).toMatch(/90\s*\*\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/)
  })

  it('creates cyclotron jobs for both keeper tests and manager feedback', () => {
    expect(content).toMatch(/queue_name:\s*['"]send_keeper_test['"]/)
    expect(content).toMatch(/queue_name:\s*['"]send_manager_feedback['"]/)
  })

  it('checks for duplicate commission bonuses before importing', () => {
    expect(content).toMatch(/prisma\.commissionBonus\.findUnique/)
    expect(content).toMatch(
      /Commission bonus already exists for this employee and quarter/,
    )
  })

  it('uses role mapping for salary population benchmarks', () => {
    expect(content).toMatch(/getMappedRole/)
    expect(content).toMatch(/mappedRoles/)
  })
})
