import type { UIMessage } from 'ai'
import { AgentChatMessage } from './AgentChatMessage'
import { Loader2 } from 'lucide-react'

interface AgentChatMessagesProps {
  messages: UIMessage[]
  isLoading: boolean
}

export function AgentChatMessages({
  messages,
  isLoading,
}: AgentChatMessagesProps) {
  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <AgentChatMessage key={message.id} message={message} />
      ))}
      {isLoading && (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Thinking…</span>
        </div>
      )}
    </div>
  )
}
