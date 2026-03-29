import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('org-chart algorithms', () => {
  const content = fs.readFileSync(
    path.join(process.cwd(), 'src/lib/org-chart/algorithms.ts'),
    'utf-8',
  )

  it('exports a default layout function', () => {
    expect(content).toMatch(/export default elkLayout/)
  })

  it('uses elkjs for layout computation', () => {
    expect(content).toMatch(/import Elk/)
    expect(content).toMatch(/elk\.layout/)
  })

  it('uses mrtree algorithm', () => {
    expect(content).toMatch(/elk\.algorithm.*mrtree/)
  })

  it('maps direction TB to DOWN', () => {
    expect(content).toMatch(/case 'TB':\s*\n\s*return 'DOWN'/)
  })

  it('maps direction LR to RIGHT', () => {
    expect(content).toMatch(/case 'LR':\s*\n\s*return 'RIGHT'/)
  })

  it('maps direction BT to UP', () => {
    expect(content).toMatch(/case 'BT':\s*\n\s*return 'UP'/)
  })

  it('maps direction RL to LEFT', () => {
    expect(content).toMatch(/case 'RL':\s*\n\s*return 'LEFT'/)
  })

  it('exports Direction type', () => {
    expect(content).toMatch(/export type Direction/)
  })

  it('exports LayoutAlgorithm type', () => {
    expect(content).toMatch(/export type LayoutAlgorithm/)
  })

  it('preserves edges unchanged in output', () => {
    expect(content).toMatch(/return \{ nodes: nextNodes, edges \}/)
  })
})
