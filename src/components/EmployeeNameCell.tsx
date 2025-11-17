import { useState, useRef, useLayoutEffect } from 'react'

interface EmployeeNameCellProps {
  name: string
  notes?: string | null
}

export function EmployeeNameCell({ name, notes }: EmployeeNameCellProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isTruncated, setIsTruncated] = useState(false)
  const textRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const checkTruncation = () => {
      if (textRef.current) {
        const element = textRef.current
        setIsTruncated(element.scrollHeight > element.clientHeight)
      }
    }

    checkTruncation()
    // Also check after a brief delay to ensure styles are applied
    const timeoutId = setTimeout(checkTruncation, 0)

    return () => clearTimeout(timeoutId)
  }, [notes, isExpanded])

  return (
    <div className="max-w-[300px]">
      <div className="font-bold">{name}</div>
      {notes && (
        <div className="text-xs text-gray-500 italic">
          <div
            ref={textRef}
            className={isExpanded ? '' : 'line-clamp-2'}
          >
            {notes}
          </div>
          {isTruncated && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(!isExpanded)
              }}
              className="text-blue-500 hover:text-blue-700 mt-1"
            >
              {isExpanded ? 'read less' : 'read more'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
