import { createUserFn } from '@/lib/auth-middleware'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { CartaOptionGrant } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { useLocalStorage } from 'usehooks-ts'

interface StockOptionsCalculatorProps {
  optionGrants: CartaOptionGrant[]
}

const getValuationAndShares = createUserFn({
  method: 'GET',
}).handler(async ({ context }) => {
  if (!context.user.email.endsWith('@posthog.com')) {
    throw new Error('Unauthorized')
  }

  const FULLY_DILUTED_SHARES = Number(process.env.FULLY_DILUTED_SHARES)
  const CURRENT_VALUATION = Number(process.env.CURRENT_VALUATION)

  return {
    FULLY_DILUTED_SHARES,
    CURRENT_VALUATION,
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

  if (!data?.FULLY_DILUTED_SHARES || !data?.CURRENT_VALUATION) {
    return null
  }

  const totalQuantity = optionGrants.reduce(
    (sum, grant) => sum + grant.quantity,
    0,
  )

  const totalExerciseCost = optionGrants.reduce(
    (sum, grant) => sum + grant.exercisePrice * grant.quantity,
    0,
  )

  const vestedQuantity = optionGrants.reduce(
    (sum, grant) => sum + grant.vestedQuantity,
    0,
  )
  const vestedExerciseCost = optionGrants.reduce(
    (sum, grant) => sum + grant.exercisePrice * grant.vestedQuantity,
    0,
  )

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
            Total
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
          <div className="flex justify-between border-t bg-blue-50 p-2 font-semibold">
            <span>
              Net value after exercise ({showVested ? 'vested' : 'total'}):
            </span>
            <span className={netValue >= 0 ? 'text-green-600' : 'text-red-600'}>
              {formatCurrency(netValue)}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
