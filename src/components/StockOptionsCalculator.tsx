import { createInternalFn } from '@/lib/auth-middleware'
import { formatCurrency } from '@/lib/utils'
import { calculateVestedQuantity } from '@/lib/vesting'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useSensitiveDataHidden } from '@/components/SensitiveData'
import type { CartaOptionGrant } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { useLocalStorage } from 'usehooks-ts'
import { AlertCircle, Plus, X } from 'lucide-react'
import { useState } from 'react'

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

  return {
    FULLY_DILUTED_SHARES,
    CURRENT_VALUATION,
    DILUTION_PER_ROUND,
  }
})

const DEFAULT_VALUATIONS: number[] = [
  5_000_000_000,
  15_000_000_000,
  60_000_000_000,
  100_000_000_000,
]

const PLACEHOLDER = '•••'

export default function StockOptionsCalculator({
  optionGrants,
}: StockOptionsCalculatorProps) {
  const [showVested, setShowVested] = useLocalStorage<boolean>(
    'stockOptions.showVested',
    false,
  )
  const [customValuations, setCustomValuations] = useLocalStorage<number[]>(
    'stockOptions.customValuations',
    DEFAULT_VALUATIONS,
  )
  const [newValuation, setNewValuation] = useState('')
  const isSensitiveHidden = useSensitiveDataHidden()

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

  const formatValuationInput = (value: string): string => {
    const numericValue = value.replace(/[^0-9]/g, '')
    if (!numericValue) return ''
    const num = parseInt(numericValue, 10)
    return num.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
  }

  const addValuation = () => {
    const numericStr = newValuation.replace(/[^0-9]/g, '')
    const valuationAmount = parseInt(numericStr, 10)

    if (!isNaN(valuationAmount) && valuationAmount > 0) {
      const exists = customValuations.includes(valuationAmount)

      if (!exists) {
        setCustomValuations(
          [...customValuations, valuationAmount].sort((a, b) => a - b),
        )
      }
      setNewValuation('')
    }
  }

  const removeValuation = (valuation: number) => {
    setCustomValuations(customValuations.filter((v) => v !== valuation))
  }

  const resetToDefaults = () => {
    setCustomValuations(DEFAULT_VALUATIONS)
  }

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
              {isSensitiveHidden
                ? PLACEHOLDER
                : displayQuantity.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Current fully-diluted shares:</span>
            <span className="font-medium">
              {isSensitiveHidden
                ? PLACEHOLDER
                : data.FULLY_DILUTED_SHARES.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Shares as % of fully-diluted:</span>
            <span className="font-medium">
              {isSensitiveHidden
                ? PLACEHOLDER
                : `${sharesAsPercentage.toFixed(4)}%`}
            </span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-gray-600">Current valuation:</span>
            <span className="font-medium">
              {isSensitiveHidden
                ? PLACEHOLDER
                : formatCurrency(data.CURRENT_VALUATION)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">
              Current stock price (per share):
            </span>
            <span className="font-medium">
              {isSensitiveHidden
                ? PLACEHOLDER
                : formatCurrency(currentStockPrice)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">
              Value of {showVested ? 'vested' : 'total'} underlying stock:
            </span>
            <span className="font-medium">
              {isSensitiveHidden ? PLACEHOLDER : formatCurrency(currentValue)}
            </span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-gray-600">
              Average exercise price per share:
            </span>
            <span className="font-medium">
              {isSensitiveHidden
                ? PLACEHOLDER
                : formatCurrency(avgExercisePrice)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">
              Total cost to exercise {showVested ? 'vested' : 'all'} options:
            </span>
            <span className="font-medium">
              {isSensitiveHidden
                ? PLACEHOLDER
                : formatCurrency(totalCostToExercise)}
            </span>
          </div>
          <div className="flex justify-between border-t py-2 font-semibold">
            <span>
              Net value after exercise ({showVested ? 'vested' : 'total'}):
            </span>
            <span className="text-green-600">
              {isSensitiveHidden ? PLACEHOLDER : formatCurrency(Math.max(0, netValue))}
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
                        These projections assume {averageDilutionPerRound}%
                        dilution per funding round, based on historical dilution
                        of {data.DILUTION_PER_ROUND[0]}-
                        {data.DILUTION_PER_ROUND[1]}% in our last 2 rounds. The
                        actual dilution depends on valuation, number of rounds,
                        and amount raised.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-gray-500"
                onClick={resetToDefaults}
              >
                Reset
              </Button>
            </div>
            <p className="mb-2 text-xs text-gray-500">
              Assumes {averageDilutionPerRound}% dilution per round
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pr-4 pb-2 text-left font-medium text-gray-600">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex cursor-help items-center gap-1">
                            Rounds
                            <AlertCircle className="h-3 w-3" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">
                              Each round of funding typically dilutes existing shareholders.
                              We assume {averageDilutionPerRound}% dilution per round, meaning
                              your ownership percentage decreases by this amount each time
                              the company raises money.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </th>
                    <th className="pr-4 pb-2 text-left font-medium text-gray-600">
                      Valuation
                    </th>
                    <th className="pr-4 pb-2 text-left font-medium text-gray-600">
                      Net Value
                    </th>
                    <th className="w-8 pb-2" />
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b bg-blue-50/50">
                    <td className="py-1.5 pr-4 font-medium">0 (current)</td>
                    <td className="py-1.5 pr-4 font-medium">
                      {isSensitiveHidden
                        ? PLACEHOLDER
                        : formatCurrency(data.CURRENT_VALUATION)}
                    </td>
                    <td className="py-1.5 pr-4 font-medium text-green-600">
                      {isSensitiveHidden ? PLACEHOLDER : formatCurrency(Math.max(0, netValue))}
                    </td>
                    <td />
                  </tr>
                  {customValuations.map((valuation, index) => {
                    const roundNumber = index + 1
                    const dilutionFactor = Math.pow(
                      1 - averageDilutionPerRound / 100,
                      roundNumber,
                    )
                    const previousDilutionFactor =
                      index === 0
                        ? 1
                        : Math.pow(1 - averageDilutionPerRound / 100, index)
                    const baseOwnershipPercent =
                      (displayQuantity / data.FULLY_DILUTED_SHARES) * 100
                    const previousOwnershipPercent =
                      baseOwnershipPercent * previousDilutionFactor
                    const dilutedOwnershipPercent =
                      baseOwnershipPercent * dilutionFactor
                    const dilutedOwnership =
                      (displayQuantity / data.FULLY_DILUTED_SHARES) *
                      dilutionFactor
                    const futureValue = valuation * dilutedOwnership
                    const futureNetValue = futureValue - totalCostToExercise
                    const dilutedPercentage = (1 - dilutionFactor) * 100
                    const previousValuation =
                      index === 0 ? data.CURRENT_VALUATION : customValuations[index - 1]
                    const multiplier = valuation / previousValuation

                    return (
                      <tr
                        key={valuation}
                        className="group border-b last:border-b-0"
                      >
                        <td className="py-1.5 pr-4">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="cursor-help">
                                {roundNumber}
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-sm">
                                  After {roundNumber} round{roundNumber > 1 ? 's' : ''}, your
                                  ownership is diluted by {dilutedPercentage.toFixed(1)}%
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                        <td className="py-1.5 pr-4">
                          {formatCurrency(valuation)}{' '}
                          <span className="text-gray-400">({multiplier.toFixed(1)}x)</span>
                        </td>
                        <td className="py-1.5 pr-4 font-medium text-green-600">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="cursor-help">
                                {isSensitiveHidden
                                  ? PLACEHOLDER
                                  : formatCurrency(Math.max(0, futureNetValue))}
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <div className="space-y-1 text-sm">
                                  <p>
                                    <span className="text-gray-400">Your ownership:</span>{' '}
                                    {isSensitiveHidden ? PLACEHOLDER : `${previousOwnershipPercent.toFixed(4)}%`}
                                    {' → '}
                                    {isSensitiveHidden ? PLACEHOLDER : `${dilutedOwnershipPercent.toFixed(4)}%`}
                                    {' '}
                                    <span className="text-gray-400">(-{averageDilutionPerRound}% dilution)</span>
                                  </p>
                                  <p>
                                    <span className="text-gray-400">Stake value at {formatCurrency(valuation)}:</span>{' '}
                                    {isSensitiveHidden ? PLACEHOLDER : formatCurrency(futureValue)}
                                  </p>
                                  <p>
                                    <span className="text-gray-400">Minus exercise cost:</span>{' '}
                                    {isSensitiveHidden ? PLACEHOLDER : formatCurrency(totalCostToExercise)}
                                  </p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                        <td className="py-1.5">
                          <button
                            type="button"
                            onClick={() => removeValuation(valuation)}
                            className="text-gray-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                            aria-label={`Remove ${formatCurrency(valuation)}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex gap-2">
              <Input
                type="text"
                placeholder="Add valuation (e.g., $50,000,000,000)"
                value={newValuation}
                onChange={(e) => setNewValuation(formatValuationInput(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addValuation()
                  }
                }}
                className="h-8 flex-1 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addValuation}
                className="h-8"
              >
                <Plus className="mr-1 h-3 w-3" />
                Add
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
