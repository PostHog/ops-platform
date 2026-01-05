import { CheckCircle, X } from 'lucide-react'
import { useState, useRef, useLayoutEffect } from 'react'
import type { Prisma } from '@prisma/client'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type AshbyInterviewScore = Prisma.AshbyInterviewScoreGetPayload<{
  include: {
    interviewer: {
      select: {
        id: true
        email: true
        deelEmployee: {
          select: {
            name: true
          }
        }
      }
    }
  }
}>

interface AshbyInterviewScoreTimelineCardProps {
  score: AshbyInterviewScore
  lastTableItem?: boolean
}

const RATING_TEXT_COLORS: Record<number, string> = {
  4: 'text-green-700',
  3: 'text-lime-700',
  2: 'text-amber-700',
  1: 'text-red-700',
}

const ratingLabels: Record<number, string> = {
  1: 'Strong No',
  2: 'No',
  3: 'Yes',
  4: 'Strong Yes',
}

const isPositiveRating = (rating: number): boolean =>
  rating === 3 || rating === 4

function OptionalField({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  if (!value) return null

  const [isExpanded, setIsExpanded] = useState(false)
  const [isTruncated, setIsTruncated] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)

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
  }, [value, isExpanded])

  return (
    <div className="max-w-4xl">
      <p className="mb-1 text-sm font-bold text-gray-700">{label}</p>
      <div className="relative">
        <p
          ref={textRef}
          className={`text-sm whitespace-pre-line text-gray-500 italic ${
            isExpanded ? '' : 'line-clamp-3'
          }`}
        >
          {value}
        </p>
      </div>
      {isTruncated && !isExpanded && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded(true)
          }}
          className="mt-1 font-semibold text-gray-500 not-italic hover:text-blue-700"
        >
          show more
        </button>
      )}
      {isExpanded && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded(false)
          }}
          className="mt-1 font-semibold text-gray-500 not-italic hover:text-blue-700"
        >
          show less
        </button>
      )}
    </div>
  )
}

export function AshbyInterviewScoreTimelineCard({
  score,
  lastTableItem = false,
}: AshbyInterviewScoreTimelineCardProps) {
  const interviewerName =
    score.interviewer.deelEmployee?.name || score.interviewer.email
  const ratingLabel = ratingLabels[score.rating] || `Rating ${score.rating}`
  const isPositive = isPositiveRating(score.rating)

  return (
    <TooltipProvider>
      <div
        className={`border border-t-0 border-gray-200${lastTableItem ? 'rounded-b-md' : ''}`}
      >
        <div className="ml-8 flex flex-col gap-3 border-l-[3px] border-gray-200 px-4 py-2">
          <div>
            <h4
              className={`flex items-center gap-1.5 text-sm font-semibold ${RATING_TEXT_COLORS[score.rating] || 'text-gray-700'}`}
            >
              {isPositive ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <X className="h-4 w-4" />
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    Interview Score: {score.rating}/4 ({ratingLabel})
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Rating: {score.rating}/4 - {ratingLabel}
                  </p>
                </TooltipContent>
              </Tooltip>
              <span className="font-normal text-gray-500">
                {' '}
                - interviewed by {interviewerName}
              </span>
            </h4>
          </div>

          <OptionalField label="Feedback:" value={score.feedback || null} />
        </div>
      </div>
    </TooltipProvider>
  )
}
