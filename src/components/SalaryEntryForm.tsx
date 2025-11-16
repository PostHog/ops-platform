import { useEffect, useState } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import { MoreVertical } from 'lucide-react'

import { TimelineItemBadge } from './TimelineItemBadge'
import type { Salary } from '@prisma/client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  getCountryFlag,
  locationFactor,
  sfBenchmark,
  stepModifier,
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
  const [showOverride, setShowOverride] = useState(false)

  // Map numeric level to seniority level
  const getLevelName = (level: number): string => {
    if (level === 0.59) return 'Junior'
    if (level === 0.78) return 'Intermediate'
    if (level === 1) return 'Senior'
    if (level === 1.2) return 'Staff'
    // Default based on closest match
    if (level < 0.69) return 'Junior'
    if (level < 0.89) return 'Intermediate'
    if (level < 1.1) return 'Senior'
    return 'Staff'
  }

  // Map seniority level to numeric value
  const getLevelValue = (levelName: string): number => {
    switch (levelName) {
      case 'Junior':
        return 0.59
      case 'Intermediate':
        return 0.78
      case 'Senior':
        return 1
      case 'Staff':
        return 1.2
      default:
        return 1
    }
  }

  const form = useForm({
    defaultValues: {
      country: latestSalary?.country ?? 'United States',
      area: latestSalary?.area ?? 'San Francisco, California',
      locationFactor: latestSalary?.locationFactor ?? 0,
      level: latestSalary?.level ?? 1,
      levelName: getLevelName(latestSalary?.level ?? 1),
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
  const levelName = useStore(form.store, (state) => state.values.levelName)
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

  // When levelName changes, update the numeric level value
  useEffect(() => {
    if (levelName) {
      form.setFieldValue('level', getLevelValue(levelName))
    }
  }, [levelName, form])

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

    // Set actualSalary to match totalSalary by default
    form.setFieldValue('actualSalary', Number(currentTotalSalary.toFixed(2)))
    form.setFieldValue('actualSalaryLocal', Number(totalSalaryLocal.toFixed(2)))
  }, [country, area, benchmark, level, step, latestSalary, form])

  // When country changes, reset area to first available area
  useEffect(() => {
    const areas = getAreasByCountry(country)
    if (areas.length > 0 && !areas.includes(area)) {
      form.setFieldValue('area', areas[0])
    }
  }, [country, area, form])

  return (
    <div className="bg-white max-w-5xl mb-4">
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setShowOverride(!showOverride)}
                  >
                    {showOverride ? 'Disable' : 'Enable'} salary override
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

          <div className="grid grid-cols-5 gap-4 mb-4">
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
                    <SelectTrigger className="text-sm w-full">
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
                    <SelectTrigger className="text-sm w-full">
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
                    <SelectTrigger className="text-sm w-full">
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
            <form.Field name="levelName">
              {(field) => (
                <div>
                  <label className="text-xs font-medium text-gray-700">
                    Level
                  </label>
                  <Select
                    value={field.state.value}
                    onValueChange={field.handleChange}
                  >
                    <SelectTrigger className="text-sm w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Junior">Junior (0.59)</SelectItem>
                      <SelectItem value="Intermediate">
                        Intermediate (0.78)
                      </SelectItem>
                      <SelectItem value="Senior">Senior (1)</SelectItem>
                      <SelectItem value="Staff">Staff (1.2)</SelectItem>
                    </SelectContent>
                  </Select>
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
                    min="0"
                    max="2"
                    step="0.001"
                    value={field.state.value}
                    onChange={(e) => {
                      const value = e.target.value
                      // Allow empty string for clearing
                      if (value === '') {
                        field.handleChange(0)
                        return
                      }
                      const num = Number(value)
                      // Round to 3 decimal places
                      const rounded = Math.round(num * 1000) / 1000
                      field.handleChange(rounded)
                    }}
                    className="text-sm"
                  />
                </div>
              )}
            </form.Field>

            {/* Actual Salary Override - conditionally shown */}
            {showOverride ? (
              <form.Field name="actualSalary">
                {(field) => (
                  <div>
                    <label className="text-xs font-medium text-gray-700">
                      Actual Salary (USD) Override
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={field.state.value}
                      onChange={(e) =>
                        field.handleChange(Number(e.target.value))
                      }
                      className="text-sm"
                      placeholder="Override total salary"
                    />
                  </div>
                )}
              </form.Field>
            ) : null}
          </div>

          {/* Calculated values display */}
          <div className="bg-green-50 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="flex items-center gap-2 text-xl mb-2">
                  <span
                    className={`font-bold ${changePercentage > 0 ? 'text-green-600' : changePercentage < 0 ? 'text-red-600' : ''}`}
                  >
                    {changePercentage >= 0 ? '+' : ''}
                    {(changePercentage * 100).toFixed(2)}%
                  </span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-700">
                    {formatCurrency(totalSalary)}
                  </span>
                </div>
                <div className="mb-2 leading-none text-xs">
                  <span className="font-semibold">
                    {benchmark} ({benchmarkFactor})
                  </span>
                  <span className="text-gray-600 ml-1">
                    <span className="italic">in</span> {area},{' '}
                    {getCountryFlag(country)} {country} ({locationFactorValue})
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <div>
                  <div className="text-xl font-bold">
                    {level}.{Math.floor((step - 1) / 3)}
                  </div>
                  <div className="text-xs text-gray-500 text-center">level</div>
                </div>
                <div className="text-2xl text-gray-300">/</div>
                <div>
                  <div className="text-xl font-bold">{step}</div>
                  <div className="text-xs text-gray-500 text-center">step</div>
                </div>
              </div>
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
