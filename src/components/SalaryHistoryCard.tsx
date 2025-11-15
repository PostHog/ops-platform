import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCurrency } from '@/lib/utils'
import { months } from '@/routes'
import { MoreVertical, Trash2 } from 'lucide-react'
import type { Salary } from '@prisma/client'

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
  const timeAgo = (() => {
    const now = new Date()
    const diffMonths =
      (now.getFullYear() - date.getFullYear()) * 12 +
      (now.getMonth() - date.getMonth())

    if (diffMonths === 0) return 'This month'
    if (diffMonths === 1) return '1 month ago'
    if (diffMonths < 12) return `${diffMonths} months ago`

    const years = Math.floor(diffMonths / 12)
    const remainingMonths = diffMonths % 12
    if (remainingMonths === 0) {
      return years === 1 ? '1 year ago' : `${years} years ago`
    }
    return `${years} year${years > 1 ? 's' : ''} ${remainingMonths} month${remainingMonths > 1 ? 's' : ''} ago`
  })()

  const expectedTotal =
    salary.locationFactor * salary.level * salary.step * salary.benchmarkFactor
  const isMismatch = Math.abs(salary.totalSalary - expectedTotal) > 0.01

  const hoursSinceCreation =
    (Date.now() - salary.timestamp.getTime()) / (1000 * 60 * 60)
  const isDeletable = hoursSinceCreation <= 24

  return (
    <div className="bg-white max-w-3xl">
      <div className="flex items-center mb-2">
        <h3 className="text-lg font-bold">
          {months[date.getMonth()]} {date.getFullYear()}
        </h3>
        <span className="mx-2">·</span>
        <p className="text-sm text-gray-500">{timeAgo.toLocaleLowerCase()}</p>
      </div>
      <div className="border rounded-lg p-6 ml-8">
        <div className="flex justify-between">
          {/* total salary */}
          <div className="mb-4">
            <div
              className={`font-semibold mb-1 ${isMismatch ? 'text-red-600' : ''}`}
              title={
                isMismatch
                  ? `Mismatch detected! Expected: ${formatCurrency(expectedTotal)}, Actual: ${formatCurrency(salary.totalSalary)}`
                  : ''
              }
            >
              {formatCurrency(salary.totalSalary)}
            </div>
            {/* salary change */}
            <div className="flex items-center gap-2 text-lg">
              <span
                className={`font-bold ${salary.changePercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {salary.changePercentage >= 0 ? '+' : ''}
                {(salary.changePercentage * 100).toFixed(2)}%
              </span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-700">
                {formatCurrency(salary.changeAmount)}
              </span>
            </div>
          </div>
          {/* level / step */}
          <div className="flex justify-between items-start mb-4">
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
              {isAdmin && isDeletable && onDelete && (
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
              )}
            </div>
          </div>
        </div>

        <div className="mb-4 flex">
          <div className="text-sm font-semibold mb-1">
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
