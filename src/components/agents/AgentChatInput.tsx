import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import { useEffect, useRef, type ChangeEvent, FormEvent } from 'react'

interface AgentChatInputProps {
  input?: string
  onChange: (e: ChangeEvent<HTMLTextAreaElement> | ChangeEvent<HTMLInputElement>) => void
  onSubmit: (e: FormEvent) => void
  isLoading: boolean
  disabled?: boolean
  placeholder?: string
}

export function AgentChatInput({
  input = '',
  onChange,
  onSubmit,
  isLoading,
  disabled,
  placeholder = 'Type your message…',
}: AgentChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // Autofocus the input when component mounts or when it becomes enabled
    if (!disabled && !isLoading) {
      textareaRef.current?.focus()
    }
  }, [disabled, isLoading])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (input?.trim() && !isLoading && !disabled) {
        onSubmit(e as unknown as FormEvent)
      }
    }
  }

  return (
    <form onSubmit={onSubmit} className="border-t p-4">
      <div className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={input || ''}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading || disabled}
          className="flex-1 resize-none rounded-lg border border-gray-200 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
          rows={1}
          style={{ minHeight: '44px', maxHeight: '120px' }}
        />
        <Button
          type="submit"
          disabled={!input?.trim() || isLoading || disabled}
          size="icon"
          className="h-11 w-11 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="mt-2 text-xs text-gray-400">
        Press Enter to send, Shift+Enter for new line
      </p>
    </form>
  )
}
