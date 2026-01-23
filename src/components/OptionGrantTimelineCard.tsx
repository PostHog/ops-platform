import { Award } from 'lucide-react'
import type { CartaOptionGrant } from '@prisma/client'
import { formatCurrency } from '@/lib/utils'
import { calculateVestedQuantity } from '@/lib/vesting'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface OptionGrantTimelineCardProps {
  grant: CartaOptionGrant
  lastTableItem?: boolean
}

export function OptionGrantTimelineCard({
  grant,
  lastTableItem = false,
}: OptionGrantTimelineCardProps) {
  const vestedQuantity = calculateVestedQuantity(grant)
  const vestedPercentage =
    grant.issuedQuantity > 0 ? (vestedQuantity / grant.issuedQuantity) * 100 : 0

  return (
    <TooltipProvider>
      <div
        className={`w-full border border-t-0 bg-white ${lastTableItem ? 'rounded-b-md' : ''}`}
      >
        <div className="ml-8 flex flex-col gap-y-2 border-l-[3px] border-gray-200 px-4 py-2">
          <div className="flex justify-between gap-x-4">
            <div className="flex items-center gap-x-4">
              <div className="flex items-center gap-2 text-xl">
                <Award className="h-5 w-5 text-gray-600" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help font-bold text-gray-700">
                      {grant.issuedQuantity.toLocaleString()} options
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Vested: {vestedQuantity.toLocaleString()} (
                      {vestedPercentage.toFixed(1)}%)
                      {grant.exercisedQuantity > 0 && (
                        <>
                          <br />
                          Exercised: {grant.exercisedQuantity.toLocaleString()}
                        </>
                      )}
                      {grant.expiredQuantity > 0 && (
                        <>
                          <br />
                          Expired: {grant.expiredQuantity.toLocaleString()}
                        </>
                      )}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="text-sm leading-none">
                <span className="font-semibold">Option Grant</span>
                <span className="ml-1 text-gray-600">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">
                        @ {formatCurrency(grant.exercisePrice)}/share
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Exercise Price: {formatCurrency(grant.exercisePrice)}
                        <br />
                        Total Cost to Exercise:{' '}
                        {formatCurrency(
                          grant.exercisePrice * grant.issuedQuantity,
                        )}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
