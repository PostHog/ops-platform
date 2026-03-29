import { describe, expect, it } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * auth-middleware.ts contains internal functions (getManagedEmployeeIds)
 * and middleware factories (createAdminFn, createOrgChartFn, createInternalFn).
 * The internal functions aren't exported, so we verify the structure
 * and middleware chain via static analysis and import verification.
 */

describe('auth-middleware', () => {
  const filePath = path.join(process.cwd(), 'src/lib/auth-middleware.ts')
  const content = fs.readFileSync(filePath, 'utf-8')

  it('exports createAdminFn with auth + admin middleware', () => {
    expect(content).toMatch(
      /export const createAdminFn = createServerFn\(\)\.middleware\(\[\s*authMiddleware,\s*adminCheckMiddleware/,
    )
  })

  it('exports createOrgChartFn with auth + orgChart middleware', () => {
    expect(content).toMatch(
      /export const createOrgChartFn = createServerFn\(\)\.middleware\(\[\s*authMiddleware,\s*orgChartCheckMiddleware/,
    )
  })

  it('exports createInternalFn with auth + internal + manager middleware', () => {
    expect(content).toMatch(
      /export const createInternalFn = createServerFn\(\)\.middleware\(\[\s*authMiddleware,\s*internalCheckMiddleware,\s*managerInfoMiddleware/,
    )
  })

  it('authMiddleware redirects to /login when no user', () => {
    expect(content).toMatch(/throw redirect\(\{ to: '\/login' \}\)/)
  })

  it('adminCheckMiddleware checks for ROLES.ADMIN', () => {
    expect(content).toMatch(/user\?\.role !== ROLES\.ADMIN/)
  })

  it('orgChartCheckMiddleware allows both ORG_CHART and ADMIN roles', () => {
    expect(content).toMatch(/user\?\.role !== ROLES\.ORG_CHART/)
    expect(content).toMatch(/user\?\.role !== ROLES\.ADMIN/)
  })

  it('internalCheckMiddleware checks for @posthog.com email', () => {
    expect(content).toMatch(/endsWith\('@posthog\.com'\)/)
  })

  it('getManagedEmployeeIds recursively queries deelEmployee', () => {
    expect(content).toMatch(/async function getManagedEmployeeIds/)
    expect(content).toMatch(/getReportEmployeeIds/)
    expect(content).toMatch(/prisma\.deelEmployee\.findMany/)
  })

  it('managerInfoMiddleware looks up user by work email', () => {
    expect(content).toMatch(
      /prisma\.deelEmployee\.findUnique.*workEmail.*user\.email/s,
    )
  })

  it('exports ManagerInfo type', () => {
    expect(content).toMatch(/export type ManagerInfo/)
  })

  it('unauthorized middleware checks redirect to /error', () => {
    const errorRedirects = content.match(/redirect\(\{[\s\S]*?to: '\/error'/g)
    // admin, orgChart, and internal middleware all redirect to /error
    expect(errorRedirects).not.toBeNull()
    expect(errorRedirects!.length).toBeGreaterThanOrEqual(3)
  })
})
