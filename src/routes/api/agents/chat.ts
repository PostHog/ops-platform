import { createFileRoute } from '@tanstack/react-router'
import {
  streamText,
  tool,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { auth } from '@/lib/auth'
import { ROLES } from '@/lib/consts'
import prisma from '@/db'
import { getToolsForAgent, isActionTool } from '@/lib/agents/tool-registry'
import type { ToolExecutionContext } from '@/lib/agents/types'
import { env } from '@/env'

// Create Anthropic client with API key (direct API, not gateway)
// Explicitly set baseURL to override the gateway env var
const anthropic = createAnthropic({
  apiKey: env.ANTHROPIC_API_KEY,
  baseURL: 'https://api.anthropic.com/v1',
})

export const Route = createFileRoute('/api/agents/chat')({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        // Authenticate
        const session = await auth.api.getSession({
          headers: request.headers,
        })

        if (!session?.user) {
          return new Response('Unauthorized', { status: 401 })
        }

        // Admin only
        if (session.user.role !== ROLES.ADMIN) {
          return new Response('Forbidden: Admin access required', {
            status: 403,
          })
        }

        const body = await request.json()

        const { conversationId, messages: rawMessages } = body as {
          conversationId: string
          messages: Array<{
            id: string
            role: 'user' | 'assistant'
            content?: string
            parts?: Array<{ type: string; text?: string }>
          }>
        }

        if (!conversationId) {
          return new Response('Missing conversationId', { status: 400 })
        }

        if (!rawMessages) {
          return new Response('Missing messages', { status: 400 })
        }

        // Normalize messages - convert content string to parts array if needed
        const clientMessages: UIMessage[] = rawMessages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          parts: msg.parts || (msg.content ? [{ type: 'text' as const, text: msg.content }] : []),
        }))

        // Get conversation with agent config
        const conversation = await prisma.agentConversation.findFirst({
          where: { id: conversationId, userId: session.user.id },
          include: {
            agent: { include: { tools: { where: { isEnabled: true } } } },
          },
        })

        if (!conversation) {
          return new Response('Conversation not found', { status: 404 })
        }

        // Use default system prompt if no agent is configured
        const systemPrompt = !conversation.agent
          ? `You are a helpful AI assistant for the Array ops platform. You have access to tools that let you:

- Read employee data, salaries, and organizational structure
- Analyze compensation scenarios
- Read and manage proposed hires
- View compensation benchmarks

Always be clear and concise in your responses. When using tools, ALWAYS explain what you're doing and what you found. After calling a tool and receiving results, you MUST provide a natural language response to the user summarizing the information.`
          : conversation.agent.systemPrompt

        // Extract the latest user message text for saving to DB
        const latestUserMessage = clientMessages
          .filter((m) => m.role === 'user')
          .pop()
        const userMessageText = latestUserMessage?.parts
          ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
          ?.map((p) => p.text)
          ?.join('') ?? ''

        if (userMessageText) {
          // Save user message to database
          await prisma.agentMessage.create({
            data: {
              conversationId,
              role: 'user',
              content: userMessageText,
            },
          })
        }

        // Get enabled tools - if no agent, use all tools
        const toolNames = !conversation.agent
          ? ['readEmployees', 'readSalaryHistory', 'readProposedHires', 'readOrgStructure', 'readCompensationBenchmarks']
          : conversation.agent.tools.map((t) => t.toolName)
        const toolDefinitions = getToolsForAgent(toolNames)

        // Create execution context
        const toolContext: ToolExecutionContext = {
          userId: session.user.id,
          userRole: session.user.role ?? null,
          userEmail: session.user.email,
          conversationId,
          agentId: conversation.agentId ?? 'default',
        }

        // Build AI SDK tools object
        const aiTools: Record<string, ReturnType<typeof tool>> = {}
        for (const toolDef of toolDefinitions) {
          aiTools[toolDef.name] = tool({
            description: toolDef.description,
            inputSchema: toolDef.parameters,
            execute: async (args) => {
              // Check if this is an action tool that requires confirmation
              if (isActionTool(toolDef.name)) {
                // Return a request for confirmation
                return {
                  __requiresConfirmation: true,
                  toolName: toolDef.name,
                  args,
                  message: `This action requires your confirmation before proceeding. Please confirm you want to execute: ${toolDef.name}`,
                }
              }
              // Non-action tools execute immediately
              return await toolDef.execute(args, toolContext)
            },
          })
        }

        // Ensure all messages have valid parts array and filter out empty messages
        const validatedMessages = clientMessages
          .filter((msg) => {
            // Keep messages that have parts with actual content
            if (!msg.parts || msg.parts.length === 0) return false
            const hasContent = msg.parts.some(
              (p) => p.type === 'text' && (p as { text?: string }).text?.trim()
            )
            return hasContent
          })
          .map((msg) => ({
            ...msg,
            parts: msg.parts || [],
          }))

        // Convert UI messages to model messages
        const modelMessages = await convertToModelMessages(validatedMessages)

        // Stream the response
        const result = streamText({
          model: anthropic('claude-sonnet-4-20250514'),
          system: systemPrompt,
          messages: modelMessages,
          tools: aiTools,
          stopWhen: stepCountIs(10),
          onFinish: async ({ text }) => {
            // Save assistant message
            await prisma.agentMessage.create({
              data: {
                conversationId,
                role: 'assistant',
                content: text,
              },
            })

            // Update conversation timestamp
            await prisma.agentConversation.update({
              where: { id: conversationId },
              data: { updatedAt: new Date() },
            })
          },
        })

        // Return UI message stream response (required for useChat with tools)
        return result.toUIMessageStreamResponse()
      },
    },
  },
})
