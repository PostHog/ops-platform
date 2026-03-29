import { describe, expect, it, vi } from 'vitest'
import { calculateVestedQuantity } from '@/lib/vesting'
import type { CartaOptionGrant } from '@prisma/client'

function createGrant(
  overrides: Partial<CartaOptionGrant> = {},
): CartaOptionGrant {
  return {
    id: 'grant-1',
    grantId: 'carta-1',
    stakeholderId: 'emp-1',
    issuedQuantity: 4800,
    exercisePrice: 1.5,
    vestingStartDate: new Date('2023-01-01'),
    vestingSchedule: '4 years, 1 year cliff',
    exercisedQuantity: 0,
    vestedQuantity: 0,
    expiredQuantity: 0,
    ...overrides,
  }
}

describe('calculateVestedQuantity', () => {
  it('returns 0 when no vesting start date', () => {
    const grant = createGrant({ vestingStartDate: null })
    expect(calculateVestedQuantity(grant)).toBe(0)
  })

  it('returns 0 before cliff (standard 12-month cliff)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2023-11-01')) // 10 months in
    const grant = createGrant({ vestingStartDate: new Date('2023-01-01') })
    expect(calculateVestedQuantity(grant)).toBe(0)
    vi.useRealTimers()
  })

  it('vests shares after cliff', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15')) // 12+ months in
    const grant = createGrant({
      vestingStartDate: new Date('2023-01-01'),
      issuedQuantity: 4800,
    })
    const vested = calculateVestedQuantity(grant)
    // 12 months out of 48 = 25% = 1200 shares
    expect(vested).toBe(1200)
    vi.useRealTimers()
  })

  it('handles no-cliff schedule', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2023, 6, 1)) // Jul 1, 2023 (local time)
    const grant = createGrant({
      vestingStartDate: new Date(2023, 0, 1), // Jan 1, 2023
      issuedQuantity: 4800,
      vestingSchedule: '4 years, no cliff',
    })
    const vested = calculateVestedQuantity(grant)
    // 6 months out of 48 = 12.5% = 600 shares
    expect(vested).toBe(600)
    vi.useRealTimers()
  })

  it('does not exceed total shares when fully vested', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2028-01-01')) // 5 years in (past 4-year schedule)
    const grant = createGrant({
      vestingStartDate: new Date('2023-01-01'),
      issuedQuantity: 4800,
    })
    expect(calculateVestedQuantity(grant)).toBe(4800)
    vi.useRealTimers()
  })

  it('returns 0 when vesting has not started yet', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2022-06-01'))
    const grant = createGrant({ vestingStartDate: new Date('2023-01-01') })
    expect(calculateVestedQuantity(grant)).toBe(0)
    vi.useRealTimers()
  })

  it('calculates mid-vest correctly', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15')) // 24+ months
    const grant = createGrant({
      vestingStartDate: new Date('2023-01-01'),
      issuedQuantity: 4800,
    })
    // 24 months out of 48 = 50% = 2400 shares
    expect(calculateVestedQuantity(grant)).toBe(2400)
    vi.useRealTimers()
  })

  it('floors fractional shares', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-02-01')) // 13 months
    const grant = createGrant({
      vestingStartDate: new Date('2023-01-01'),
      issuedQuantity: 100,
    })
    // 13/48 * 100 = 27.08... → floor to 27
    expect(calculateVestedQuantity(grant)).toBe(27)
    vi.useRealTimers()
  })
})
