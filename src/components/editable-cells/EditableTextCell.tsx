import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface EditableTextCellProps {
  value: string
  onSave: (value: string) => Promise<void>
  multiline?: boolean
  placeholder?: string
  className?: string
}

export function EditableTextCell({
  value,
  onSave,
  multiline = false,
  placeholder = '',
  className,
}: EditableTextCellProps) {
  const [localValue, setLocalValue] = useState(value)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = async () => {
    setIsEditing(false)
    if (localValue === value) return

    setIsSaving(true)
    try {
      await onSave(localValue)
    } catch {
      setLocalValue(value)
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setLocalValue(value)
      setIsEditing(false)
    } else if (e.key === 'Enter' && !multiline) {
      handleSave()
    }
  }

  if (isEditing) {
    const commonProps = {
      value: localValue,
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => setLocalValue(e.target.value),
      onBlur: handleSave,
      onKeyDown: handleKeyDown,
      placeholder,
      disabled: isSaving,
      className: cn(
        'h-auto min-h-0 px-2 py-1 text-xs md:text-xs leading-normal',
        multiline && 'min-w-[200px]',
        className,
      ),
    }

    if (multiline) {
      return (
        <Textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          {...commonProps}
          rows={3}
        />
      )
    }

    return (
      <Input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        {...commonProps}
      />
    )
  }

  return (
    <div
      onClick={() => !isSaving && setIsEditing(true)}
      className={cn(
        'cursor-text rounded px-2 py-1 transition-colors hover:bg-gray-50',
        isSaving && 'pointer-events-none opacity-50',
        multiline && 'min-w-[200px] whitespace-pre-line',
        className,
      )}
    >
      {localValue || (
        <span className="text-gray-400">{placeholder || 'Click to edit'}</span>
      )}
    </div>
  )
}
