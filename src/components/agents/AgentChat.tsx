import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useState, useRef, useEffect, type ChangeEvent, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AgentChatMessages } from './AgentChatMessages'
import { AgentChatInput } from './AgentChatInput'
import { getConversationMessages } from '@/lib/agents/server-functions'

interface AgentConfig {
  id: string
  name: string
  slug: string
  description?: string
  systemPrompt: string
  initialPrompt?: string
}

interface AgentChatProps {
  agent: AgentConfig
  conversationId?: string
  onConversationCreated?: (id: string) => void
}

export function AgentChat({
  agent,
  conversationId: propConversationId,
  onConversationCreated,
}: AgentChatProps) {
  const queryClient = useQueryClient()
  const [conversationId, setConversationId] = useState(propConversationId)

  // Sync conversationId from props
  useEffect(() => {
    if (propConversationId !== conversationId) {
      setConversationId(propConversationId)
    }
  }, [propConversationId])
  const [input, setInput] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load existing messages
  const { data: conversation } = useQuery({
    queryKey: ['agentConversation', conversationId],
    queryFn: () =>
      getConversationMessages({ data: { conversationId: conversationId! } }),
    enabled: !!conversationId,
  })

  // Create transport instance - always create it since we always have conversationId now
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/agents/chat',
        prepareSendMessagesRequest: async (options) => {
          return {
            ...options,
            body: {
              messages: options.messages,
              conversationId,
            },
          }
        },
      }),
    [conversationId],
  )

  // AI SDK useChat hook
  const chatHook = useChat({
    transport,
    initialMessages:
      conversation?.messages?.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        parts: [{ type: 'text' as const, text: m.content }],
      })) ?? [],
    onFinish: () => {
      queryClient.invalidateQueries({ queryKey: ['agentConversations'] })
    },
  })

  const messages = chatHook.messages
  const sendMessage = chatHook.sendMessage
  const setMessages = chatHook.setMessages
  const error = chatHook.error
  const isLoading = chatHook.isLoading

  const handleInputChange = (
    e: ChangeEvent<HTMLTextAreaElement> | ChangeEvent<HTMLInputElement>,
  ) => {
    setInput(e.target.value)
  }

  // Sync messages from server when conversation loads
  useEffect(() => {
    if (conversation?.messages && setMessages) {
      setMessages(
        conversation.messages.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          parts: [{ type: 'text' as const, text: m.content }],
        })),
      )
    }
  }, [conversation?.messages, setMessages])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Check for pending confirmations in messages
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === 'assistant' && lastMessage.content) {
      // Check if there's a confirmation request in content
      const content = lastMessage.content
      if (content.includes('__requiresConfirmation')) {
        try {
          const match = content.match(
            /__requiresConfirmation.*?toolName.*?"([^"]+)".*?args.*?(\{[^}]+\})/s,
          )
          if (match) {
            setPendingAction({
              toolName: match[1],
              args: JSON.parse(match[2]),
            })
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || !conversationId) return

    sendMessage?.({ text: input })
    setInput('')
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">{agent.name}</h2>
        {agent.description && (
          <p className="text-sm text-gray-500">{agent.description}</p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {agent.initialPrompt && messages.length === 0 && (
          <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
            {agent.initialPrompt}
          </div>
        )}
        <AgentChatMessages messages={messages} isLoading={isLoading} />
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <AgentChatInput
        input={input}
        onChange={handleInputChange}
        onSubmit={handleSend}
        isLoading={isLoading}
        disabled={!conversationId}
        placeholder="Type your message…"
      />

      {/* Error display */}
      {error && (
        <div className="border-t border-red-200 bg-red-50 p-4 text-red-600">
          {error.message}
        </div>
      )}
    </div>
  )
}
