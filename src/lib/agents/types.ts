import { z } from 'zod'

export interface ToolExecutionContext {
  userId: string
  userRole: string | null
  userEmail: string
  conversationId: string
  agentId: string
}

export interface ToolDefinition<TParams extends z.ZodType = z.ZodType> {
  name: string
  description: string
  parameters: TParams
  requiresConfirmation?: boolean
  execute: (
    params: z.infer<TParams>,
    context: ToolExecutionContext,
  ) => Promise<unknown>
}

export function defineTool<TParams extends z.ZodType>(
  tool: ToolDefinition<TParams>,
): ToolDefinition<TParams> {
  return tool
}
