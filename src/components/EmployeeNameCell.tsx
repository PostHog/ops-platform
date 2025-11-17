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
    const timeoutId = setTimeout(checkTruncation, 0)

    return () => clearTimeout(timeoutId)
  }, [notes, isExpanded])

  return (
    <div className="max-w-[300px] pl-2">
      <div className="font-bold text-sm">{name}</div>
      {notes && (
        <div className="text-xs text-gray-500 italic border-l-2 border-gray-200 pl-2 py-1 mt-1 mb-2">
          <div className="relative">
            <p
              ref={textRef}
              className={`whitespace-normal break-words ${isExpanded ? '' : 'line-clamp-2'}`}
            >
              {notes}
            </p>
            {isTruncated && !isExpanded && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsExpanded(true)
                }}
                className="absolute bottom-0 right-0 text-gray-500 font-semibold not-italic hover:text-blue-700 bg-gradient-to-l from-white from-50% via-white via-70% to-transparent pl-10"
              >
                read more
              </button>
            )}
          </div>
          {isExpanded && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(false)
              }}
              className="text-gray-500 hover:text-blue-700 mt-1 not-italic font-semibold"
            >
              read less
            </button>
          )}
        </div>
      )}
    </div>
  )
}
