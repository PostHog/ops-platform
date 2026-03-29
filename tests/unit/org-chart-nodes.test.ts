import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('org-chart nodes', () => {
  const content = fs.readFileSync(
    path.join(process.cwd(), 'src/lib/org-chart/nodes.tsx'),
    'utf-8',
  )

  it('uses memo for performance optimization', () => {
    expect(content).toMatch(/memo\(/)
  })

  it('renders Handle components for connections', () => {
    expect(content).toMatch(/<Handle/)
    expect(content).toMatch(/type="target"/)
    expect(content).toMatch(/type="source"/)
  })

  it('uses useSensitiveDataHidden hook', () => {
    expect(content).toMatch(/useSensitiveDataHidden/)
  })

  it('tracks meta key state with useMetaKeyDown hook', () => {
    expect(content).toMatch(/useMetaKeyDown/)
    expect(content).toMatch(/e\.metaKey/)
  })

  it('uses cn utility for conditional classes', () => {
    expect(content).toMatch(/import.*cn.*from/)
  })

  it('includes calendar/clock icons for dates', () => {
    expect(content).toMatch(/CalendarClockIcon|ClockIcon/)
  })

  it('includes crown icon for leadership', () => {
    expect(content).toMatch(/CrownIcon/)
  })

  it('includes alert triangle for warnings', () => {
    expect(content).toMatch(/AlertTriangle/)
  })
})
