import { dataAccessTools } from './tools/data-access'
import { computationTools } from './tools/computation'
import { actionTools } from './tools/actions'
import type { ToolDefinition } from './types'

export const toolRegistry = {
  ...dataAccessTools,
  ...computationTools,
  ...actionTools,
} as const

export type ToolName = keyof typeof toolRegistry

export const allToolNames = Object.keys(toolRegistry) as ToolName[]

export function getToolsForAgent(
  enabledTools: string[],
): Array<ToolDefinition> {
  return enabledTools
    .filter((name) => name in toolRegistry)
    .map((name) => toolRegistry[name as ToolName])
}

export function getToolByName(name: string): ToolDefinition | undefined {
  return toolRegistry[name as ToolName]
}

export function isActionTool(name: string): boolean {
  const tool = getToolByName(name)
  return tool?.requiresConfirmation === true
}
