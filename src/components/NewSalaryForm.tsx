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
import { TableRow, TableCell } from './ui/table'
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
  showDetailedColumns,
  totalAmountInStockOptions,
  benchmarkUpdated,
  setLevel,
  setStep,
  setBenchmark,
  showBonusPercentage,
  displayMode,
}: {
  employeeId: string
  showOverride: boolean
  setShowOverride: (showOverride: boolean) => void
  onSuccess: () => void
  onCancel: () => void
  latestSalary: Salary | undefined
  showDetailedColumns: boolean
  totalAmountInStockOptions: number
  benchmarkUpdated: boolean
  setLevel: (level: number) => void
  setStep: (step: number) => void
  setBenchmark: (benchmark: string) => void
  showBonusPercentage: boolean
  displayMode: 'inline' | 'card'
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
    notes: '',
    employeeId: employeeId,
  })

  const updateFormFields = (formApi: AnyFormApi) => {
    const location = locationFactor.find(
      (l) =>
        l.country === formApi.getFieldValue('country') &&
        l.area === formApi.getFieldValue('area'),
    )
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

    const exchangeRate = currencyData[location?.currency ?? ''] ?? 1
    formApi.setFieldValue('exchangeRate', exchangeRate)
    formApi.setFieldValue(
      'localCurrency',
      currencyData[location?.currency ?? ''] ? location?.currency : 'USD',
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
      roleTypeOptions[roleType[benchmarkValue as keyof typeof roleType]]
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
          ].includes(fieldApi.name)
        ) {
          updateFormFields(formApi)
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
  const canSubmit = useStore(form.store, (state) => state.canSubmit)
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

  if (displayMode === 'inline')
    return (
      <TableRow className="bg-blue-50">
        <TableCell>
          <div className="text-xs text-gray-500">New Entry</div>
        </TableCell>
        <TableCell>
          <form.Field
            name="country"
            children={(field) => (
              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value)}
              >
                <SelectTrigger className="h-6 w-full text-xs">
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
            )}
          />
        </TableCell>
        <TableCell>
          <form.Field
            name="area"
            children={(field) => (
              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value)}
                disabled={!country}
              >
                <SelectTrigger className="h-6 w-full text-xs">
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
            )}
          />
        </TableCell>
        <TableCell>
          <form.Field
            name="benchmark"
            children={(field) => (
              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value)}
              >
                <SelectTrigger className="h-6 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {benchmarkUpdated ? (
                    <SelectItem
                      value={`${latestSalary?.benchmark?.replace(' (old)', '')} (old)`}
                      key="old-benchmark"
                    >
                      {latestSalary?.benchmark?.replace(' (old)', '')} (old) (
                      {latestSalary?.benchmarkFactor})
                    </SelectItem>
                  ) : null}
                  {Object.keys(sfBenchmark).map((benchmark) => (
                    <SelectItem key={benchmark} value={benchmark}>
                      {benchmark} ({sfBenchmark[benchmark]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </TableCell>
        <TableCell>
          <form.Field
            name="locationFactor"
            children={(field) => (
              <div className="px-1 py-1 text-right text-xs">
                {field.state.value}
              </div>
            )}
          />
        </TableCell>
        <TableCell>
          <form.Field
            name="level"
            children={(field) => (
              <Select
                value={field.state.value.toString()}
                onValueChange={(value) => field.handleChange(Number(value))}
              >
                <SelectTrigger className="h-6 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SALARY_LEVEL_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value.toString()}
                    >
                      {option.name} ({option.value})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </TableCell>
        <TableCell>
          <form.Field
            name="step"
            validators={{
              onChange: ({ value }) => {
                if (value < 0.85 || value > 1.2) {
                  return 'Step must be between 0.85 and 1.2'
                }
              },
            }}
            children={(field) => (
              <Input
                className={
                  'h-6 w-full min-w-[70px] text-xs' +
                  (field.state.meta.errors.length > 0
                    ? ' border-red-500 ring-red-500'
                    : '')
                }
                value={field.state.value}
                type="number"
                step={0.01}
                min={0.85}
                max={1.2}
                onChange={(e) => field.handleChange(Number(e.target.value))}
              />
            )}
          />
        </TableCell>
        {showBonusPercentage ? (
          <TableCell>
            <form.Field
              name="bonusPercentage"
              validators={{
                onChange: ({ value }) => {
                  if (value < 0 || value > 1) {
                    return 'Bonus percentage must be between 0 and 1'
                  }
                },
              }}
              children={(field) => {
                if (showOverride) {
                  return (
                    <Input
                      className={
                        'h-6 w-full min-w-[70px] text-xs' +
                        (field.state.meta.errors.length > 0
                          ? ' border-red-500 ring-red-500'
                          : '')
                      }
                      value={field.state.value}
                      type="number"
                      step={0.01}
                      min={0}
                      max={1}
                      onChange={(e) =>
                        field.handleChange(Number(e.target.value))
                      }
                    />
                  )
                }

                return (
                  <div className="px-1 py-1 text-right text-xs">
                    {(field.state.value * 100).toFixed(2)}%
                  </div>
                )
              }}
            />
          </TableCell>
        ) : null}

        <TableCell>
          <form.Field
            name="totalSalary"
            children={(field) => {
              const locationFactor = form.getFieldValue('locationFactor') ?? 0
              const level = form.getFieldValue('level') ?? 1
              const step = form.getFieldValue('step') ?? 1
              const benchmarkFactor = form.getFieldValue('benchmarkFactor') ?? 0
              const expectedTotal =
                locationFactor * level * step * benchmarkFactor
              const isMismatch =
                Math.abs(field.state.value - expectedTotal) > 0.01

              if (showOverride) {
                return (
                  <Input
                    className="h-6 w-full min-w-[70px] text-xs"
                    value={field.state.value}
                    type="number"
                    step={1}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                  />
                )
              }

              return (
                <div
                  className={`px-1 py-1 text-right text-xs ${isMismatch ? 'font-medium text-red-600' : ''}`}
                  title={
                    isMismatch
                      ? `Mismatch detected! Expected: ${formatCurrency(expectedTotal)}, Actual: ${formatCurrency(field.state.value)}`
                      : ''
                  }
                >
                  {formatCurrency(field.state.value)}
                </div>
              )
            }}
          />
        </TableCell>
        <TableCell>
          <form.Field
            name="changeAmount"
            children={(field) => (
              <div className="px-1 py-1 text-right text-xs">
                {formatCurrency(field.state.value)}
              </div>
            )}
          />
        </TableCell>
        <TableCell>
          <form.Field
            name="changePercentage"
            children={(field) => (
              <div className="px-1 py-1 text-right text-xs">
                {(field.state.value * 100).toFixed(2)}%
              </div>
            )}
          />
        </TableCell>
        <TableCell>
          <form.Field
            name="notes"
            children={(field) => (
              <Textarea
                className="min-h-[24px] w-full resize-none !text-xs text-xs"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Notes..."
                autoFocus
              />
            )}
          />
        </TableCell>
        <TableCell>
          <div className="flex items-center justify-center text-gray-400">
            <span className="text-xs">{showDetailedColumns ? '▶' : '◀'}</span>
          </div>
        </TableCell>
        {showDetailedColumns && (
          <>
            <TableCell>
              <form.Field
                name="exchangeRate"
                children={(field) => (
                  <div className="px-1 py-1 text-right text-xs">
                    {field.state.value}
                  </div>
                )}
              />
            </TableCell>
            <TableCell>
              <form.Field
                name="totalSalaryLocal"
                children={(field) => {
                  const localCurrency =
                    form.getFieldValue('localCurrency') ?? 'USD'
                  return (
                    <div className="px-1 py-1 text-right text-xs">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: localCurrency,
                      }).format(field.state.value)}
                    </div>
                  )
                }}
              />
            </TableCell>
            <TableCell>
              <form.Field
                name="amountTakenInOptions"
                children={(field) => (
                  <Input
                    className="h-6 w-full text-xs"
                    value={field.state.value}
                    type="number"
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                  />
                )}
              />
            </TableCell>
            <TableCell>
              <form.Field
                name="actualSalary"
                children={(field) => (
                  <div className="px-1 py-1 text-right text-xs">
                    {formatCurrency(field.state.value)}
                  </div>
                )}
              />
            </TableCell>
            <TableCell>
              <form.Field
                name="actualSalaryLocal"
                children={(field) => {
                  const localCurrency =
                    form.getFieldValue('localCurrency') ?? 'USD'
                  return (
                    <div className="px-1 py-1 text-right text-xs">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: localCurrency,
                      }).format(field.state.value)}
                    </div>
                  )
                }}
              />
            </TableCell>
            <TableCell>
              <form.Field
                name="equityRefreshPercentage"
                validators={{
                  onChange: ({ value }) => {
                    if (value < 0 || value > 1) {
                      return 'Equity refresh percentage must be between 0 and 1'
                    }
                  },
                }}
                children={(field) => (
                  <Input
                    className={
                      'h-6 w-full min-w-[70px] text-xs' +
                      (field.state.meta.errors.length > 0
                        ? ' border-red-500 ring-red-500'
                        : '')
                    }
                    value={field.state.value}
                    type="number"
                    step={0.01}
                    min={0}
                    max={1}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                  />
                )}
              />
            </TableCell>
            <TableCell>
              <form.Field
                name="equityRefreshAmount"
                children={(field) => {
                  return (
                    <div className="px-1 py-1 text-right text-xs">
                      {formatCurrency(field.state.value)}
                    </div>
                  )
                }}
              />
            </TableCell>
          </>
        )}
        <TableCell>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              disabled={!canSubmit}
              onClick={(e) => {
                e.preventDefault()
                form.handleSubmit()
              }}
              className="h-6 px-2 text-xs"
            >
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onCancel}
              className="h-6 px-2 text-xs"
            >
              Cancel
            </Button>
          </div>
        </TableCell>
      </TableRow>
    )

  return (
    <div className="mb-4 max-w-5xl bg-white">
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

          <div className="mb-4 grid grid-cols-5 gap-4">
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

          {/* Calculated values display */}
          <div className="mb-4 rounded-lg bg-green-50 p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xl">
                  <span
                    className={`font-bold ${changePercentage > 0 ? 'text-green-600' : changePercentage < 0 ? 'text-red-600' : ''}`}
                  >
                    {changePercentage >= 0 ? '+' : ''}
                    {(changePercentage * 100).toFixed(2)}%
                  </span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-400">
                    {changeAmount >= 0 ? '+' : ''}
                    {formatCurrency(changeAmount)}
                  </span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-700">
                    {formatCurrency(totalSalary)}
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
