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
    <div className="max-w-[300px] pl-4">
      <div className="text-sm font-bold">{name}</div>
      {notes && (
        <div className="mt-1 mb-2 ml-2 border-l-2 border-gray-200 py-1 pl-2 text-xs text-gray-500 italic">
          <div className="relative">
            <p
              ref={textRef}
              className={`break-words whitespace-normal ${isExpanded ? '' : 'line-clamp-2'}`}
            >
              {notes}
            </p>
            {isTruncated && !isExpanded && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsExpanded(true)
                }}
                className="absolute right-0 bottom-0 bg-gradient-to-l from-white from-50% via-white via-70% to-transparent pl-10 font-semibold text-gray-500 not-italic hover:text-blue-700"
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
              className="mt-1 font-semibold text-gray-500 not-italic hover:text-blue-700"
            >
              read less
            </button>
          )}
        </div>
      )}
    </div>
  )
}
