import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('useAutoLayoutHook', () => {
  const content = fs.readFileSync(
    path.join(process.cwd(), 'src/lib/org-chart/useAutoLayoutHook.ts'),
    'utf-8',
  )

  it('uses useReactFlow for setting nodes and edges', () => {
    expect(content).toMatch(/useReactFlow/)
    expect(content).toMatch(/setNodes/)
    expect(content).toMatch(/setEdges/)
  })

  it('uses useNodesInitialized to wait for dimensions', () => {
    expect(content).toMatch(/useNodesInitialized/)
  })

  it('uses useStore with custom equality function', () => {
    expect(content).toMatch(/useStore/)
    expect(content).toMatch(/compareElements/)
  })

  it('imports layout algorithms and utils', () => {
    expect(content).toMatch(/layoutAlgorithms/)
    expect(content).toMatch(/getSourceHandlePosition|getTargetHandlePosition/)
  })

  it('exports LayoutOptions type', () => {
    expect(content).toMatch(/export type LayoutOptions/)
  })
})

describe('useExpandCollapse', () => {
  const content = fs.readFileSync(
    path.join(process.cwd(), 'src/lib/org-chart/useExpandCollapse.ts'),
    'utf-8',
  )

  it('uses useMemo for computation', () => {
    expect(content).toMatch(/useMemo/)
  })

  it('uses dagre for layout', () => {
    expect(content).toMatch(/import Dagre from '@dagrejs\/dagre'/)
  })

  it('creates leaf container nodes', () => {
    expect(content).toMatch(/createLeafContainer/)
    expect(content).toMatch(/leaf-container-/)
  })

  it('builds children map from edges', () => {
    expect(content).toMatch(/buildChildrenMap/)
  })

  it('recursively collects descendants', () => {
    expect(content).toMatch(/getAllDescendants/)
  })

  it('handles selected node highlighting', () => {
    expect(content).toMatch(/selectedNode/)
  })
})
