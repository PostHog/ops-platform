import { describe, expect, it, vi } from 'vitest'
import {
  cn,
  getQuarterOptions,
  getFullName,
  ratingToText,
  driverRatingToText,
  proactiveRatingToText,
  optimisticRatingToText,
  getChecklistItemTypeLabel,
  formatCurrency,
  getCountryFlag,
  getCountries,
  getAreasByCountry,
} from '@/lib/utils'

// ─── cn ─────────────────────────────────────────────────────────────────────

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', true && 'visible')).toBe(
      'base visible',
    )
  })

  it('deduplicates tailwind classes', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('handles empty inputs', () => {
    expect(cn()).toBe('')
  })
})

// ─── getQuarterOptions ──────────────────────────────────────────────────────

describe('getQuarterOptions', () => {
  it('returns 8 quarter options', () => {
    const options = getQuarterOptions()
    expect(options).toHaveLength(8)
  })

  it('each option has label and value', () => {
    const options = getQuarterOptions()
    for (const opt of options) {
      expect(opt.label).toMatch(/^Q[1-4] \d{2}$/)
      expect(opt.value).toBe(opt.label)
    }
  })

  it('returns quarters in sequential order', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 6, 1)) // Jul 2025 → Q3
    const options = getQuarterOptions()
    // Should start 2 quarters back from Q3 → Q1
    expect(options[0].label).toBe('Q1 25')
    vi.useRealTimers()
  })
})

// ─── getFullName ────────────────────────────────────────────────────────────

describe('getFullName', () => {
  it('joins first and last name', () => {
    expect(getFullName('John', 'Doe')).toBe('John Doe')
  })

  it('returns first name only when no last name', () => {
    expect(getFullName('John', null)).toBe('John')
  })

  it('returns last name only when no first name', () => {
    expect(getFullName(null, 'Doe')).toBe('Doe')
  })

  it('returns fallback when both are empty', () => {
    expect(getFullName(null, null, 'unknown@test.com')).toBe('unknown@test.com')
  })

  it('returns empty string when no names and no fallback', () => {
    expect(getFullName(null, null)).toBe('')
  })

  it('trims whitespace', () => {
    expect(getFullName('  John  ', '  Doe  ')).toBe('John Doe')
  })

  it('handles undefined', () => {
    expect(getFullName(undefined, undefined)).toBe('')
  })
})

// ─── Rating helper functions ────────────────────────────────────────────────

describe('ratingToText', () => {
  it('maps STRONG_YES', () => {
    expect(ratingToText('STRONG_YES')).toContain('1000%')
  })

  it('maps YES', () => {
    expect(ratingToText('YES')).toContain('keep them')
  })

  it('maps NO', () => {
    expect(ratingToText('NO')).toContain('find better')
  })

  it('maps STRONG_NO', () => {
    expect(ratingToText('STRONG_NO')).toContain('letting this person go')
  })

  it('returns input for unknown rating', () => {
    expect(ratingToText('UNKNOWN')).toBe('UNKNOWN')
  })
})

describe('driverRatingToText', () => {
  it('maps all four ratings', () => {
    expect(driverRatingToText('STRONG_YES')).toContain('Strong driver')
    expect(driverRatingToText('YES')).toContain('Driver')
    expect(driverRatingToText('NO')).toContain('passenger')
    expect(driverRatingToText('STRONG_NO')).toContain('Extreme passenger')
  })

  it('returns input for unknown rating', () => {
    expect(driverRatingToText('UNKNOWN')).toBe('UNKNOWN')
  })
})

describe('proactiveRatingToText', () => {
  it('maps all four ratings', () => {
    expect(proactiveRatingToText('STRONG_YES')).toContain('very rare')
    expect(proactiveRatingToText('YES')).toBe('Mostly proactive')
    expect(proactiveRatingToText('NO')).toBe('Sometimes proactive')
    expect(proactiveRatingToText('STRONG_NO')).toBe('Not proactive')
  })
})

describe('optimisticRatingToText', () => {
  it('maps all four ratings', () => {
    expect(optimisticRatingToText('STRONG_YES')).toBe('Extremely optimistic')
    expect(optimisticRatingToText('YES')).toBe('Optimistic')
    expect(optimisticRatingToText('NO')).toBe('Pessimistic')
    expect(optimisticRatingToText('STRONG_NO')).toBe('Extremely pessimistic')
  })
})

// ─── getChecklistItemTypeLabel ──────────────────────────────────────────────

describe('getChecklistItemTypeLabel', () => {
  it('returns Step 1 label for SLACK_FEEDBACK_MEETING', () => {
    expect(getChecklistItemTypeLabel('SLACK_FEEDBACK_MEETING')).toContain(
      'Step 1',
    )
  })

  it('returns Step 2 label for EMAIL_FEEDBACK_MEETING', () => {
    expect(getChecklistItemTypeLabel('EMAIL_FEEDBACK_MEETING')).toContain(
      'Step 2',
    )
  })

  it('returns unknown for undefined', () => {
    expect(getChecklistItemTypeLabel(undefined)).toBe(
      'Unknown Checklist Item Type',
    )
  })
})

// ─── formatCurrency ─────────────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('formats USD amount', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56')
  })

  it('formats EUR amount', () => {
    expect(formatCurrency(1234.56, 'EUR')).toBe('€1,234.56')
  })

  it('returns $0.00 for null', () => {
    expect(formatCurrency(null)).toBe('$0.00')
  })

  it('returns $0.00 for undefined', () => {
    expect(formatCurrency(undefined)).toBe('$0.00')
  })

  it('formats 0 as $0.00', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('formats large numbers with commas', () => {
    expect(formatCurrency(1000000)).toBe('$1,000,000.00')
  })
})

// ─── getCountryFlag ─────────────────────────────────────────────────────────

describe('getCountryFlag', () => {
  it('returns US flag for United States', () => {
    expect(getCountryFlag('United States')).toBe('🇺🇸')
  })

  it('returns GB flag for United Kingdom', () => {
    expect(getCountryFlag('United Kingdom')).toBe('🇬🇧')
  })

  it('returns empty string for unknown country', () => {
    expect(getCountryFlag('Narnia')).toBe('')
  })

  it('returns DE flag for Germany', () => {
    expect(getCountryFlag('Germany')).toBe('🇩🇪')
  })
})

// ─── getCountries / getAreasByCountry ───────────────────────────────────────

describe('getCountries', () => {
  it('returns an array of unique country names', () => {
    const countries = getCountries()
    expect(countries.length).toBeGreaterThan(0)
    expect(new Set(countries).size).toBe(countries.length)
  })

  it('includes United States', () => {
    expect(getCountries()).toContain('United States')
  })
})

describe('getAreasByCountry', () => {
  it('returns areas for United States', () => {
    const areas = getAreasByCountry('United States')
    expect(areas.length).toBeGreaterThan(0)
    expect(areas).toContain('NYC, New York')
  })

  it('returns empty array for unknown country', () => {
    expect(getAreasByCountry('Narnia')).toEqual([])
  })
})
