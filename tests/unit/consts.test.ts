import { describe, expect, it } from 'vitest'
import { ROLES } from '@/lib/consts'

describe('ROLES', () => {
  it('has ADMIN, ORG_CHART, and USER keys', () => {
    expect(ROLES).toHaveProperty('ADMIN')
    expect(ROLES).toHaveProperty('ORG_CHART')
    expect(ROLES).toHaveProperty('USER')
  })

  it('has expected string values', () => {
    expect(ROLES.ADMIN).toBe('admin')
    expect(ROLES.ORG_CHART).toBe('org-chart')
    expect(ROLES.USER).toBe('user')
  })
})
