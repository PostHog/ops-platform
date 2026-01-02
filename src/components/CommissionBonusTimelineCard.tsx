import { DollarSign } from 'lucide-react'
import type { Prisma } from '@prisma/client'
import { formatCurrency } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type CommissionBonus = Prisma.CommissionBonusGetPayload<{}>

interface CommissionBonusTimelineCardProps {
  bonus: CommissionBonus
  lastTableItem?: boolean
}

export function CommissionBonusTimelineCard({
  bonus,
  lastTableItem = false,
}: CommissionBonusTimelineCardProps) {
  const attainmentPercentage = (bonus.attainment / bonus.quota) * 100

  return (
    <TooltipProvider>
      <div
        className={`w-full border bg-white border-t-0${lastTableItem ? 'rounded-b-md' : ''}`}
      >
        <div className="ml-8 flex flex-col gap-y-2 border-l-[3px] border-gray-200 px-4 py-2">
          <div className="flex justify-between gap-x-4">
            <div className="flex items-center gap-x-4">
              {/* commission bonus amount */}
              <div className="flex items-center gap-2 text-xl">
                <DollarSign className="h-5 w-5 text-gray-600" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help font-bold text-gray-700">
                      {formatCurrency(bonus.calculatedAmount)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Quota: {formatCurrency(bonus.quota)}
                      <br />
                      Attainment: {formatCurrency(bonus.attainment)} (
                      {attainmentPercentage.toFixed(1)}%)
                      <br />
                      Bonus Amount: {formatCurrency(bonus.bonusAmount)}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="text-sm leading-none">
                <span className="font-semibold">
                  Commission Bonus ({bonus.quarter})
                </span>
                <span className="ml-1 text-gray-600">
                  · {attainmentPercentage.toFixed(1)}% attainment
                </span>
              </div>
            </div>
            {/* status badges */}
            <div className="flex items-center gap-2">
              {bonus.communicated && (
                <span className="rounded-md bg-green-50 px-1 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-600/20 ring-inset">
                  communicated
                </span>
              )}
              {bonus.synced && (
                <span className="rounded-md bg-blue-50 px-1 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-600/20 ring-inset">
                  synced
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

