import { describe, expect, it } from 'vitest'
import { sfBenchmark, roleType } from '@/lib/utils'

describe('roleType', () => {
  it('should have an entry for every benchmark in sfBenchmark', () => {
    const missing = Object.keys(sfBenchmark).filter((key) => !(key in roleType))
    expect(missing, `Missing roleType entries for: ${missing.join(', ')}`).toEqual([])
  })
})
