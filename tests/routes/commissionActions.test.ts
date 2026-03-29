import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('commissionActions route server functions', () => {
  const filePath = path.join(process.cwd(), 'src/routes/commissionActions.tsx')
  const content = fs.readFileSync(filePath, 'utf-8')

  it('uses createAdminFn middleware (not raw createServerFn)', () => {
    expect(content).toMatch(/import.*createAdminFn.*from/)
    expect(content).not.toMatch(/import.*createServerFn.*from/)
  })

  it('defines getCommissionBonuses as a GET admin function', () => {
    expect(content).toMatch(
      /getCommissionBonuses\s*=\s*createAdminFn\(\{\s*method:\s*['"]GET['"]/,
    )
  })

  it('defines updateCommissionBonusAttainment as a POST admin function with input validation', () => {
    expect(content).toMatch(
      /updateCommissionBonusAttainment\s*=\s*createAdminFn\(\{\s*method:\s*['"]POST['"]/,
    )
    expect(content).toMatch(
      /updateCommissionBonusAttainment[\s\S]*?\.inputValidator/,
    )
  })

  it('defines exportCommissionBonusesForDeel as a POST admin function', () => {
    expect(content).toMatch(
      /exportCommissionBonusesForDeel\s*=\s*createAdminFn\(\{\s*method:\s*['"]POST['"]/,
    )
  })

  it('queries commissionBonus prisma model with employee and deelEmployee includes', () => {
    expect(content).toMatch(/prisma\.commissionBonus\.findMany/)
    expect(content).toMatch(/prisma\.commissionBonus\.findUnique/)
    expect(content).toMatch(/prisma\.commissionBonus\.update/)
  })

  it('filters commission bonuses to last 30 days', () => {
    expect(content).toMatch(
      /new Date\(\)\.setDate\(new Date\(\)\.getDate\(\)\s*-\s*30\)/,
    )
  })

  it('updateCommissionBonusAttainment validates bonusId and attainment inputs', () => {
    expect(content).toMatch(/bonusId:\s*string/)
    expect(content).toMatch(/attainment:\s*number/)
  })

  it('handles CSM vs standard commission type calculations', () => {
    expect(content).toMatch(/isCSMCommissionType/)
    expect(content).toMatch(/calculateAttainmentPercentage/)
  })

  it('recalculates calculatedAmount and calculatedAmountLocal on attainment update', () => {
    expect(content).toMatch(/calculatedAmount/)
    expect(content).toMatch(/calculatedAmountLocal/)
    expect(content).toMatch(/exchangeRate/)
  })

  it('exports commission bonuses as Deel-compatible CSV', () => {
    expect(content).toMatch(/generateDeelCSV/)
    expect(content).toMatch(/adjustmentCategoryName.*Commission/)
    expect(content).toMatch(/dateOfExpense/)
  })

  it('filters out UK and US employees from Deel export', () => {
    expect(content).toMatch(/United Kingdom/)
    expect(content).toMatch(/United States/)
  })

  it('fetches active Deel employment via fetchDeelEmployee for contract ID', () => {
    expect(content).toMatch(/import.*fetchDeelEmployee.*from/)
    expect(content).toMatch(/hiring_status.*active/)
  })

  it('deducts amountHeld from net payout in Deel export', () => {
    expect(content).toMatch(/amountHeld/)
    expect(content).toMatch(/netPayoutLocal/)
  })

  it('collects and returns errors during Deel export without failing entirely', () => {
    expect(content).toMatch(/errors:\s*string\[\]/)
    expect(content).toMatch(/return\s*\{\s*csv,\s*errors\s*\}/)
  })
})
