import {
  locationFactor,
  sfBenchmark,
  bonusPercentage,
  currencyData,
  getCountries,
  getAreasByCountry,
  formatCurrency,
  getCountryFlag,
  SALARY_LEVEL_OPTIONS,
  roleTypeOptions,
  roleType,
} from '@/lib/utils'
import { updateSalary } from '@/routes/employee.$employeeId'
import { Salary } from '@prisma/client'
import { AnyFormApi, useForm, useStore } from '@tanstack/react-form'
import { MoreVertical } from 'lucide-react'
import { useEffect } from 'react'
import { createToast } from 'vercel-toast'
import { TimelineItemBadge } from './TimelineItemBadge'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

export function NewSalaryForm({
  employeeId,
  showOverride,
  setShowOverride,
  onSuccess,
  onCancel,
  latestSalary,
  totalAmountInStockOptions,
  benchmarkUpdated,
  setLevel,
  setStep,
  setBenchmark,
  showBonusPercentage,
  eligibleForEquityRefresh,
}: {
  employeeId: string
  showOverride: boolean
  setShowOverride: (showOverride: boolean) => void
  onSuccess: () => void
  onCancel: () => void
  latestSalary: Salary | undefined
  totalAmountInStockOptions: number
  benchmarkUpdated: boolean
  setLevel: (level: number) => void
  setStep: (step: number) => void
  setBenchmark: (benchmark: string) => void
  showBonusPercentage: boolean
  eligibleForEquityRefresh?: boolean
}) {
  const getDefaultValues = () => ({
    country: latestSalary?.country ?? 'United States',
    area: latestSalary?.area ?? 'San Francisco, California',
    locationFactor: latestSalary?.locationFactor ?? 0,
    level: latestSalary?.level ?? 1,
    step: latestSalary?.step ?? 1,
    benchmark: latestSalary?.benchmark ?? 'Product Engineer',
    benchmarkFactor: latestSalary?.benchmarkFactor ?? 0,
    bonusPercentage: latestSalary?.bonusPercentage ?? 0,
    bonusAmount: 0,
    totalSalary: latestSalary?.totalSalary ?? 0,
    changePercentage: 0, // Always 0 for new entries
    changeAmount: 0, // Always 0 for new entries
    localCurrency: latestSalary?.localCurrency ?? 'USD',
    exchangeRate: latestSalary?.exchangeRate ?? 1,
    totalSalaryLocal: latestSalary?.totalSalaryLocal ?? 0,
    amountTakenInOptions: 0,
    actualSalary: latestSalary?.actualSalary ?? 0,
    actualSalaryLocal: latestSalary?.actualSalaryLocal ?? 0,
    equityRefreshPercentage: 0,
    equityRefreshAmount: 0,
    employmentCountry:
      latestSalary?.employmentCountry ??
      latestSalary?.country ??
      'United States',
    employmentArea:
      latestSalary?.employmentArea ??
      latestSalary?.area ??
      'San Francisco, California',
    notes: '',
    employeeId: employeeId,
  })

  const updateFormFields = (formApi: AnyFormApi, triggerField?: string) => {
    if (triggerField === 'country') {
      const country = formApi.getFieldValue('country')
      formApi.setFieldValue('employmentCountry', country)
      const areas = getAreasByCountry(country)
      if (areas.length > 0) {
        formApi.setFieldValue('area', areas[0])
      }
    }
    if (triggerField === 'area') {
      formApi.setFieldValue('employmentArea', formApi.getFieldValue('area'))
    }
    if (triggerField === 'employmentCountry') {
      const employmentCountry = formApi.getFieldValue('employmentCountry')
      const areas = getAreasByCountry(employmentCountry)
      if (areas.length > 0) {
        formApi.setFieldValue('employmentArea', areas[0])
      }
    }

    const country = formApi.getFieldValue('country')
    const area = formApi.getFieldValue('area')
    const employmentCountry = formApi.getFieldValue('employmentCountry')
    const employmentArea = formApi.getFieldValue('employmentArea')

    const location = locationFactor.find(
      (l) => l.country === country && l.area === area,
    )

    const employmentLocation = locationFactor.find(
      (l) => l.country === employmentCountry && l.area === employmentArea,
    )

    if (!location || !employmentLocation) return

    const locationFactorValue = location?.locationFactor ?? 0
    formApi.setFieldValue(
      'locationFactor',
      Number(locationFactorValue.toFixed(2)),
    )

    const benchmarkValue = formApi.getFieldValue('benchmark')
    const benchmarkFactor = benchmarkValue?.includes('(old)')
      ? (latestSalary?.benchmarkFactor ?? 0)
      : (sfBenchmark[
          benchmarkValue?.replace(' (old)', '') as keyof typeof sfBenchmark
        ] ?? 0)
    formApi.setFieldValue('benchmarkFactor', Number(benchmarkFactor.toFixed(2)))

    const currentLocationFactor = formApi.getFieldValue('locationFactor') ?? 0
    const level = formApi.getFieldValue('level') ?? 1
    const step = formApi.getFieldValue('step') ?? 1
    let totalSalary = currentLocationFactor * level * step * benchmarkFactor
    if (!showOverride) {
      formApi.setFieldValue('totalSalary', Number(totalSalary.toFixed(2)))
    } else {
      totalSalary = formApi.getFieldValue('totalSalary') ?? totalSalary
    }

    let bonusPercentageValue = Object.keys(bonusPercentage).includes(
      benchmarkValue as keyof typeof bonusPercentage,
    )
      ? bonusPercentage[benchmarkValue as keyof typeof bonusPercentage]
      : 0
    if (!showOverride) {
      formApi.setFieldValue('bonusPercentage', bonusPercentageValue)
    } else {
      bonusPercentageValue = formApi.getFieldValue('bonusPercentage') ?? 0
    }
    const bonusAmount = Number((totalSalary * bonusPercentageValue).toFixed(2))
    formApi.setFieldValue('bonusAmount', bonusAmount)

    // Calculate change from the latest salary
    const latestTotalSalary = latestSalary?.totalSalary ?? 0
    const changePercentage =
      latestTotalSalary > 0 ? totalSalary / latestTotalSalary - 1 : 0
    formApi.setFieldValue(
      'changePercentage',
      Number(changePercentage.toFixed(4)),
    )

    const changeAmount = totalSalary - latestTotalSalary
    formApi.setFieldValue('changeAmount', Number(changeAmount.toFixed(2)))

    const exchangeRate = currencyData[employmentLocation?.currency ?? ''] ?? 1
    formApi.setFieldValue('exchangeRate', exchangeRate)
    formApi.setFieldValue(
      'localCurrency',
      currencyData[employmentLocation?.currency ?? '']
        ? employmentLocation?.currency
        : 'USD',
    )

    const totalSalaryLocal = totalSalary * exchangeRate
    formApi.setFieldValue(
      'totalSalaryLocal',
      Number(totalSalaryLocal.toFixed(2)),
    )

    const amountTakenInOptions =
      formApi.getFieldValue('amountTakenInOptions') ?? 0
    const actualSalary =
      totalSalary -
      amountTakenInOptions -
      totalAmountInStockOptions -
      bonusAmount
    formApi.setFieldValue('actualSalary', Number(actualSalary.toFixed(2)))

    const actualSalaryLocal = actualSalary * exchangeRate
    formApi.setFieldValue(
      'actualSalaryLocal',
      Number(actualSalaryLocal.toFixed(2)),
    )

    const equityRefreshPercentage =
      formApi.getFieldValue('equityRefreshPercentage') ?? 0
    const equityRefreshAmount =
      totalSalary *
      equityRefreshPercentage *
      (roleTypeOptions[
        roleType[
          (benchmarkValue?.replace(' (old)', '') ?? '') as keyof typeof roleType
        ]
      ] ?? 0)
    formApi.setFieldValue(
      'equityRefreshAmount',
      Number(equityRefreshAmount.toFixed(2)),
    )
  }

  const form = useForm({
    defaultValues: getDefaultValues(),
    onSubmit: async ({ value }) => {
      await updateSalary({ data: value })
      onSuccess()
      createToast('Salary added successfully.', {
        timeout: 3000,
      })
    },
    listeners: {
      onMount({ formApi }) {
        updateFormFields(formApi)
      },
      onChange: ({ formApi, fieldApi }) => {
        if (
          [
            'country',
            'area',
            'level',
            'step',
            'benchmark',
            'amountTakenInOptions',
            'equityRefreshPercentage',
            'employmentCountry',
            'employmentArea',
          ].includes(fieldApi.name)
        ) {
          updateFormFields(formApi, fieldApi.name)
        } else if (
          ['totalSalary', 'bonusPercentage'].includes(fieldApi.name) &&
          showOverride
        ) {
          updateFormFields(formApi)
        }
      },
    },
  })

  const level = useStore(form.store, (state) => state.values.level)
  const step = useStore(form.store, (state) => state.values.step)
  const benchmark = useStore(form.store, (state) => state.values.benchmark)
  const changePercentage = useStore(
    form.store,
    (state) => state.values.changePercentage,
  )
  const changeAmount = useStore(
    form.store,
    (state) => state.values.changeAmount,
  )
  const totalSalary = useStore(form.store, (state) => state.values.totalSalary)
  const benchmarkFactor = useStore(
    form.store,
    (state) => state.values.benchmarkFactor,
  )
  const area = useStore(form.store, (state) => state.values.area)
  const locationFactorValue = useStore(
    form.store,
    (state) => state.values.locationFactor,
  )
  const totalSalaryLocal = useStore(
    form.store,
    (state) => state.values.totalSalaryLocal,
  )
  const localCurrency = useStore(
    form.store,
    (state) => state.values.localCurrency,
  )
  const actualSalaryLocal = useStore(
    form.store,
    (state) => state.values.actualSalaryLocal,
  )
  const equityRefreshAmount = useStore(
    form.store,
    (state) => state.values.equityRefreshAmount,
  )

  useEffect(() => {
    setLevel(level)
    setStep(step)
    setBenchmark(benchmark)
  }, [level, step, benchmark, setLevel, setStep, setBenchmark])

  useEffect(() => {
    form.reset(getDefaultValues())
    form.mount()
  }, [employeeId])

  const country = useStore(form.store, (state) => state.values.country)
  const employmentCountry = useStore(
    form.store,
    (state) => state.values.employmentCountry,
  )

  return (
    <div className="mb-4 w-full bg-white">
      <div className="rounded-lg border border-green-600 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
        >
          <div className="mb-2 flex items-start justify-between">
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

          <div
            className={`mb-4 grid gap-4 ${
              eligibleForEquityRefresh ? 'grid-cols-6' : 'grid-cols-5'
            }`}
          >
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
                    <SelectTrigger className="w-full text-sm">
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
                    key={field.state.value}
                    value={field.state.value}
                    onValueChange={field.handleChange}
                  >
                    <SelectTrigger className="w-full text-sm">
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
                    <SelectTrigger className="w-full text-sm">
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
                  <Select
                    value={field.state.value.toString()}
                    onValueChange={(value) => field.handleChange(Number(value))}
                  >
                    <SelectTrigger className="h-6 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SALARY_LEVEL_OPTIONS.map(({ name, value }) => (
                        <SelectItem key={value} value={value.toString()}>
                          {name} ({value})
                        </SelectItem>
                      ))}
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

            {/* Equity Refresh Percentage */}
            {eligibleForEquityRefresh && (
              <form.Field
                name="equityRefreshPercentage"
                validators={{
                  onChange: ({ value }) => {
                    if (value < 0 || value > 1) {
                      return 'Equity refresh percentage must be between 0 and 1'
                    }
                  },
                }}
              >
                {(field) => (
                  <div>
                    <label className="text-xs font-medium text-gray-700">
                      Equity Refresh (%)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      max={1}
                      value={field.state.value}
                      onChange={(e) =>
                        field.handleChange(Number(e.target.value))
                      }
                      className={`text-sm ${
                        field.state.meta.errors.length > 0
                          ? 'border-red-500 ring-red-500'
                          : ''
                      }`}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="mt-1 text-xs text-red-500">
                        {field.state.meta.errors[0]}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
            )}

            {/* Actual Salary Override - conditionally shown */}
            {showOverride ? (
              <>
                <form.Field name="totalSalary">
                  {(field) => (
                    <div>
                      <label className="text-xs font-medium text-gray-700">
                        Total Salary ($) Override
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
                {showBonusPercentage ? (
                  <form.Field name="bonusPercentage">
                    {(field) => (
                      <div>
                        <label className="text-xs font-medium text-gray-700">
                          Bonus Percentage (%) Override
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          value={field.state.value}
                          onChange={(e) =>
                            field.handleChange(Number(e.target.value))
                          }
                          className="text-sm"
                          placeholder="Override bonus percentage"
                        />
                      </div>
                    )}
                  </form.Field>
                ) : null}
              </>
            ) : null}
          </div>

          {/* Employment Country and Area */}
          <div
            className={`mb-4 grid gap-4 ${
              eligibleForEquityRefresh ? 'grid-cols-6' : 'grid-cols-5'
            }`}
          >
            <form.Field name="employmentCountry">
              {(field) => (
                <div>
                  <label className="text-xs font-medium text-gray-700">
                    Employment Country
                  </label>
                  <Select
                    value={field.state.value}
                    onValueChange={field.handleChange}
                  >
                    <SelectTrigger className="w-full text-sm">
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

            <form.Field name="employmentArea">
              {(field) => (
                <div>
                  <label className="text-xs font-medium text-gray-700">
                    Employment Area
                  </label>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => {
                      if (value === '') return
                      field.handleChange(value)
                    }}
                    disabled={!employmentCountry}
                  >
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAreasByCountry(employmentCountry).map((area) => (
                        <SelectItem key={area} value={area}>
                          {area}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
          </div>

          {/* Calculated values display */}
          <div className="mb-4 rounded-lg bg-green-50 p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xl">
                  <span
                    className={`font-bold ${changePercentage > 0 ? 'text-green-600' : changePercentage < 0 ? 'text-red-600' : ''}`}
                  >
                    {changePercentage > 0 ? '+' : ''}
                    {(changePercentage * 100).toFixed(2)}%
                  </span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-400">
                    {changeAmount > 0 ? '+' : ''}
                    {formatCurrency(changeAmount)}
                  </span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-700">
                    {formatCurrency(totalSalary)}
                  </span>
                  {eligibleForEquityRefresh && equityRefreshAmount > 0 && (
                    <>
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-500">
                        Equity Refresh: {formatCurrency(equityRefreshAmount)}
                      </span>
                    </>
                  )}
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-600">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: localCurrency ?? 'USD',
                    }).format(totalSalaryLocal)}
                    {Math.abs(totalSalaryLocal - actualSalaryLocal) > 0.01 && (
                      <>
                        {' '}
                        (
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: localCurrency ?? 'USD',
                        }).format(actualSalaryLocal)}
                        )
                      </>
                    )}
                  </span>
                </div>
                <div className="mb-2 text-xs leading-none">
                  <span className="font-semibold">
                    {benchmark} ({benchmarkFactor})
                  </span>
                  <span className="ml-1 text-gray-600">
                    <span className="italic">in</span> {area},{' '}
                    {getCountryFlag(country)} {country} ({locationFactorValue})
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <div>
                  <div className="text-xl font-bold">
                    {level === 1 ? '1.0' : level}
                  </div>
                  <div className="text-center text-xs text-gray-500">level</div>
                </div>
                <div className="text-2xl text-gray-300">/</div>
                <div>
                  <div className="text-xl font-bold">{step}</div>
                  <div className="text-center text-xs text-gray-500">step</div>
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
