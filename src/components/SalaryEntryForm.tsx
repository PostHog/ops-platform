import { useEffect } from 'react'
import { useForm, useStore } from '@tanstack/react-form'

import { TimelineItemBadge } from './TimelineItemBadge'
import type { Salary } from '@prisma/client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  currencyData,
  formatCurrency,
  getAreasByCountry,
  getCountries,
  locationFactor,
  sfBenchmark,
} from '@/lib/utils'

interface SalaryEntryFormProps {
  employeeId: string
  latestSalary: Salary | undefined
  benchmarkUpdated: boolean
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
}

export function SalaryEntryForm({
  employeeId,
  latestSalary,
  benchmarkUpdated,
  onSubmit,
  onCancel,
}: SalaryEntryFormProps) {
  const form = useForm({
    defaultValues: {
      country: latestSalary?.country ?? 'United States',
      area: latestSalary?.area ?? 'San Francisco, California',
      locationFactor: latestSalary?.locationFactor ?? 0,
      level: latestSalary?.level ?? 1,
      step: latestSalary?.step ?? 1,
      benchmark: latestSalary?.benchmark ?? 'Product Engineer',
      benchmarkFactor: latestSalary?.benchmarkFactor ?? 0,
      totalSalary: latestSalary?.totalSalary ?? 0,
      changePercentage: 0,
      changeAmount: 0,
      localCurrency: latestSalary?.localCurrency ?? 'USD',
      exchangeRate: latestSalary?.exchangeRate ?? 1,
      totalSalaryLocal: latestSalary?.totalSalaryLocal ?? 0,
      amountTakenInOptions: 0,
      actualSalary: latestSalary?.actualSalary ?? 0,
      actualSalaryLocal: latestSalary?.actualSalaryLocal ?? 0,
      notes: '',
      employeeId: employeeId,
    },
    onSubmit: async ({ value }) => {
      await onSubmit(value)
    },
  })

  // Subscribe to field changes
  const country = useStore(form.store, (state) => state.values.country)
  const area = useStore(form.store, (state) => state.values.area)
  const benchmark = useStore(form.store, (state) => state.values.benchmark)
  const level = useStore(form.store, (state) => state.values.level)
  const step = useStore(form.store, (state) => state.values.step)
  const totalSalary = useStore(form.store, (state) => state.values.totalSalary)
  const changePercentage = useStore(
    form.store,
    (state) => state.values.changePercentage,
  )
  const changeAmount = useStore(
    form.store,
    (state) => state.values.changeAmount,
  )
  const benchmarkFactor = useStore(
    form.store,
    (state) => state.values.benchmarkFactor,
  )
  const locationFactorValue = useStore(
    form.store,
    (state) => state.values.locationFactor,
  )

  useEffect(() => {
    const location = locationFactor.find(
      (l) => l.country === country && l.area === area,
    )
    const currentLocationFactor = location?.locationFactor ?? 0
    form.setFieldValue(
      'locationFactor',
      Number(currentLocationFactor.toFixed(2)),
    )

    const currentBenchmarkFactor = benchmark.includes('(old)')
      ? (latestSalary?.benchmarkFactor ?? 0)
      : (sfBenchmark[benchmark.replace(' (old)', '')] ?? 0)
    form.setFieldValue(
      'benchmarkFactor',
      Number(currentBenchmarkFactor.toFixed(2)),
    )

    const currentTotalSalary =
      currentLocationFactor * level * step * currentBenchmarkFactor
    form.setFieldValue('totalSalary', Number(currentTotalSalary.toFixed(2)))

    const latestTotalSalary = latestSalary?.totalSalary ?? 0
    const currentChangePercentage =
      latestTotalSalary > 0 ? currentTotalSalary / latestTotalSalary - 1 : 0
    form.setFieldValue(
      'changePercentage',
      Number(currentChangePercentage.toFixed(4)),
    )

    const currentChangeAmount = currentTotalSalary - latestTotalSalary
    form.setFieldValue('changeAmount', Number(currentChangeAmount.toFixed(2)))

    const exchangeRate = currencyData[location?.currency ?? ''] ?? 1
    form.setFieldValue('exchangeRate', exchangeRate)
    form.setFieldValue(
      'localCurrency',
      currencyData[location?.currency ?? '']
        ? (location?.currency ?? 'USD')
        : 'USD',
    )

    const totalSalaryLocal = currentTotalSalary * exchangeRate
    form.setFieldValue('totalSalaryLocal', Number(totalSalaryLocal.toFixed(2)))
  }, [country, area, benchmark, level, step, latestSalary, form])

  // When country changes, reset area to first available area
  useEffect(() => {
    const areas = getAreasByCountry(country)
    if (areas.length > 0 && !areas.includes(area)) {
      form.setFieldValue('area', areas[0])
    }
  }, [country, area, form])

  return (
    <div className="bg-white max-w-3xl mb-4">
      <div className="border rounded-lg p-4 border-green-600">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
        >
          <div className="flex justify-between items-start mb-2">
            <TimelineItemBadge type="new salary" />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Save
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            {/* Country */}
            <form.Field name="country">
              {(field) => (
                <div>
                  <label className="text-xs font-medium text-gray-700">
                    Country
                  </label>
                  <Select
                    value={field.state.value}
                    onValueChange={field.handleChange}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getCountries().map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            {/* Area */}
            <form.Field name="area">
              {(field) => (
                <div>
                  <label className="text-xs font-medium text-gray-700">
                    Area
                  </label>
                  <Select
                    value={field.state.value}
                    onValueChange={field.handleChange}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAreasByCountry(country).map((area) => (
                        <SelectItem key={area} value={area}>
                          {area}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
            <div>{/* empty column */}</div>

            {/* Benchmark */}
            <form.Field name="benchmark">
              {(field) => (
                <div>
                  <label className="text-xs font-medium text-gray-700">
                    Benchmark
                  </label>
                  <Select
                    value={field.state.value}
                    onValueChange={field.handleChange}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(sfBenchmark)
                        .concat(
                          benchmarkUpdated
                            ? [`${latestSalary?.benchmark} (old)`]
                            : [],
                        )
                        .map((benchmark) => (
                          <SelectItem key={benchmark} value={benchmark}>
                            {benchmark}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            {/* Level */}
            <form.Field name="level">
              {(field) => (
                <div>
                  <label className="text-xs font-medium text-gray-700">
                    Level
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                    className="text-sm"
                  />
                </div>
              )}
            </form.Field>

            {/* Step */}
            <form.Field name="step">
              {(field) => (
                <div>
                  <label className="text-xs font-medium text-gray-700">
                    Step
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                    className="text-sm"
                  />
                </div>
              )}
            </form.Field>
          </div>

          {/* Calculated values display */}
          <div className="bg-green-50 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <div>
                <div className="text-xl font-bold text-green-600">
                  {changePercentage >= 0 ? '+' : ''}
                  {(changePercentage * 100).toFixed(2)}%
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-gray-700">
                    {formatCurrency(changeAmount)}
                  </span>
                </div>
                <div className="font-semibold text-lg">
                  {formatCurrency(totalSalary)}{' '}
                  <span className="font-normal text-sm text-gray-600">
                    total salary
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <div>
                  <div className="text-2xl font-bold">
                    {level}.{Math.floor((step - 1) / 3)}
                  </div>
                  <div className="text-xs text-gray-500 text-center">level</div>
                </div>
                <div className="text-2xl text-gray-300">/</div>
                <div>
                  <div className="text-2xl font-bold">{step}</div>
                  <div className="text-xs text-gray-500 text-center">step</div>
                </div>
              </div>
            </div>
            <div className="text-sm">
              <span className="font-semibold">
                {benchmark} ({benchmarkFactor})
              </span>
              <span className="text-gray-600 ml-1">
                <span className="italic">in</span> {area}, {country} (
                {locationFactorValue})
              </span>
            </div>
          </div>

          {/* Notes */}
          <form.Field name="notes">
            {(field) => (
              <div>
                <label className="text-xs font-medium text-gray-700">
                  Notes
                </label>
                <Textarea
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Add any notes about this salary change..."
                  className="text-sm"
                  rows={3}
                />
              </div>
            )}
          </form.Field>
        </form>
      </div>
    </div>
  )
}
