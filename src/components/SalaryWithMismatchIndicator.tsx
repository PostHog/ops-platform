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
}

export function SalaryWithMismatchIndicator({
  totalSalary,
  benchmarkFactor,
  locationFactor,
  level,
  step,
  className = '',
  align = 'left',
}: SalaryWithMismatchIndicatorProps) {
  const expectedTotal =
    benchmarkFactor && locationFactor && level && step
      ? locationFactor * level * step * benchmarkFactor
      : null
  const isMismatch =
    expectedTotal !== null && Math.abs(totalSalary - expectedTotal) > 0.01

  const alignClass = align === 'right' ? 'justify-end' : 'justify-start'

  return (
    <div className={`flex items-center gap-1 ${alignClass} ${className}`}>
      <span>{formatCurrency(totalSalary)}</span>
      {isMismatch && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertCircle className="w-4 h-4 text-red-600 cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>
                Mismatch detected! Expected: {formatCurrency(expectedTotal!)},
                Actual: {formatCurrency(totalSalary)}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}
