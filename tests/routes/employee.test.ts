import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('Employee route server functions', () => {
  const filePath = path.join(
    process.cwd(),
    'src/routes/employee.$employeeId.tsx',
  )
  const content = fs.readFileSync(filePath, 'utf-8')

  it('imports both createAdminFn and createInternalFn middleware', () => {
    expect(content).toMatch(/import.*createAdminFn.*from/)
    expect(content).toMatch(/import.*createInternalFn.*from/)
  })

  it('does not import raw createServerFn', () => {
    expect(content).not.toMatch(/import.*createServerFn.*from/)
  })

  // --- GET functions ---

  it('defines getEmployeeById as a GET internal function with input validation', () => {
    expect(content).toMatch(
      /getEmployeeById\s*=\s*createInternalFn\(\{\s*method:\s*['"]GET['"]/,
    )
    expect(content).toMatch(/getEmployeeById[\s\S]*?\.inputValidator/)
  })

  it('defines getReferenceEmployees as a GET admin function with input validation', () => {
    expect(content).toMatch(
      /getReferenceEmployees\s*=\s*createAdminFn\(\{\s*method:\s*['"]GET['"]/,
    )
    expect(content).toMatch(/getReferenceEmployees[\s\S]*?\.inputValidator/)
  })

  it('defines getDeelEmployees as a GET internal function', () => {
    expect(content).toMatch(
      /getDeelEmployees\s*=\s*createInternalFn\(\{\s*method:\s*['"]GET['"]/,
    )
  })

  it('defines getProofFileUrl as a GET internal function with input validation', () => {
    expect(content).toMatch(
      /getProofFileUrl\s*=\s*createInternalFn\(\{\s*method:\s*['"]GET['"]/,
    )
    expect(content).toMatch(/getProofFileUrl[\s\S]*?\.inputValidator/)
  })

  // --- POST functions ---

  it('defines updateSalary as a POST admin function with input validation', () => {
    expect(content).toMatch(
      /updateSalary\s*=\s*createAdminFn\(\{\s*method:\s*['"]POST['"]/,
    )
    expect(content).toMatch(/updateSalary[\s\S]*?\.inputValidator/)
  })

  it('defines deleteSalary as a POST admin function with input validation', () => {
    expect(content).toMatch(
      /deleteSalary\s*=\s*createAdminFn\(\{\s*method:\s*['"]POST['"]/,
    )
    expect(content).toMatch(/deleteSalary[\s\S]*?\.inputValidator/)
  })

  it('defines savePayReviewNote and deletePayReviewNote as POST admin functions', () => {
    expect(content).toMatch(
      /savePayReviewNote\s*=\s*createAdminFn\(\{\s*method:\s*['"]POST['"]/,
    )
    expect(content).toMatch(
      /deletePayReviewNote\s*=\s*createAdminFn\(\{\s*method:\s*['"]POST['"]/,
    )
  })

  it('defines saveSalaryDraft as a POST admin function with input validation', () => {
    expect(content).toMatch(
      /saveSalaryDraft\s*=\s*createAdminFn\(\{\s*method:\s*['"]POST['"]/,
    )
    expect(content).toMatch(/saveSalaryDraft[\s\S]*?\.inputValidator/)
  })

  it('defines performance program functions as internal (not admin) functions', () => {
    expect(content).toMatch(
      /createPerformanceProgram\s*=\s*createInternalFn\(\{\s*method:\s*['"]POST['"]/,
    )
    expect(content).toMatch(
      /updateChecklistItem\s*=\s*createInternalFn\(\{\s*method:\s*['"]POST['"]/,
    )
    expect(content).toMatch(
      /addProgramFeedback\s*=\s*createInternalFn\(\{\s*method:\s*['"]POST['"]/,
    )
    expect(content).toMatch(
      /updateProgramFeedback\s*=\s*createInternalFn\(\{\s*method:\s*['"]POST['"]/,
    )
    expect(content).toMatch(
      /resolvePerformanceProgram\s*=\s*createInternalFn\(\{\s*method:\s*['"]POST['"]/,
    )
  })

  it('defines S3 file operations as internal functions', () => {
    expect(content).toMatch(
      /getProofFileUploadUrl\s*=\s*createInternalFn\(\{\s*method:\s*['"]POST['"]/,
    )
    expect(content).toMatch(
      /createProofFileRecord\s*=\s*createInternalFn\(\{\s*method:\s*['"]POST['"]/,
    )
    expect(content).toMatch(
      /deleteProofFile\s*=\s*createInternalFn\(\{\s*method:\s*['"]POST['"]/,
    )
  })

  // --- Prisma model usage ---

  it('queries key prisma models', () => {
    expect(content).toMatch(/prisma\.employee\.findUnique/)
    expect(content).toMatch(/prisma\.salary\.create/)
    expect(content).toMatch(/prisma\.salary\.delete/)
    expect(content).toMatch(/prisma\.salaryDraft\.upsert/)
    expect(content).toMatch(/prisma\.deelEmployee\.findMany/)
    expect(content).toMatch(/prisma\.performanceProgram\.create/)
    expect(content).toMatch(/prisma\.performanceProgramFeedback\.create/)
    expect(content).toMatch(/prisma\.file\.create/)
    expect(content).toMatch(/prisma\.file\.delete/)
  })

  // --- S3 integration ---

  it('uses S3 for file upload and download via presigned URLs', () => {
    expect(content).toMatch(/getPresignedUploadUrl/)
    expect(content).toMatch(/getPresignedDownloadUrl/)
    expect(content).toMatch(/import\('@\/lib\/s3'\)/)
  })

  // --- Security patterns ---

  it('enforces role-based authorization with admin and manager checks', () => {
    // Multiple functions check isAdmin and isManager before proceeding
    const adminChecks = content.match(
      /context\.user\.role\s*===\s*ROLES\.ADMIN/g,
    )
    expect(adminChecks).not.toBeNull()
    expect(adminChecks!.length).toBeGreaterThanOrEqual(5)

    // Unauthorized throws for non-admin/non-manager users
    const unauthorizedThrows = content.match(
      /throw new Error\(['"]Unauthorized['"]\)/g,
    )
    expect(unauthorizedThrows).not.toBeNull()
    expect(unauthorizedThrows!.length).toBeGreaterThanOrEqual(5)
  })

  it('restricts salary deletion to within 24 hours of creation', () => {
    expect(content).toMatch(/hoursSinceCreation/)
    expect(content).toMatch(/Cannot delete salary after 24 hours/)
  })

  it('uses a prisma transaction for updateSalary to atomically create salary, delete draft, and mark reviewed', () => {
    expect(content).toMatch(/prisma\.\$transaction/)
    expect(content).toMatch(/prisma\.salary\.create/)
    expect(content).toMatch(/prisma\.salaryDraft\.deleteMany/)
  })

  it('validates file size and type in getProofFileUploadUrl', () => {
    expect(content).toMatch(/File size exceeds 10MB limit/)
    expect(content).toMatch(/File type not allowed/)
    expect(content).toMatch(/allowedTypes/)
  })

  it('restricts updateProgramFeedback to the original author only', () => {
    expect(content).toMatch(
      /existing\.givenByUserId\s*!==\s*context\.user\.id/,
    )
  })

  it('requires all checklist items completed before resolving a performance program', () => {
    expect(content).toMatch(
      /All checklist items must be completed before resolving/,
    )
    expect(content).toMatch(/\.every\(\(item\)\s*=>\s*item\.completed\)/)
  })
})
