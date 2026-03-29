import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('equityActions route server functions', () => {
  const filePath = path.join(process.cwd(), 'src/routes/equityActions.tsx')
  const content = fs.readFileSync(filePath, 'utf-8')

  it('uses createAdminFn middleware (not raw createServerFn)', () => {
    expect(content).toMatch(/import.*createAdminFn.*from/)
    expect(content).not.toMatch(/import.*createServerFn.*from/)
  })

  it('defines getEquityRefreshes as a GET admin function', () => {
    expect(content).toMatch(
      /getEquityRefreshes\s*=\s*createAdminFn\(\{\s*method:\s*['"]GET['"]/,
    )
  })

  it('defines updateEquityGranted as a POST admin function with input validation', () => {
    expect(content).toMatch(
      /updateEquityGranted\s*=\s*createAdminFn\(\{\s*method:\s*['"]POST['"]/,
    )
    expect(content).toMatch(/updateEquityGranted[\s\S]*?\.inputValidator/)
  })

  it('defines markMultipleAsGranted as a POST admin function with input validation', () => {
    expect(content).toMatch(
      /markMultipleAsGranted\s*=\s*createAdminFn\(\{\s*method:\s*['"]POST['"]/,
    )
    expect(content).toMatch(/markMultipleAsGranted[\s\S]*?\.inputValidator/)
  })

  it('defines updateEquityCommunicated as a POST admin function with input validation', () => {
    expect(content).toMatch(
      /updateEquityCommunicated\s*=\s*createAdminFn\(\{\s*method:\s*['"]POST['"]/,
    )
    expect(content).toMatch(/updateEquityCommunicated[\s\S]*?\.inputValidator/)
  })

  it('defines markMultipleAsCommunicated as a POST admin function with input validation', () => {
    expect(content).toMatch(
      /markMultipleAsCommunicated\s*=\s*createAdminFn\(\{\s*method:\s*['"]POST['"]/,
    )
    expect(content).toMatch(
      /markMultipleAsCommunicated[\s\S]*?\.inputValidator/,
    )
  })

  it('queries salary prisma model with equityRefreshAmount gt 0', () => {
    expect(content).toMatch(/prisma\.salary\.findMany/)
    expect(content).toMatch(/equityRefreshAmount:\s*\{/)
    expect(content).toMatch(/gt:\s*0/)
  })

  it('filters equity refreshes to last 3 months', () => {
    expect(content).toMatch(
      /new Date\(\)\.setMonth\(new Date\(\)\.getMonth\(\)\s*-\s*3\)/,
    )
  })

  it('includes employee with deelEmployee and topLevelManager relations', () => {
    expect(content).toMatch(/deelEmployee:\s*\{/)
    expect(content).toMatch(/topLevelManager:\s*true/)
  })

  it('uses salary.update for single record updates (granted, communicated)', () => {
    expect(content).toMatch(/prisma\.salary\.update/)
    expect(content).toMatch(/equityRefreshGranted/)
    expect(content).toMatch(/communicated/)
  })

  it('uses salary.updateMany for bulk operations', () => {
    expect(content).toMatch(/prisma\.salary\.updateMany/)
    expect(content).toMatch(/id:\s*\{\s*in:\s*data\.ids\s*\}/)
  })

  it('markMultipleAsGranted and markMultipleAsCommunicated accept ids array', () => {
    expect(content).toMatch(/markMultipleAsGranted[\s\S]*?ids:\s*string\[\]/)
    expect(content).toMatch(
      /markMultipleAsCommunicated[\s\S]*?ids:\s*string\[\]/,
    )
  })

  it('does not import Carta API (no external equity API integration in this file)', () => {
    expect(content).not.toMatch(/carta/i)
  })

  it('has a template system for equity communication messages', () => {
    expect(content).toMatch(/defaultEquityTemplate/)
    expect(content).toMatch(/processEquityTemplate/)
    expect(content).toMatch(/\{firstName\}/)
    expect(content).toMatch(/\{refreshPercentage\}/)
    expect(content).toMatch(/\{refreshAmount\}/)
  })
})
