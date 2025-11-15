import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCurrency } from '@/lib/utils'
import { MoreVertical, Trash2 } from 'lucide-react'
import type { Salary } from '@prisma/client'
import { TimelineItemBadge } from './TimelineItemBadge'

interface SalaryHistoryCardProps {
  salary: Salary
  isAdmin: boolean
  onDelete?: (salaryId: string) => Promise<void>
}

export function SalaryHistoryCard({
  salary,
  isAdmin,
  onDelete,
}: SalaryHistoryCardProps) {
  const date = new Date(salary.timestamp)
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const expectedTotal =
    salary.locationFactor * salary.level * salary.step * salary.benchmarkFactor
  const isMismatch = Math.abs(salary.totalSalary - expectedTotal) > 0.01

  const hoursSinceCreation =
    (Date.now() - salary.timestamp.getTime()) / (1000 * 60 * 60)
  const isDeletable = hoursSinceCreation <= 24

  return (
    <div className="bg-white max-w-3xl">
      <div className="border rounded-lg p-4">
        <div className="flex justify-between items-start mb-2">
          <TimelineItemBadge type="salary" />
          <div className="flex">
            <p className="text-xs text-gray-500">{formattedDate}</p>
            {isAdmin && isDeletable && onDelete && (
              <div className="-mt-2 -mr-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 ml-2"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => onDelete(salary.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-between mb-2">
          <div>
            {/* salary change */}
            <div className="flex items-center gap-2 text-xl">
              <span
                className={`font-bold ${salary.changePercentage > 0 ? 'text-green-600' : salary.changePercentage < 0 ? 'text-red-600' : ''}`}
              >
                {salary.changePercentage >= 0 ? '+' : ''}
                {(salary.changePercentage * 100).toFixed(2)}%
              </span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-700">
                {formatCurrency(salary.changeAmount)}
              </span>
            </div>
            {/* total salary */}
            <div
              className={`font-semibold mb-1 ${isMismatch ? 'text-red-600' : ''}`}
              title={
                isMismatch
                  ? `Mismatch detected! Expected: ${formatCurrency(expectedTotal)}, Actual: ${formatCurrency(salary.totalSalary)}`
                  : ''
              }
            >
              {formatCurrency(salary.totalSalary)}{' '}
              <span className="font-normal text-sm text-gray-600">
                total salary
              </span>
            </div>
          </div>
          {/* level / step */}
          <div className="flex justify-between items-start">
            <div className="flex gap-2">
              <div className="flex justify-end gap-2">
                <div>
                  <div className="text-2xl font-bold">
                    {salary.level}.{Math.floor((salary.step - 1) / 3)}
                  </div>
                  <div className="text-xs text-gray-500 text-center">level</div>
                </div>
                <div className="text-2xl text-gray-300">/</div>
                <div>
                  <div className="text-2xl font-bold">{salary.step}</div>
                  <div className="text-xs text-gray-500 text-center">step</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-2 flex">
          <div className="text-sm font-semibold">
            {salary.benchmark} ({salary.benchmarkFactor})
          </div>
          <div className="text-sm text-gray-600 ml-1">
            <span className="italic">in</span> {salary.area}, {salary.country} (
            {salary.locationFactor})
          </div>
        </div>

        {salary.notes && isAdmin && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md border-l-4 border-gray-300">
            <p className="text-sm mb-2">Notes:</p>
            <div className="text-sm italic text-gray-700 whitespace-pre-line">
              {salary.notes}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
