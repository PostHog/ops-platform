import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatCurrency } from '@/lib/utils'
import { SalaryWithMismatchIndicator } from './SalaryWithMismatchIndicator'

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
  totalSalaryLocal?: number
  actualSalaryLocal?: number
  localCurrency?: string
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
  totalSalaryLocal,
  actualSalaryLocal,
  localCurrency,
}: SalaryChangeDisplayProps) {
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
                className={`cursor-help font-bold ${
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
          <SalaryWithMismatchIndicator
            totalSalary={totalSalary}
            benchmarkFactor={benchmarkFactor}
            locationFactor={locationFactor}
            level={level}
            step={step}
            className="text-gray-700"
            totalSalaryLocal={totalSalaryLocal}
            actualSalaryLocal={actualSalaryLocal}
            localCurrency={localCurrency}
          />
        </div>
        {showDate && timestamp && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <svg
              className="h-3 w-3"
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
