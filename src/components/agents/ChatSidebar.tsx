import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getConversations,
  deleteConversation,
} from '@/lib/agents/server-functions'
import { MessageSquare, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatSidebarProps {
  currentConversationId?: string
  onSelectConversation: (id: string | undefined) => void
}

export function ChatSidebar({
  currentConversationId,
  onSelectConversation,
}: ChatSidebarProps) {
  const queryClient = useQueryClient()

  const { data: conversations = [] } = useQuery({
    queryKey: ['agentConversations'],
    queryFn: getConversations,
  })

  const deleteConversationMutation = useMutation({
    mutationFn: (conversationId: string) =>
      deleteConversation({ data: { conversationId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agentConversations'] })
    },
  })

  const handleDelete = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Delete this conversation?')) {
      deleteConversationMutation.mutate(conversationId)
      if (currentConversationId === conversationId) {
        onSelectConversation(undefined)
      }
    }
  }

  const getConversationTitle = (conversation: (typeof conversations)[0]) => {
    const firstMessage = conversation.messages[0]
    if (firstMessage?.content) {
      return (
        firstMessage.content.slice(0, 50) +
        (firstMessage.content.length > 50 ? '…' : '')
      )
    }
    return 'New conversation'
  }

  return (
    <div className="flex h-full w-64 flex-col border-r bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white p-4">
        <button
          onClick={() => onSelectConversation(undefined)}
          className="flex w-full items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No conversations yet
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={cn(
                  'group flex w-full items-start gap-2 rounded-lg p-3 text-left transition-colors',
                  currentConversationId === conversation.id
                    ? 'bg-blue-100 text-blue-900'
                    : 'hover:bg-gray-100',
                )}
              >
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {getConversationTitle(conversation)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(conversation.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(conversation.id, e)}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                  title="Delete conversation"
                >
                  <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                </button>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
