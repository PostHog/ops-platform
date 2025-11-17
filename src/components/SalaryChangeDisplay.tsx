import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatCurrency } from '@/lib/utils'

interface SalaryChangeDisplayProps {
  changePercentage: number
  changeAmount: number
  totalSalary: number
  timestamp?: Date
  showDate?: boolean
  size?: 'sm' | 'lg'
  benchmarkFactor?: number
  locationFactor?: number
  level?: number
  step?: number
}

export function SalaryChangeDisplay({
  changePercentage,
  changeAmount,
  totalSalary,
  timestamp,
  showDate = false,
  size = 'sm',
  benchmarkFactor,
  locationFactor,
  level,
  step,
}: SalaryChangeDisplayProps) {
  const expectedTotal =
    benchmarkFactor && locationFactor && level && step
      ? locationFactor * level * step * benchmarkFactor
      : null
  const isMismatch =
    expectedTotal !== null && Math.abs(totalSalary - expectedTotal) > 0.01

  const textSize = size === 'lg' ? 'text-xl' : 'text-sm'

  const formatDate = (date: Date) => {
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const diffWeeks = Math.floor(diffDays / 7)
    const diffMonths = Math.floor(diffDays / 30)

    if (diffDays === 0) return 'today'
    if (diffDays === 1) return '1 day ago'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffWeeks === 1) return '1 week ago'
    if (diffWeeks < 4) return `${diffWeeks} weeks ago`
    if (diffMonths === 1) return '1 month ago'
    if (diffMonths < 12) return `${diffMonths} months ago`
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-1">
        <div className={`flex items-center gap-2 ${textSize}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={`font-bold cursor-help ${
                  changePercentage > 0
                    ? 'text-green-600'
                    : changePercentage < 0
                      ? 'text-red-600'
                      : ''
                }`}
              >
                {changePercentage >= 0 ? '+' : ''}
                {(changePercentage * 100).toFixed(2)}%
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Change: {formatCurrency(changeAmount)}</p>
            </TooltipContent>
          </Tooltip>
          <span className="text-gray-400">·</span>
          {isMismatch ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-red-600">
                  {formatCurrency(totalSalary)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Mismatch detected! Expected: {formatCurrency(expectedTotal!)},
                  Actual: {formatCurrency(totalSalary)}
                </p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-gray-700">{formatCurrency(totalSalary)}</span>
          )}
        </div>
        {showDate && timestamp && (
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {formatDate(timestamp)}
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
