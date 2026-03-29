import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { defineTool } from '@/lib/agents/types'
import {
  allToolNames,
  getToolsForAgent,
  getToolByName,
  isActionTool,
} from '@/lib/agents/tool-registry'

// ─── defineTool ─────────────────────────────────────────────────────────────

describe('defineTool', () => {
  it('returns the same tool definition passed in', () => {
    const tool = defineTool({
      name: 'test',
      description: 'A test tool',
      parameters: z.object({ x: z.number() }),
      execute: async () => 'result',
    })
    expect(tool.name).toBe('test')
    expect(tool.description).toBe('A test tool')
  })

  it('preserves requiresConfirmation flag', () => {
    const tool = defineTool({
      name: 'action',
      description: 'An action tool',
      parameters: z.object({}),
      requiresConfirmation: true,
      execute: async () => {},
    })
    expect(tool.requiresConfirmation).toBe(true)
  })
})

// ─── allToolNames ───────────────────────────────────────────────────────────

describe('allToolNames', () => {
  it('is a non-empty array of strings', () => {
    expect(allToolNames.length).toBeGreaterThan(0)
    for (const name of allToolNames) {
      expect(typeof name).toBe('string')
    }
  })
})

// ─── getToolsForAgent ───────────────────────────────────────────────────────

describe('getToolsForAgent', () => {
  it('returns tools matching the provided names', () => {
    const tools = getToolsForAgent([allToolNames[0]])
    expect(tools).toHaveLength(1)
    expect(tools[0].name).toBe(allToolNames[0])
  })

  it('filters out unknown tool names', () => {
    const tools = getToolsForAgent(['nonexistent_tool', allToolNames[0]])
    expect(tools).toHaveLength(1)
  })

  it('returns empty array for empty input', () => {
    expect(getToolsForAgent([])).toEqual([])
  })
})

// ─── getToolByName ──────────────────────────────────────────────────────────

describe('getToolByName', () => {
  it('returns a tool for a valid name', () => {
    const tool = getToolByName(allToolNames[0])
    expect(tool).toBeDefined()
    expect(tool!.name).toBe(allToolNames[0])
  })

  it('returns undefined for unknown name', () => {
    expect(getToolByName('nonexistent')).toBeUndefined()
  })
})

// ─── isActionTool ───────────────────────────────────────────────────────────

describe('isActionTool', () => {
  it('returns false for unknown tool names', () => {
    expect(isActionTool('nonexistent')).toBe(false)
  })

  it('returns true for tools with requiresConfirmation', () => {
    const actionTool = allToolNames.find((name) => {
      const tool = getToolByName(name)
      return tool?.requiresConfirmation === true
    })
    if (actionTool) {
      expect(isActionTool(actionTool)).toBe(true)
    }
  })

  it('returns false for tools without requiresConfirmation', () => {
    const nonActionTool = allToolNames.find((name) => {
      const tool = getToolByName(name)
      return !tool?.requiresConfirmation
    })
    if (nonActionTool) {
      expect(isActionTool(nonActionTool)).toBe(false)
    }
  })
})
