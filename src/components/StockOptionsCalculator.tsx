import { createInternalFn } from '@/lib/auth-middleware'
import { formatCurrency } from '@/lib/utils'
import { calculateVestedQuantity } from '@/lib/vesting'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { CartaOptionGrant } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { useLocalStorage } from 'usehooks-ts'
import { AlertCircle } from 'lucide-react'

interface StockOptionsCalculatorProps {
  optionGrants: CartaOptionGrant[]
}

const getValuationAndShares = createInternalFn({
  method: 'GET',
}).handler(async ({ context }) => {
  if (!context.user.email.endsWith('@posthog.com')) {
    throw new Error('Unauthorized')
  }

  const FULLY_DILUTED_SHARES = Number(process.env.FULLY_DILUTED_SHARES)
  const CURRENT_VALUATION = Number(process.env.CURRENT_VALUATION)
  const DILUTION_PER_ROUND =
    process.env.DILUTION_PER_ROUND?.split(',').map(Number)

  // Parse valuation scenarios from env: "1:3000000000,2:5000000000,3:8000000000"
  const VALUATION_SCENARIOS = process.env.VALUATION_SCENARIOS?.split(',').map(
    (scenario) => {
      const [rounds, valuation] = scenario.split(':')
      return { rounds: Number(rounds), valuation: Number(valuation) }
    },
  )

  return {
    FULLY_DILUTED_SHARES,
    CURRENT_VALUATION,
    DILUTION_PER_ROUND,
    VALUATION_SCENARIOS,
  }
})

export default function StockOptionsCalculator({
  optionGrants,
}: StockOptionsCalculatorProps) {
  const [showVested, setShowVested] = useLocalStorage<boolean>(
    'stockOptions.showVested',
    false,
  )

  const { data } = useQuery({
    queryKey: ['valuationAndShares'],
    queryFn: getValuationAndShares,
  })

  if (
    !data?.FULLY_DILUTED_SHARES ||
    !data?.CURRENT_VALUATION ||
    !data?.DILUTION_PER_ROUND
  ) {
    return null
  }

  const averageDilutionPerRound =
    (data.DILUTION_PER_ROUND[0] + data.DILUTION_PER_ROUND[1]) / 2

  const totalQuantity = optionGrants.reduce(
    (sum, grant) =>
      sum +
      grant.issuedQuantity -
      grant.exercisedQuantity -
      grant.expiredQuantity,
    0,
  )

  const totalExerciseCost = optionGrants.reduce(
    (sum, grant) =>
      sum +
      grant.exercisePrice *
        (grant.issuedQuantity -
          grant.exercisedQuantity -
          grant.expiredQuantity),
    0,
  )

  const vestedQuantity = optionGrants.reduce((sum, grant) => {
    const vested = calculateVestedQuantity(grant)
    return (
      sum +
      Math.max(0, vested - grant.exercisedQuantity - grant.expiredQuantity)
    )
  }, 0)
  const vestedExerciseCost = optionGrants.reduce((sum, grant) => {
    const vested = calculateVestedQuantity(grant)
    const vestedExercisable = Math.max(
      0,
      vested - grant.exercisedQuantity - grant.expiredQuantity,
    )
    return sum + grant.exercisePrice * vestedExercisable
  }, 0)

  const displayQuantity = showVested ? vestedQuantity : totalQuantity
  const displayExerciseCost = showVested
    ? vestedExerciseCost
    : totalExerciseCost

  const avgExercisePrice =
    displayQuantity > 0 ? displayExerciseCost / displayQuantity : 0

  const currentStockPrice = data.CURRENT_VALUATION / data.FULLY_DILUTED_SHARES

  const sharesAsPercentage = (displayQuantity / data.FULLY_DILUTED_SHARES) * 100
  const currentValue = displayQuantity * currentStockPrice
  const totalCostToExercise = displayExerciseCost
  const netValue = currentValue - totalCostToExercise

  if (optionGrants.length === 0) {
    return null
  }

  return (
    <>
      <div className="mt-2 flex flex-row items-center justify-between gap-2">
        <span className="text-md font-bold">Stock Options</span>
        <div className="flex gap-1 rounded-md border">
          <Button
            type="button"
            variant={!showVested ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setShowVested(false)}
          >
            Total (outstanding)
          </Button>
          <Button
            type="button"
            variant={showVested ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setShowVested(true)}
          >
            Vested
          </Button>
        </div>
      </div>
      <div className="mb-4 w-full rounded-lg border bg-gray-50 p-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">
              Number of {showVested ? 'vested' : 'total'} shares:
            </span>
            <span className="font-medium">
              {displayQuantity.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Current fully-diluted shares:</span>
            <span className="font-medium">
              {data.FULLY_DILUTED_SHARES.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Shares as % of fully-diluted:</span>
            <span className="font-medium">
              {sharesAsPercentage.toFixed(4)}%
            </span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-gray-600">Current valuation:</span>
            <span className="font-medium">
              {formatCurrency(data.CURRENT_VALUATION)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">
              Current stock price (per share):
            </span>
            <span className="font-medium">
              {formatCurrency(currentStockPrice)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">
              Value of {showVested ? 'vested' : 'total'} underlying stock:
            </span>
            <span className="font-medium">{formatCurrency(currentValue)}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-gray-600">
              Average exercise price per share:
            </span>
            <span className="font-medium">
              {formatCurrency(avgExercisePrice)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">
              Total cost to exercise {showVested ? 'vested' : 'all'} options:
            </span>
            <span className="font-medium">
              {formatCurrency(totalCostToExercise)}
            </span>
          </div>
          <div className="flex justify-between border-t py-2 font-semibold">
            <span>
              Net value after exercise ({showVested ? 'vested' : 'total'}):
            </span>
            <span className={netValue >= 0 ? 'text-green-600' : 'text-red-600'}>
              {formatCurrency(netValue)}
            </span>
          </div>

          <div className="mt-4 border-t pt-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold">Potential Future Value</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertCircle className="h-4 w-4 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p className="text-sm">
                        These assume a very rough estimate of dilution per
                        round/valuation increase. This is highly dependent on
                        valuation, number of rounds to reach valuation and
                        amount raised per round. This is very hard to
                        approximate but for some context, we've experienced{' '}
                        {data.DILUTION_PER_ROUND[0]}-
                        {data.DILUTION_PER_ROUND[1]}% dilution per round in our
                        last 2 rounds.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <span className="text-xs text-gray-600">
                assumes {averageDilutionPerRound}% dilution per round
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pr-4 pb-2 text-left font-medium text-gray-600">
                      Rounds
                    </th>
                    <th className="pr-4 pb-2 text-left font-medium text-gray-600">
                      Valuation
                    </th>
                    <th className="pb-2 text-left font-medium text-gray-600">
                      Net Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { rounds: 0, valuation: data.CURRENT_VALUATION },
                    ...(data.VALUATION_SCENARIOS || []),
                  ].map(({ rounds, valuation }) => {
                    const dilutionFactor = Math.pow(
                      1 - averageDilutionPerRound / 100,
                      rounds,
                    )
                    const dilutedOwnership =
                      (displayQuantity / data.FULLY_DILUTED_SHARES) *
                      dilutionFactor
                    const futureValue = valuation * dilutedOwnership
                    const futureNetValue = futureValue - totalCostToExercise

                    return (
                      <tr key={rounds} className="border-b last:border-b-0">
                        <td className="py-1.5 pr-4">{rounds}</td>
                        <td className="py-1.5 pr-4">
                          {formatCurrency(valuation)}
                        </td>
                        <td
                          className={`py-1.5 font-medium ${futureNetValue >= 0 ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {formatCurrency(futureNetValue)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
