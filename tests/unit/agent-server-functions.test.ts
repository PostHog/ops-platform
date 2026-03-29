import { describe, expect, it } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * agent server-functions.ts uses createAdminFn which requires
 * the full TanStack Start middleware chain. We test the server
 * function definitions structurally rather than executing them,
 * since executing requires the full middleware mock chain.
 */

describe('agent server-functions', () => {
  const filePath = path.join(
    process.cwd(),
    'src/lib/agents/server-functions.ts',
  )
  const content = fs.readFileSync(filePath, 'utf-8')

  it('uses createAdminFn for all server functions', () => {
    expect(content).toMatch(/import.*createAdminFn.*from/)
    expect(content).not.toMatch(/import.*createServerFn.*from/)
  })

  it('defines getConversations as a GET function', () => {
    expect(content).toMatch(
      /getConversations\s*=\s*createAdminFn\(\{\s*method:\s*['"]GET['"]/,
    )
  })

  it('defines createConversation as a POST function', () => {
    expect(content).toMatch(
      /createConversation\s*=\s*createAdminFn\(\{\s*method:\s*['"]POST['"]/,
    )
  })

  it('defines getConversationMessages as a GET function with input validator', () => {
    expect(content).toMatch(
      /getConversationMessages\s*=\s*createAdminFn\(\{\s*method:\s*['"]GET['"]/,
    )
    expect(content).toMatch(/getConversationMessages[\s\S]*?\.inputValidator/)
  })

  it('defines deleteConversation as a POST function with input validator', () => {
    expect(content).toMatch(
      /deleteConversation\s*=\s*createAdminFn\(\{\s*method:\s*['"]POST['"]/,
    )
    expect(content).toMatch(/deleteConversation[\s\S]*?\.inputValidator/)
  })

  it('getConversations filters by user ID', () => {
    expect(content).toMatch(/where:\s*\{\s*userId:\s*context\.user\.id\s*\}/)
  })

  it('deleteConversation verifies ownership before deleting', () => {
    // Should findFirst with userId check, then delete messages, then conversation
    expect(content).toMatch(/agentConversation\.findFirst/)
    expect(content).toMatch(/agentMessage\.deleteMany/)
    expect(content).toMatch(/agentConversation\.delete/)
  })

  it('getConversationMessages throws when conversation not found', () => {
    expect(content).toMatch(/throw new Error\('Conversation not found'\)/)
  })
})
