import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatCurrency, getCountryFlag } from '@/lib/utils'
import { MoreVertical, PencilLine, Trash2 } from 'lucide-react'
import type { Salary } from '@prisma/client'

interface SalaryHistoryCardProps {
  salary: Salary
  isAdmin: boolean
  onDelete?: (salaryId: string) => Promise<void>
  lastTableItem?: boolean
}

export function SalaryHistoryCard({
  salary,
  isAdmin,
  onDelete,
  lastTableItem = false,
}: SalaryHistoryCardProps) {
  const expectedTotal =
    salary.locationFactor * salary.level * salary.step * salary.benchmarkFactor
  const isMismatch = Math.abs(salary.totalSalary - expectedTotal) > 0.01

  const hoursSinceCreation =
    (Date.now() - salary.timestamp.getTime()) / (1000 * 60 * 60)
  const isDeletable = hoursSinceCreation <= 24

  return (
    <TooltipProvider>
      <div
        className={`w-full border bg-white border-t-0${lastTableItem ? 'rounded-b-md' : ''}`}
      >
        <div className="ml-8 flex flex-col gap-y-2 border-l-[3px] border-gray-200 px-4 py-2">
          <div className="flex justify-between gap-x-4">
            <div className="flex items-center gap-x-4">
              {/* salary change */}
              <div className="flex items-center gap-2 text-xl">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={`cursor-help font-bold ${salary.changePercentage > 0 ? 'text-green-600' : salary.changePercentage < 0 ? 'text-red-600' : ''}`}
                    >
                      {salary.changePercentage >= 0 ? '+' : ''}
                      {(salary.changePercentage * 100).toFixed(2)}%
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Change: {formatCurrency(salary.changeAmount)}</p>
                  </TooltipContent>
                </Tooltip>
                <span className="text-gray-400">·</span>
                {isMismatch ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-red-600">
                        {formatCurrency(salary.totalSalary)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Mismatch detected! Expected:{' '}
                        {formatCurrency(expectedTotal)}, Actual:{' '}
                        {formatCurrency(salary.totalSalary)}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <span className="text-gray-700">
                    {formatCurrency(salary.totalSalary)}
                  </span>
                )}
              </div>
              <div className="text-sm leading-none">
                <span className="font-semibold">
                  {salary.benchmark} ({salary.benchmarkFactor})
                </span>
                <span className="ml-1 text-gray-600">
                  <span className="italic">in</span> {salary.area},{' '}
                  {salary.country} ({salary.locationFactor}){' '}
                  {getCountryFlag(salary.country)}
                </span>
              </div>
            </div>
            {/* level / step */}
            <div className="flex items-start justify-between">
              <div className="flex justify-end gap-2">
                <div>
                  <div className="text-xl font-bold">
                    {salary.level === 1 ? '1.0' : salary.level}
                  </div>
                  <div className="text-center text-xs text-gray-500">level</div>
                </div>
                <div className="text-2xl text-gray-300">/</div>
                <div>
                  <div className="text-xl font-bold">{salary.step}</div>
                  <div className="text-center text-xs text-gray-500">step</div>
                </div>
              </div>
              {isAdmin && isDeletable && onDelete && (
                <div className="-mr-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-8 w-8 p-0"
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

          {salary.notes && isAdmin && (
            <div className="mb-1 flex text-xs whitespace-pre-line text-gray-700 italic">
              <PencilLine className="mr-2 h-4 w-4 text-gray-500" />
              {salary.notes}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
