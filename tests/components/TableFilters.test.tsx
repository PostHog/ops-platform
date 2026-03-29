import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

const content = fs.readFileSync(
  path.join(process.cwd(), 'src/components/TableFilters.tsx'),
  'utf-8',
)

describe('TableFilters', () => {
  it('exports TableFilters as a named export with generic type parameter', () => {
    expect(content).toMatch(/export function TableFilters<TData>/)
  })

  it('exports FilterType, FilterOption, and FilterConfig types', () => {
    expect(content).toMatch(/export type FilterType/)
    expect(content).toMatch(/export interface FilterOption/)
    expect(content).toMatch(/export interface FilterConfig/)
  })

  it('supports text, multi-select, range, date-range, and percentage-range filter types', () => {
    expect(content).toMatch(/'text'/)
    expect(content).toMatch(/'multi-select'/)
    expect(content).toMatch(/'range'/)
    expect(content).toMatch(/'date-range'/)
    expect(content).toMatch(/'percentage-range'/)
  })

  it('renders filter popovers with badge counts for active filters', () => {
    expect(content).toMatch(/FilterPopover/)
    expect(content).toMatch(/badgeCount/)
    expect(content).toMatch(/hasValue/)
  })

  it('implements multi-select filter with search when options exceed 8', () => {
    expect(content).toMatch(
      /const showSearch = \(filter\.options\?\.length \?\? 0\) > 8/,
    )
    expect(content).toMatch(/multiSelectSearch/)
    expect(content).toMatch(/toggleValue/)
  })

  it('provides clear buttons for each filter type', () => {
    expect(content).toMatch(/ClearButton/)
    expect(content).toMatch(/column\?\.setFilterValue\(undefined\)/)
    expect(content).toMatch(/column\?\.setFilterValue\(''\)/)
  })

  it('derives filter configs from table column definitions', () => {
    expect(content).toMatch(/table\.getAllColumns\(\)/)
    expect(content).toMatch(/col\.columnDef\.enableColumnFilter/)
    expect(content).toMatch(/getFilterType/)
    expect(content).toMatch(/getColumnLabel/)
  })
})
