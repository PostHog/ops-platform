import type { UIMessage } from 'ai'
import { cn } from '@/lib/utils'
import MarkdownComponent from '@/lib/MarkdownComponent'
import { User, Bot } from 'lucide-react'

interface AgentChatMessageProps {
  message: UIMessage
}

export function AgentChatMessage({ message }: AgentChatMessageProps) {
  const isUser = message.role === 'user'

  // Extract text from parts array
  const textContent = message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('')

  return (
    <div
      className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600',
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Message content */}
      <div
        className={cn(
          'max-w-[80%] rounded-lg p-3',
          isUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900',
        )}
      >
        {textContent ? (
          <div
            className={cn(
              'prose prose-sm max-w-none',
              isUser && 'prose-invert',
            )}
          >
            <MarkdownComponent>{textContent}</MarkdownComponent>
          </div>
        ) : (
          <span className="italic text-gray-400">Processing…</span>
        )}
      </div>
    </div>
  )
}
