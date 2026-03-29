import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('api/agents/chat route server functions', () => {
  const filePath = path.join(process.cwd(), 'src/routes/api/agents/chat.ts')
  const content = fs.readFileSync(filePath, 'utf-8')

  it('uses server handler pattern with POST method', () => {
    expect(content).toMatch(/server:\s*\{[\s\S]*?handlers:\s*\{[\s\S]*?POST:/)
  })

  it('authenticates via auth.api.getSession', () => {
    expect(content).toMatch(/auth\.api\.getSession/)
    expect(content).toMatch(/session\?\.user/)
  })

  it('enforces admin-only access via ROLES.ADMIN', () => {
    expect(content).toMatch(/session\.user\.role\s*!==\s*ROLES\.ADMIN/)
    expect(content).toMatch(/status:\s*403/)
  })

  it('creates Anthropic client with direct API baseURL', () => {
    expect(content).toMatch(/createAnthropic\(/)
    expect(content).toMatch(/https:\/\/api\.anthropic\.com\/v1/)
    expect(content).toMatch(/env\.ANTHROPIC_API_KEY/)
  })

  it('uses streamText from AI SDK with claude-sonnet model', () => {
    expect(content).toMatch(
      /import\s*\{[^}]*streamText[^}]*\}\s*from\s*['"]ai['"]/,
    )
    expect(content).toMatch(/streamText\(/)
    expect(content).toMatch(/claude-sonnet/)
  })

  it('registers tool definitions from agent tool-registry', () => {
    expect(content).toMatch(
      /import\s*\{[^}]*getToolsForAgent[^}]*\}\s*from\s*['"]@\/lib\/agents\/tool-registry['"]/,
    )
    expect(content).toMatch(/getToolsForAgent\(toolNames\)/)
  })

  it('saves messages to prisma.agentMessage and updates conversation', () => {
    expect(content).toMatch(/prisma\.agentMessage\.create/)
    expect(content).toMatch(/prisma\.agentConversation\.update/)
    expect(content).toMatch(/prisma\.agentConversation\.findFirst/)
  })

  it('returns a UI message stream response', () => {
    expect(content).toMatch(/toUIMessageStreamResponse\(\)/)
  })
})
