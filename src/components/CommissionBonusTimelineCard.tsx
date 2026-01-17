import { Receipt } from 'lucide-react'
import type { Prisma } from '@prisma/client'
import { formatCurrency } from '@/lib/utils'
import {
  calculateAttainmentPercentage,
  formatQuotaOrAttainment,
} from '@/lib/commission-calculator'
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
  const attainmentPercentage = calculateAttainmentPercentage(
    bonus.attainment,
    bonus.quota,
    bonus.commissionType,
  )

  return (
    <TooltipProvider>
      <div
        className={`w-full border border-t-0 bg-white ${lastTableItem ? 'rounded-b-md' : ''}`}
      >
        <div className="ml-8 flex flex-col gap-y-2 border-l-[3px] border-gray-200 px-4 py-2">
          <div className="flex justify-between gap-x-4">
            <div className="flex items-center gap-x-4">
              {/* attainment percentage */}
              <div className="flex items-center gap-2 text-xl">
                <Receipt className="h-5 w-5 text-gray-600" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help font-bold text-gray-700">
                      {attainmentPercentage.toFixed(1)}% attainment
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Quota:{' '}
                      {formatQuotaOrAttainment(
                        bonus.quota,
                        bonus.commissionType,
                      )}
                      <br />
                      Attainment:{' '}
                      {formatQuotaOrAttainment(
                        bonus.attainment,
                        bonus.commissionType,
                      )}
                      <br />
                      Bonus Amount: {formatCurrency(bonus.bonusAmount)}
                      {bonus.amountHeld > 0 && (
                        <>
                          <br />
                          Amount Held: {formatCurrency(bonus.amountHeld)}
                        </>
                      )}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="text-sm leading-none">
                <span className="font-semibold">
                  Commission Bonus ({bonus.quarter})
                </span>
                <span className="ml-1 text-gray-600">
                  {bonus.calculatedAmountLocal !== null &&
                  bonus.calculatedAmountLocal !== undefined &&
                  bonus.localCurrency ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help">
                          {formatCurrency(
                            bonus.calculatedAmount - (bonus.amountHeld || 0),
                          )}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Calculated: {formatCurrency(bonus.calculatedAmount)}
                          {bonus.amountHeld > 0 && (
                            <>
                              <br />
                              Held: {formatCurrency(bonus.amountHeld)}
                            </>
                          )}
                          <br />
                          Local:{' '}
                          {formatCurrency(
                            (bonus.calculatedAmountLocal || 0) -
                              (bonus.amountHeld || 0) * bonus.exchangeRate,
                            bonus.localCurrency,
                          )}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span>
                      {formatCurrency(
                        bonus.calculatedAmount - (bonus.amountHeld || 0),
                      )}
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
