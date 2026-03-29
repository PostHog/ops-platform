import { describe, expect, it } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// ─── ChatPanel (structural — heavy deps: jotai atoms, mutations, Popover) ───

const chatPanelContent = fs.readFileSync(
  path.join(process.cwd(), 'src/components/agents/ChatPanel.tsx'),
  'utf-8',
)

describe('ChatPanel (structural)', () => {
  it('imports and uses the chatSidebarOpenAtom', () => {
    expect(chatPanelContent).toContain(
      "import { chatSidebarOpenAtom } from '@/atoms'",
    )
    expect(chatPanelContent).toContain('useAtom(chatSidebarOpenAtom)')
  })

  it('returns null when not open', () => {
    expect(chatPanelContent).toContain('if (!open) return null')
  })

  it('defines a DEFAULT_AGENT constant with expected fields', () => {
    expect(chatPanelContent).toContain("id: 'default'")
    expect(chatPanelContent).toContain("name: 'AI Assistant'")
    expect(chatPanelContent).toContain("slug: 'default'")
    expect(chatPanelContent).toContain('systemPrompt:')
    expect(chatPanelContent).toContain('initialPrompt:')
  })

  it('auto-creates a conversation when panel opens without one', () => {
    expect(chatPanelContent).toContain(
      'if (open && !conversationId && !createConversationMutation.isPending)',
    )
    expect(chatPanelContent).toContain('createConversationMutation.mutate()')
  })

  it('renders AgentChat when conversationId is set', () => {
    expect(chatPanelContent).toContain(
      '<AgentChat agent={DEFAULT_AGENT} conversationId={conversationId} />',
    )
  })

  it('shows a "Creating conversation" message when no conversationId', () => {
    expect(chatPanelContent).toContain('Creating conversation…')
  })

  it('has close, new-chat, and history buttons', () => {
    expect(chatPanelContent).toContain('title="Close panel"')
    expect(chatPanelContent).toContain('title="New chat"')
    expect(chatPanelContent).toContain('title="Chat history"')
  })

  it('truncates conversation titles to 40 characters', () => {
    expect(chatPanelContent).toContain('firstMessage.content.slice(0, 40)')
  })
})

// ─── ChatSidebar (structural — uses mutations, confirm dialog) ──────────────

const chatSidebarContent = fs.readFileSync(
  path.join(process.cwd(), 'src/components/agents/ChatSidebar.tsx'),
  'utf-8',
)

describe('ChatSidebar (structural)', () => {
  it('fetches conversations with the correct query key', () => {
    expect(chatSidebarContent).toContain("queryKey: ['agentConversations']")
    expect(chatSidebarContent).toContain('queryFn: getConversations')
  })

  it('calls onSelectConversation(undefined) for new chat', () => {
    expect(chatSidebarContent).toContain('onSelectConversation(undefined)')
  })

  it('confirms before deleting a conversation', () => {
    expect(chatSidebarContent).toContain("confirm('Delete this conversation?')")
  })

  it('truncates conversation titles to 50 characters', () => {
    expect(chatSidebarContent).toContain('firstMessage.content.slice(0, 50)')
  })

  it('shows "No conversations yet" when list is empty', () => {
    expect(chatSidebarContent).toContain('No conversations yet')
  })

  it('has a New Chat button and a delete button per conversation', () => {
    expect(chatSidebarContent).toContain('New Chat')
    expect(chatSidebarContent).toContain('title="Delete conversation"')
  })

  it('stops propagation on delete click to avoid selecting', () => {
    expect(chatSidebarContent).toContain('e.stopPropagation()')
  })
})
