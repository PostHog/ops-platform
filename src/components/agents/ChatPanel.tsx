import { useAtom } from 'jotai'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Plus, Clock, Trash2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { chatSidebarOpenAtom } from '@/atoms'
import { AgentChat } from './AgentChat'
import {
  getConversations,
  createConversation,
  deleteConversation,
} from '@/lib/agents/server-functions'

const DEFAULT_AGENT = {
  id: 'default',
  name: 'AI Assistant',
  slug: 'default',
  description: 'Your AI assistant with access to all tools',
  systemPrompt: '',
  initialPrompt:
    'Hi! I can help you with employee data, compensation analysis, and more. What would you like to know?',
}

export function ChatPanel() {
  const [open, setOpen] = useAtom(chatSidebarOpenAtom)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [historyOpen, setHistoryOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: conversations = [] } = useQuery({
    queryKey: ['agentConversations'],
    queryFn: getConversations,
    enabled: open,
  })

  const createConversationMutation = useMutation({
    mutationFn: () => createConversation({ data: {} }),
    onSuccess: (conversation) => {
      setConversationId(conversation.id)
      queryClient.invalidateQueries({ queryKey: ['agentConversations'] })
    },
  })

  const deleteConversationMutation = useMutation({
    mutationFn: (id: string) =>
      deleteConversation({ data: { conversationId: id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agentConversations'] })
    },
  })

  // Auto-create a conversation when the panel opens without one
  useEffect(() => {
    if (open && !conversationId && !createConversationMutation.isPending) {
      createConversationMutation.mutate()
    }
  }, [open, conversationId, createConversationMutation.isPending])

  const handleNewChat = () => {
    setConversationId(undefined)
    createConversationMutation.mutate()
  }

  const handleSelectConversation = (id: string) => {
    setConversationId(id)
    setHistoryOpen(false)
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteConversationMutation.mutate(id)
    if (conversationId === id) {
      setConversationId(undefined)
      createConversationMutation.mutate()
    }
  }

  const getConversationTitle = (conversation: (typeof conversations)[0]) => {
    const firstMessage = conversation.messages[0]
    if (firstMessage?.content) {
      return (
        firstMessage.content.slice(0, 40) +
        (firstMessage.content.length > 40 ? '…' : '')
      )
    }
    return 'New conversation'
  }

  const currentTitle = conversations.find((c) => c.id === conversationId)
    ? getConversationTitle(conversations.find((c) => c.id === conversationId)!)
    : 'New conversation'

  if (!open) return null

  return (
    <div className="fixed top-10 right-0 bottom-0 z-40 flex w-[480px] flex-col border-l border-gray-200 bg-white shadow-lg">
      {/* Compact top bar */}
      <div className="flex items-center gap-1 border-b px-2 py-1.5">
        <div className="min-w-0 flex-1 truncate px-1 text-sm font-medium">
          {currentTitle}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 shrink-0 p-0"
          onClick={() => setOpen(false)}
          title="Close panel"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 shrink-0 p-0"
          onClick={handleNewChat}
          title="New chat"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
        <Popover open={historyOpen} onOpenChange={setHistoryOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 shrink-0 p-0"
              title="Chat history"
            >
              <Clock className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-0">
            <div className="max-h-80 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No conversations yet
                </div>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => handleSelectConversation(conversation.id)}
                    className={cn(
                      'group flex w-full items-center gap-2 px-3 py-2 text-left transition-colors',
                      conversationId === conversation.id
                        ? 'bg-blue-50 text-blue-900'
                        : 'hover:bg-gray-50',
                    )}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">
                        {getConversationTitle(conversation)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(conversation.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(conversation.id, e)}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-400 hover:text-red-600" />
                    </button>
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-hidden">
        {conversationId ? (
          <AgentChat agent={DEFAULT_AGENT} conversationId={conversationId} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            Creating conversation…
          </div>
        )}
      </div>
    </div>
  )
}
