import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TooltipProvider } from '@/components/ui/tooltip'
import { getCountryFlag } from '@/lib/utils'
import { MoreVertical, PencilLine, Trash2 } from 'lucide-react'
import type { Salary } from '@prisma/client'
import { SalaryChangeDisplay } from './SalaryChangeDisplay'
import { LevelStepDisplay } from './LevelStepDisplay'

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
  const hoursSinceCreation =
    (Date.now() - salary.timestamp.getTime()) / (1000 * 60 * 60)
  const isDeletable = hoursSinceCreation <= 24

  return (
    <TooltipProvider>
      <div
        className={`bg-white w-full border border-t-0${lastTableItem ? ' rounded-b-md' : ''}`}
      >
        <div className="ml-8 border-l-[3px] border-gray-200 px-4 py-2 flex flex-col gap-y-2">
          <div className="flex justify-between gap-x-4">
            <div className="flex items-center gap-x-4">
              {/* salary change */}
              <SalaryChangeDisplay
                changePercentage={salary.changePercentage}
                changeAmount={salary.changeAmount}
                totalSalary={salary.totalSalary}
                size="lg"
                benchmarkFactor={salary.benchmarkFactor}
                locationFactor={salary.locationFactor}
                level={salary.level}
                step={salary.step}
              />
              <div className="leading-none text-sm">
                <span className="font-semibold">
                  {salary.benchmark} ({salary.benchmarkFactor})
                </span>
                <span className="text-gray-600 ml-1">
                  <span className="italic">in</span> {salary.area},{' '}
                  {salary.country} ({salary.locationFactor}){' '}
                  {getCountryFlag(salary.country)}
                </span>
              </div>
            </div>
            {/* level / step */}
            <div className="flex justify-between items-start">
              <LevelStepDisplay level={salary.level} step={salary.step} />
              {isAdmin && isDeletable && onDelete && (
                <div className="-mr-2">
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

          {salary.notes && isAdmin && (
            <div className="text-xs italic text-gray-700 whitespace-pre-line flex mb-1">
              <PencilLine className="mr-2 h-4 w-4 text-gray-500" />
              {salary.notes}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
