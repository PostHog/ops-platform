import { describe, expect, it, vi } from 'vitest'
import {
  isCSMCommissionType,
  CSM_COMMISSION_TYPE,
  calculateAttainmentPercentage,
  formatQuotaOrAttainment,
  calculateCommissionBonus,
  getEffectiveStartDate,
  getQuarterStartDate,
  calculateQuarterBreakdown,
  getPreviousQuarter,
  getNextQuarter,
  validateQuarterFormat,
  validateQuota,
  validateAttainment,
  getPreviousQuarterFrom,
  getPreviousNQuarters,
  type QuarterBreakdown,
} from '@/lib/commission-calculator'

// ─── isCSMCommissionType ────────────────────────────────────────────────────

describe('isCSMCommissionType', () => {
  it('returns true for CSM commission type', () => {
    expect(isCSMCommissionType(CSM_COMMISSION_TYPE)).toBe(true)
  })

  it('returns false for other commission types', () => {
    expect(isCSMCommissionType('Account Executive (OTE)')).toBe(false)
  })

  it('returns false for null/undefined', () => {
    expect(isCSMCommissionType(null)).toBe(false)
    expect(isCSMCommissionType(undefined)).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isCSMCommissionType('')).toBe(false)
  })
})

// ─── calculateAttainmentPercentage ──────────────────────────────────────────

describe('calculateAttainmentPercentage', () => {
  it('calculates standard attainment percentage', () => {
    expect(calculateAttainmentPercentage(50000, 100000)).toBe(50)
  })

  it('returns 100% when attainment equals quota', () => {
    expect(calculateAttainmentPercentage(100000, 100000)).toBe(100)
  })

  it('handles over-quota attainment', () => {
    expect(calculateAttainmentPercentage(150000, 100000)).toBe(150)
  })

  it('returns 0 when quota is 0', () => {
    expect(calculateAttainmentPercentage(50000, 0)).toBe(0)
  })

  it('calculates CSM attainment using (attainment - 1) / (quota - 1)', () => {
    // CSM: (1.1 - 1) / (1.05 - 1) * 100 = 0.1 / 0.05 * 100 = 200
    expect(
      calculateAttainmentPercentage(1.1, 1.05, CSM_COMMISSION_TYPE),
    ).toBeCloseTo(200)
  })

  it('returns 0 for CSM when denominator is 0', () => {
    expect(calculateAttainmentPercentage(1, 1, CSM_COMMISSION_TYPE)).toBe(0)
  })

  it('handles CSM attainment below quota', () => {
    // CSM: (0.95 - 1) / (1.05 - 1) * 100 = -0.05 / 0.05 * 100 = -100
    expect(
      calculateAttainmentPercentage(0.95, 1.05, CSM_COMMISSION_TYPE),
    ).toBeCloseTo(-100)
  })
})

// ─── formatQuotaOrAttainment ────────────────────────────────────────────────

describe('formatQuotaOrAttainment', () => {
  it('formats standard values as currency', () => {
    expect(formatQuotaOrAttainment(100000, null)).toBe('$100,000.00')
  })

  it('formats CSM values as percentage', () => {
    expect(formatQuotaOrAttainment(0.95, CSM_COMMISSION_TYPE)).toBe('95.0%')
  })

  it('formats with non-USD currency', () => {
    expect(formatQuotaOrAttainment(100000, null, 'EUR')).toBe('€100,000.00')
  })

  it('formats CSM regardless of currency param', () => {
    expect(formatQuotaOrAttainment(1.05, CSM_COMMISSION_TYPE, 'EUR')).toBe(
      '105.0%',
    )
  })
})

// ─── calculateCommissionBonus ───────────────────────────────────────────────

describe('calculateCommissionBonus', () => {
  const fullPostRampUp: QuarterBreakdown = {
    notEmployedMonths: 0,
    rampUpMonths: 0,
    postRampUpMonths: 3,
  }

  const fullRampUp: QuarterBreakdown = {
    notEmployedMonths: 0,
    rampUpMonths: 3,
    postRampUpMonths: 0,
  }

  const mixedBreakdown: QuarterBreakdown = {
    notEmployedMonths: 1,
    rampUpMonths: 2,
    postRampUpMonths: 0,
  }

  it('calculates full post-ramp-up bonus at 100% attainment', () => {
    const result = calculateCommissionBonus(
      100000,
      100000,
      30000,
      fullPostRampUp,
    )
    expect(result).toBeCloseTo(30000)
  })

  it('calculates full post-ramp-up bonus at 50% attainment', () => {
    const result = calculateCommissionBonus(
      50000,
      100000,
      30000,
      fullPostRampUp,
    )
    expect(result).toBeCloseTo(15000)
  })

  it('calculates full ramp-up bonus (100% OTE regardless of attainment)', () => {
    const result = calculateCommissionBonus(50000, 100000, 30000, fullRampUp)
    expect(result).toBeCloseTo(30000)
  })

  it('handles mixed ramp-up with not-employed months', () => {
    // 1 month not employed, 2 months ramp-up at 100% OTE
    const result = calculateCommissionBonus(
      50000,
      100000,
      30000,
      mixedBreakdown,
    )
    expect(result).toBeCloseTo(20000) // 2/3 * 30000
  })

  it('handles partial ramp-up and partial post-ramp-up', () => {
    const breakdown: QuarterBreakdown = {
      notEmployedMonths: 0,
      rampUpMonths: 1,
      postRampUpMonths: 2,
    }
    // ramp-up: 1/3 * 30000 = 10000
    // post-ramp-up: 2/3 * (100000/100000) * 30000 = 20000
    const result = calculateCommissionBonus(100000, 100000, 30000, breakdown)
    expect(result).toBeCloseTo(30000)
  })

  it('throws when quota is 0', () => {
    expect(() =>
      calculateCommissionBonus(100000, 0, 30000, fullPostRampUp),
    ).toThrow('Quota must be greater than 0')
  })

  it('throws when quota is negative', () => {
    expect(() =>
      calculateCommissionBonus(100000, -1, 30000, fullPostRampUp),
    ).toThrow('Quota must be greater than 0')
  })

  it('throws when attainment is negative', () => {
    expect(() =>
      calculateCommissionBonus(-1, 100000, 30000, fullPostRampUp),
    ).toThrow('Attainment must be greater than or equal to 0')
  })

  it('calculates CSM bonus using CSM formula', () => {
    // CSM: attainmentPercentage = (1.1 - 1) / (1.05 - 1) = 2.0
    // Full post-ramp-up: 3/3 * 2.0 * 30000 = 60000
    const result = calculateCommissionBonus(
      1.1,
      1.05,
      30000,
      fullPostRampUp,
      CSM_COMMISSION_TYPE,
    )
    expect(result).toBeCloseTo(60000)
  })

  it('handles CSM with denominator of 0', () => {
    const result = calculateCommissionBonus(
      1,
      1,
      30000,
      fullPostRampUp,
      CSM_COMMISSION_TYPE,
    )
    expect(result).toBeCloseTo(0)
  })

  it('calculates 0 bonus when attainment is 0', () => {
    const result = calculateCommissionBonus(0, 100000, 30000, fullPostRampUp)
    expect(result).toBeCloseTo(0)
  })
})

// ─── getEffectiveStartDate ──────────────────────────────────────────────────

describe('getEffectiveStartDate', () => {
  it('returns 1st of same month when start is before 15th', () => {
    const result = getEffectiveStartDate(new Date(2025, 0, 10)) // Jan 10
    expect(result).toEqual(new Date(2025, 0, 1))
  })

  it('returns 1st of same month when start is on 1st', () => {
    const result = getEffectiveStartDate(new Date(2025, 0, 1)) // Jan 1
    expect(result).toEqual(new Date(2025, 0, 1))
  })

  it('returns 1st of same month when start is on 14th', () => {
    const result = getEffectiveStartDate(new Date(2025, 0, 14)) // Jan 14
    expect(result).toEqual(new Date(2025, 0, 1))
  })

  it('returns 1st of next month when start is on 15th', () => {
    const result = getEffectiveStartDate(new Date(2025, 0, 15)) // Jan 15
    expect(result).toEqual(new Date(2025, 1, 1)) // Feb 1
  })

  it('returns 1st of next month when start is after 15th', () => {
    const result = getEffectiveStartDate(new Date(2025, 0, 20)) // Jan 20
    expect(result).toEqual(new Date(2025, 1, 1)) // Feb 1
  })

  it('rolls over to next year when start is late December', () => {
    const result = getEffectiveStartDate(new Date(2025, 11, 20)) // Dec 20
    expect(result).toEqual(new Date(2026, 0, 1)) // Jan 1 2026
  })
})

// ─── getQuarterStartDate ────────────────────────────────────────────────────

describe('getQuarterStartDate', () => {
  it('returns Jan 1 for Q1', () => {
    expect(getQuarterStartDate('2025-Q1')).toEqual(new Date(2025, 0, 1))
  })

  it('returns Apr 1 for Q2', () => {
    expect(getQuarterStartDate('2025-Q2')).toEqual(new Date(2025, 3, 1))
  })

  it('returns Jul 1 for Q3', () => {
    expect(getQuarterStartDate('2025-Q3')).toEqual(new Date(2025, 6, 1))
  })

  it('returns Oct 1 for Q4', () => {
    expect(getQuarterStartDate('2025-Q4')).toEqual(new Date(2025, 9, 1))
  })
})

// ─── calculateQuarterBreakdown ──────────────────────────────────────────────

describe('calculateQuarterBreakdown', () => {
  it('returns full post-ramp-up when no start date', () => {
    expect(calculateQuarterBreakdown(null, '2025-Q3')).toEqual({
      notEmployedMonths: 0,
      rampUpMonths: 0,
      postRampUpMonths: 3,
    })
  })

  it('returns full post-ramp-up when undefined start date', () => {
    expect(calculateQuarterBreakdown(undefined, '2025-Q3')).toEqual({
      notEmployedMonths: 0,
      rampUpMonths: 0,
      postRampUpMonths: 3,
    })
  })

  it('calculates full ramp-up Q1 for Jan 10 start', () => {
    // Effective start: Jan 1, ramp-up: Jan-Mar
    const result = calculateQuarterBreakdown(new Date(2025, 0, 10), '2025-Q1')
    expect(result).toEqual({
      notEmployedMonths: 0,
      rampUpMonths: 3,
      postRampUpMonths: 0,
    })
  })

  it('handles mid-month start on/after 15th', () => {
    // Start Jan 17 → effective Feb 1, ramp-up: Feb, Mar, Apr
    // Q1: Jan not employed, Feb+Mar ramp-up
    const result = calculateQuarterBreakdown(new Date(2025, 0, 17), '2025-Q1')
    expect(result).toEqual({
      notEmployedMonths: 1,
      rampUpMonths: 2,
      postRampUpMonths: 0,
    })
  })

  it('handles ramp-up spilling into next quarter', () => {
    // Start Jan 17 → effective Feb 1, ramp-up: Feb, Mar, Apr
    // Q2: Apr ramp-up, May+Jun post-ramp-up
    const result = calculateQuarterBreakdown(new Date(2025, 0, 17), '2025-Q2')
    expect(result).toEqual({
      notEmployedMonths: 0,
      rampUpMonths: 1,
      postRampUpMonths: 2,
    })
  })

  it('returns full post-ramp-up for a quarter well after ramp-up ended', () => {
    const result = calculateQuarterBreakdown(new Date(2024, 0, 1), '2025-Q3')
    expect(result).toEqual({
      notEmployedMonths: 0,
      rampUpMonths: 0,
      postRampUpMonths: 3,
    })
  })

  it('returns full not-employed for a quarter before start date', () => {
    // Start Jul 1, 2025 → effective Jul 1
    // Q1 2025: all 3 months before employment
    const result = calculateQuarterBreakdown(new Date(2025, 6, 1), '2025-Q1')
    expect(result).toEqual({
      notEmployedMonths: 3,
      rampUpMonths: 0,
      postRampUpMonths: 0,
    })
  })
})

// ─── getPreviousQuarter ─────────────────────────────────────────────────────

describe('getPreviousQuarter', () => {
  it('returns previous quarter based on current date', () => {
    const result = getPreviousQuarter()
    expect(result).toMatch(/^\d{4}-Q[1-4]$/)
  })

  it('returns Q4 of previous year when in Q1', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 1, 15)) // Feb 15, 2025 → Q1
    expect(getPreviousQuarter()).toBe('2024-Q4')
    vi.useRealTimers()
  })

  it('returns Q1 when in Q2', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 4, 15)) // May 15, 2025 → Q2
    expect(getPreviousQuarter()).toBe('2025-Q1')
    vi.useRealTimers()
  })

  it('returns Q2 when in Q3', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 7, 15)) // Aug 15, 2025 → Q3
    expect(getPreviousQuarter()).toBe('2025-Q2')
    vi.useRealTimers()
  })

  it('returns Q3 when in Q4', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 10, 15)) // Nov 15, 2025 → Q4
    expect(getPreviousQuarter()).toBe('2025-Q3')
    vi.useRealTimers()
  })
})

// ─── getNextQuarter ─────────────────────────────────────────────────────────

describe('getNextQuarter', () => {
  it('returns Q2 for Q1', () => {
    expect(getNextQuarter('2025-Q1')).toBe('2025-Q2')
  })

  it('returns Q3 for Q2', () => {
    expect(getNextQuarter('2025-Q2')).toBe('2025-Q3')
  })

  it('returns Q4 for Q3', () => {
    expect(getNextQuarter('2025-Q3')).toBe('2025-Q4')
  })

  it('returns Q1 of next year for Q4', () => {
    expect(getNextQuarter('2025-Q4')).toBe('2026-Q1')
  })
})

// ─── getPreviousQuarterFrom ─────────────────────────────────────────────────

describe('getPreviousQuarterFrom', () => {
  it('returns Q4 of previous year for Q1', () => {
    expect(getPreviousQuarterFrom('2025-Q1')).toBe('2024-Q4')
  })

  it('returns Q1 for Q2', () => {
    expect(getPreviousQuarterFrom('2025-Q2')).toBe('2025-Q1')
  })

  it('returns Q2 for Q3', () => {
    expect(getPreviousQuarterFrom('2025-Q3')).toBe('2025-Q2')
  })

  it('returns Q3 for Q4', () => {
    expect(getPreviousQuarterFrom('2025-Q4')).toBe('2025-Q3')
  })
})

// ─── getPreviousNQuarters ───────────────────────────────────────────────────

describe('getPreviousNQuarters', () => {
  it('returns empty array for count 0', () => {
    expect(getPreviousNQuarters('2025-Q3', 0)).toEqual([])
  })

  it('returns 1 previous quarter', () => {
    expect(getPreviousNQuarters('2025-Q3', 1)).toEqual(['2025-Q2'])
  })

  it('returns 4 previous quarters spanning a year boundary', () => {
    expect(getPreviousNQuarters('2025-Q2', 4)).toEqual([
      '2025-Q1',
      '2024-Q4',
      '2024-Q3',
      '2024-Q2',
    ])
  })

  it('returns quarters in most-recent-first order', () => {
    const result = getPreviousNQuarters('2025-Q4', 3)
    expect(result).toEqual(['2025-Q3', '2025-Q2', '2025-Q1'])
  })
})

// ─── validateQuarterFormat ──────────────────────────────────────────────────

describe('validateQuarterFormat', () => {
  it('accepts valid quarter formats', () => {
    expect(validateQuarterFormat('2025-Q1')).toBe(true)
    expect(validateQuarterFormat('2025-Q2')).toBe(true)
    expect(validateQuarterFormat('2025-Q3')).toBe(true)
    expect(validateQuarterFormat('2025-Q4')).toBe(true)
  })

  it('rejects Q0 and Q5', () => {
    expect(validateQuarterFormat('2025-Q0')).toBe(false)
    expect(validateQuarterFormat('2025-Q5')).toBe(false)
  })

  it('rejects invalid formats', () => {
    expect(validateQuarterFormat('Q1-2025')).toBe(false)
    expect(validateQuarterFormat('2025Q1')).toBe(false)
    expect(validateQuarterFormat('')).toBe(false)
    expect(validateQuarterFormat('2025-q1')).toBe(false)
  })
})

// ─── validateQuota ──────────────────────────────────────────────────────────

describe('validateQuota', () => {
  it('returns true for positive values', () => {
    expect(validateQuota(1)).toBe(true)
    expect(validateQuota(100000)).toBe(true)
  })

  it('returns false for 0', () => {
    expect(validateQuota(0)).toBe(false)
  })

  it('returns false for negative values', () => {
    expect(validateQuota(-1)).toBe(false)
  })
})

// ─── validateAttainment ─────────────────────────────────────────────────────

describe('validateAttainment', () => {
  it('returns true for 0', () => {
    expect(validateAttainment(0)).toBe(true)
  })

  it('returns true for positive values', () => {
    expect(validateAttainment(100000)).toBe(true)
  })

  it('returns false for negative values', () => {
    expect(validateAttainment(-1)).toBe(false)
  })
})
