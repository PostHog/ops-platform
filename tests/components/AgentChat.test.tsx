import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import * as fs from 'fs'
import * as path from 'path'
import { render, screen, fireEvent } from '../helpers/render'

// ─── Structural tests for AgentChat (too many deps to mock practically) ─────

const agentChatContent = fs.readFileSync(
  path.join(process.cwd(), 'src/components/agents/AgentChat.tsx'),
  'utf-8',
)

describe('AgentChat (structural)', () => {
  it('imports AgentChatMessages and AgentChatInput', () => {
    expect(agentChatContent).toContain('import { AgentChatMessages }')
    expect(agentChatContent).toContain('import { AgentChatInput }')
  })

  it('uses useChat hook from ai-sdk', () => {
    expect(agentChatContent).toContain(
      "import { useChat } from '@ai-sdk/react'",
    )
    expect(agentChatContent).toContain('useChat(')
  })

  it('creates a DefaultChatTransport with the correct API endpoint', () => {
    expect(agentChatContent).toContain("api: '/api/agents/chat'")
    expect(agentChatContent).toContain('DefaultChatTransport')
  })

  it('prevents sending when input is empty or no conversationId', () => {
    expect(agentChatContent).toContain(
      'if (!input.trim() || !conversationId) return',
    )
  })

  it('clears input after sending a message', () => {
    expect(agentChatContent).toContain("setInput('')")
  })

  it('displays the initial prompt when there are no messages', () => {
    expect(agentChatContent).toContain(
      'agent.initialPrompt && messages.length === 0',
    )
  })

  it('renders an error display when error is present', () => {
    expect(agentChatContent).toContain('{error && (')
    expect(agentChatContent).toContain('error.message')
  })

  it('syncs conversation messages from server into chat state', () => {
    expect(agentChatContent).toContain('conversation?.messages')
    expect(agentChatContent).toContain('setMessages(')
  })
})

// ─── AgentChatInput (renderable with mocks) ─────────────────────────────────

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    disabled,
    ...props
  }: {
    children: React.ReactNode
    disabled?: boolean
    [key: string]: unknown
  }) => (
    <button disabled={disabled} {...props}>
      {children}
    </button>
  ),
}))

vi.mock('lucide-react', () => ({
  Send: () => <svg data-testid="send-icon" />,
  Loader2: () => <svg data-testid="loader-icon" />,
  Bot: () => <svg data-testid="bot-icon" />,
  User: () => <svg data-testid="user-icon" />,
}))

import { AgentChatInput } from '@/components/agents/AgentChatInput'

describe('AgentChatInput', () => {
  it('renders a textarea with the provided placeholder', () => {
    const onChange = vi.fn()
    const onSubmit = vi.fn()
    render(
      <AgentChatInput
        input=""
        onChange={onChange}
        onSubmit={onSubmit}
        isLoading={false}
        placeholder="Ask something…"
      />,
    )
    const textarea = screen.getByPlaceholderText('Ask something…')
    expect(textarea).toBeDefined()
  })

  it('disables textarea when isLoading is true', () => {
    render(
      <AgentChatInput
        input=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={true}
      />,
    )
    const textarea = screen.getByPlaceholderText('Type your message…')
    expect((textarea as HTMLTextAreaElement).disabled).toBe(true)
  })

  it('disables textarea when disabled prop is true', () => {
    render(
      <AgentChatInput
        input=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={false}
        disabled={true}
      />,
    )
    const textarea = screen.getByPlaceholderText('Type your message…')
    expect((textarea as HTMLTextAreaElement).disabled).toBe(true)
  })

  it('calls onSubmit when the form is submitted', () => {
    const onSubmit = vi.fn((e) => e.preventDefault())
    render(
      <AgentChatInput
        input="hello"
        onChange={vi.fn()}
        onSubmit={onSubmit}
        isLoading={false}
      />,
    )
    const form = screen
      .getByPlaceholderText('Type your message…')
      .closest('form')!
    fireEvent.submit(form)
    expect(onSubmit).toHaveBeenCalled()
  })

  it('shows helper text about Enter and Shift+Enter', () => {
    render(
      <AgentChatInput
        input=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={false}
      />,
    )
    expect(
      screen.getByText('Press Enter to send, Shift+Enter for new line'),
    ).toBeDefined()
  })
})

// ─── AgentChatMessages (renderable with mocks) ──────────────────────────────

vi.mock('@/lib/MarkdownComponent', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}))

import { AgentChatMessages } from '@/components/agents/AgentChatMessages'
import type { UIMessage } from 'ai'

const makeMessage = (
  id: string,
  role: 'user' | 'assistant',
  text: string,
): UIMessage => ({
  id,
  role,
  parts: [{ type: 'text' as const, text }],
})

describe('AgentChatMessages', () => {
  it('renders each message', () => {
    const messages = [
      makeMessage('1', 'user', 'Hello'),
      makeMessage('2', 'assistant', 'Hi there'),
    ]
    render(<AgentChatMessages messages={messages} isLoading={false} />)
    expect(screen.getByText('Hello')).toBeDefined()
    expect(screen.getByText('Hi there')).toBeDefined()
  })

  it('shows a loading indicator when isLoading is true', () => {
    render(<AgentChatMessages messages={[]} isLoading={true} />)
    expect(screen.getByText('Thinking…')).toBeDefined()
  })

  it('does not show loading indicator when isLoading is false', () => {
    render(<AgentChatMessages messages={[]} isLoading={false} />)
    expect(screen.queryByText('Thinking…')).toBeNull()
  })
})

// ─── AgentChatMessage structural ────────────────────────────────────────────

const agentChatMessageContent = fs.readFileSync(
  path.join(process.cwd(), 'src/components/agents/AgentChatMessage.tsx'),
  'utf-8',
)

describe('AgentChatMessage (structural)', () => {
  it('shows Processing text when there is no text content', () => {
    expect(agentChatMessageContent).toContain('Processing…')
  })

  it('differentiates user vs assistant styling', () => {
    expect(agentChatMessageContent).toContain(
      "isUser ? 'flex-row-reverse' : 'flex-row'",
    )
  })
})
