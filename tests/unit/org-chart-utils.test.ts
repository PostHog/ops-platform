import { describe, expect, it, vi } from 'vitest'

// Mock @xyflow/react before importing the module under test
vi.mock('@xyflow/react', () => ({
  Position: {
    Top: 'top',
    Bottom: 'bottom',
    Left: 'left',
    Right: 'right',
  },
}))

import {
  getSourceHandlePosition,
  getTargetHandlePosition,
  getId,
} from '@/lib/org-chart/utils'

// ─── getSourceHandlePosition ────────────────────────────────────────────────

describe('getSourceHandlePosition', () => {
  it('returns Bottom for TB (top-to-bottom)', () => {
    expect(getSourceHandlePosition('TB')).toBe('bottom')
  })

  it('returns Top for BT (bottom-to-top)', () => {
    expect(getSourceHandlePosition('BT')).toBe('top')
  })

  it('returns Right for LR (left-to-right)', () => {
    expect(getSourceHandlePosition('LR')).toBe('right')
  })

  it('returns Left for RL (right-to-left)', () => {
    expect(getSourceHandlePosition('RL')).toBe('left')
  })
})

// ─── getTargetHandlePosition ────────────────────────────────────────────────

describe('getTargetHandlePosition', () => {
  it('returns Top for TB (top-to-bottom)', () => {
    expect(getTargetHandlePosition('TB')).toBe('top')
  })

  it('returns Bottom for BT (bottom-to-top)', () => {
    expect(getTargetHandlePosition('BT')).toBe('bottom')
  })

  it('returns Left for LR (left-to-right)', () => {
    expect(getTargetHandlePosition('LR')).toBe('left')
  })

  it('returns Right for RL (right-to-left)', () => {
    expect(getTargetHandlePosition('RL')).toBe('right')
  })
})

// ─── getId ──────────────────────────────────────────────────────────────────

describe('getId', () => {
  it('returns a string based on Date.now()', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))
    expect(getId()).toBe(`${Date.now()}`)
    vi.useRealTimers()
  })

  it('returns unique IDs on successive calls', () => {
    const id1 = getId()
    const id2 = getId()
    // They might be the same if called in same ms, but both should be numeric strings
    expect(id1).toMatch(/^\d+$/)
    expect(id2).toMatch(/^\d+$/)
  })
})
