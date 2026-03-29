import { describe, expect, it, vi } from 'vitest'
import { getPhase, formatDate, STATUS_CONFIG, STATUS_OPTIONS } from '@/lib/onboarding-utils'

// ─── getPhase ────────────────────────────────────────────────────────────────

describe('getPhase', () => {
  function daysFromToday(days: number): Date {
    const d = new Date()
    d.setDate(d.getDate() + days)
    d.setHours(9, 0, 0, 0)
    return d
  }

  it('returns Pre-start for future start dates', () => {
    const phase = getPhase(daysFromToday(14))
    expect(phase.label).toBe('Pre-start')
    expect(phase.sortOrder).toBe(0)
  })

  it('returns Pre-start for tomorrow', () => {
    expect(getPhase(daysFromToday(1)).label).toBe('Pre-start')
  })

  it('returns First Day for today', () => {
    const phase = getPhase(daysFromToday(0))
    expect(phase.label).toBe('First Day')
    expect(phase.sortOrder).toBe(1)
  })

  it('returns First Week for 1-7 days ago', () => {
    expect(getPhase(daysFromToday(-1)).label).toBe('First Week')
    expect(getPhase(daysFromToday(-3)).label).toBe('First Week')
    expect(getPhase(daysFromToday(-7)).label).toBe('First Week')
  })

  it('returns First 30 Days for 8-30 days ago', () => {
    expect(getPhase(daysFromToday(-8)).label).toBe('First 30 Days')
    expect(getPhase(daysFromToday(-15)).label).toBe('First 30 Days')
    expect(getPhase(daysFromToday(-30)).label).toBe('First 30 Days')
  })

  it('returns First 90 Days for 31+ days ago', () => {
    expect(getPhase(daysFromToday(-31)).label).toBe('First 90 Days')
    expect(getPhase(daysFromToday(-60)).label).toBe('First 90 Days')
    expect(getPhase(daysFromToday(-90)).label).toBe('First 90 Days')
  })

  it('assigns ascending sortOrder across all phases', () => {
    const phases = [
      getPhase(daysFromToday(14)),  // Pre-start
      getPhase(daysFromToday(0)),   // First Day
      getPhase(daysFromToday(-3)),  // First Week
      getPhase(daysFromToday(-15)), // First 30 Days
      getPhase(daysFromToday(-60)), // First 90 Days
    ]
    for (let i = 1; i < phases.length; i++) {
      expect(phases[i].sortOrder).toBeGreaterThan(phases[i - 1].sortOrder)
    }
  })

  it('includes a badgeClass for every phase', () => {
    const phases = [
      getPhase(daysFromToday(14)),
      getPhase(daysFromToday(0)),
      getPhase(daysFromToday(-3)),
      getPhase(daysFromToday(-15)),
      getPhase(daysFromToday(-60)),
    ]
    phases.forEach((phase) => {
      expect(phase.badgeClass).toBeTruthy()
      expect(phase.badgeClass.length).toBeGreaterThan(0)
    })
  })
})

// ─── formatDate ──────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('returns em dash for null', () => {
    expect(formatDate(null)).toBe('—')
  })

  it('returns em dash for undefined', () => {
    expect(formatDate(undefined)).toBe('—')
  })

  it('formats a Date object in en-GB style', () => {
    const result = formatDate(new Date(2026, 2, 15)) // March 15, 2026 (local time)
    expect(result).toMatch(/15/)
    expect(result).toMatch(/Mar/)
    expect(result).toMatch(/2026/)
  })

  it('formats a date string', () => {
    const result = formatDate('2026-01-05T00:00:00.000Z')
    expect(result).toMatch(/Jan/)
    expect(result).toMatch(/2026/)
  })
})

// ─── STATUS_CONFIG ───────────────────────────────────────────────────────────

describe('STATUS_CONFIG', () => {
  it('has an entry for every status in STATUS_OPTIONS', () => {
    STATUS_OPTIONS.forEach((status) => {
      expect(STATUS_CONFIG[status]).toBeDefined()
      expect(STATUS_CONFIG[status].label).toBeTruthy()
      expect(STATUS_CONFIG[status].badgeClass).toBeTruthy()
    })
  })

  it('covers all 5 onboarding statuses', () => {
    expect(Object.keys(STATUS_CONFIG)).toHaveLength(5)
  })

  it('has unique labels', () => {
    const labels = Object.values(STATUS_CONFIG).map((c) => c.label)
    expect(new Set(labels).size).toBe(labels.length)
  })
})

// ─── STATUS_OPTIONS ──────────────────────────────────────────────────────────

describe('STATUS_OPTIONS', () => {
  it('follows the correct workflow order', () => {
    expect(STATUS_OPTIONS).toEqual([
      'offer_accepted',
      'contract_sent',
      'contract_signed',
      'provisioned',
      'started',
    ])
  })
})
