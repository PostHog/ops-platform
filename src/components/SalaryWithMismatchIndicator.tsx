import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatCurrency } from '@/lib/utils'
import { AlertCircle } from 'lucide-react'

interface SalaryWithMismatchIndicatorProps {
  totalSalary: number
  benchmarkFactor?: number
  locationFactor?: number
  level?: number
  step?: number
  className?: string
  align?: 'left' | 'right'
  totalSalaryLocal?: number
  actualSalaryLocal?: number
  localCurrency?: string
}

export function SalaryWithMismatchIndicator({
  totalSalary,
  benchmarkFactor,
  locationFactor,
  level,
  step,
  className = '',
  align = 'left',
  totalSalaryLocal,
  actualSalaryLocal,
  localCurrency,
}: SalaryWithMismatchIndicatorProps) {
  const expectedTotal =
    benchmarkFactor && locationFactor && level && step
      ? locationFactor * level * step * benchmarkFactor
      : null
  const isMismatch =
    expectedTotal !== null && Math.abs(totalSalary - expectedTotal) > 0.01

  const alignClass = align === 'right' ? 'justify-end' : 'justify-start'
  const hasLocalSalary = totalSalaryLocal !== undefined
  const showActualLocal =
    hasLocalSalary &&
    actualSalaryLocal !== undefined &&
    Math.abs(totalSalaryLocal - actualSalaryLocal) > 0.01

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-1 ${alignClass} ${className}`}>
        {hasLocalSalary ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help">{formatCurrency(totalSalary)}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                Local:{' '}
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: localCurrency ?? 'USD',
                }).format(totalSalaryLocal)}
                {showActualLocal && (
                  <>
                    {' '}
                    · Actual:{' '}
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: localCurrency ?? 'USD',
                    }).format(actualSalaryLocal)}
                  </>
                )}
              </p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span>{formatCurrency(totalSalary)}</span>
        )}
        {isMismatch && (
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertCircle className="h-4 w-4 cursor-help text-red-600" />
            </TooltipTrigger>
            <TooltipContent>
              <p>
                Mismatch detected! Expected: {formatCurrency(expectedTotal!)},
                Actual: {formatCurrency(totalSalary)}
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}
