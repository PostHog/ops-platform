import { useState, useMemo, useCallback, ReactNode, memo } from 'react'
import type { Table } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'

export type FilterType =
  | 'text'
  | 'multi-select'
  | 'range'
  | 'date-range'
  | 'percentage-range'

export interface FilterOption<T = string | number | boolean> {
  label: string
  value: T
  render?: (value: T) => ReactNode
}

export interface FilterConfig {
  columnId: string
  label: string
  type: FilterType
  options?: FilterOption[]
  placeholder?: string
  minLabel?: string
  maxLabel?: string
}

interface TableFiltersProps<TData> {
  table: Table<TData>
}

type ColumnMeta = {
  filterVariant?: string
  filterOptions?: Array<{ label: string; value: string }>
  filterLabel?: string
}

function formatLabel(label: string): string {
  return (
    label.charAt(0).toUpperCase() + label.slice(1).replace(/([A-Z])/g, ' $1')
  )
}

function getColumnLabel(columnId: string, def: any, meta?: ColumnMeta): string {
  if (meta?.filterLabel) return meta.filterLabel
  if (typeof def.header === 'string') return def.header
  return formatLabel(columnId)
}

function getFilterType(meta?: ColumnMeta): FilterType {
  const variant = meta?.filterVariant
  if (variant === 'select' || (meta?.filterOptions && !variant)) {
    return 'multi-select'
  }
  if (variant === 'dateRange') return 'date-range'
  if (variant === 'range') return 'range'
  return 'text'
}

const FilterPopover = memo(
  ({
    filter,
    hasValue,
    badgeCount,
    isOpen,
    onOpenChange,
    contentWidth = 'w-64',
    children,
  }: {
    filter: FilterConfig
    hasValue: boolean
    badgeCount?: number
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    contentWidth?: string
    children: ReactNode
  }) => (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant={hasValue ? 'default' : 'outline'}
          size="sm"
          className="h-8"
        >
          {filter.label}
          {hasValue && (
            <span className="bg-background text-foreground ml-1 rounded-full px-1.5 text-xs">
              {badgeCount ?? 1}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={contentWidth}
        align="start"
        onInteractOutside={(e) => {
          // Prevent closing when interacting with inputs
          const target = e.target as HTMLElement
          if (target.tagName === 'INPUT' || target.closest('input')) {
            e.preventDefault()
          }
        }}
      >
        <div className="space-y-3">
          <div className="text-sm font-medium">
            Filter by {filter.label.toLowerCase()}
          </div>
          {children}
        </div>
      </PopoverContent>
    </Popover>
  ),
)

FilterPopover.displayName = 'FilterPopover'

const ClearButton = memo(({ onClear }: { onClear: () => void }) => (
  <div className="flex justify-end border-t pt-2">
    <Button variant="ghost" size="sm" onClick={onClear} className="h-7 text-xs">
      Clear
    </Button>
  </div>
))

ClearButton.displayName = 'ClearButton'

export function TableFilters<TData>({ table }: TableFiltersProps<TData>) {
  const [filterOpenStates, setFilterOpenStates] = useState<
    Record<string, boolean>
  >({})

  const setFilterOpen = useCallback((columnId: string, open: boolean) => {
    setFilterOpenStates((prev) => ({ ...prev, [columnId]: open }))
  }, [])

  const columns = table.getAllColumns()
  // Track filter options changes to re-compute filters when dynamic options load
  const filterOptionsKey = columns
    .map(
      (col) =>
        (col.columnDef.meta as ColumnMeta | undefined)?.filterOptions?.length ??
        0,
    )
    .join(',')
  const filters: FilterConfig[] = useMemo(
    () =>
      columns
        .filter((col) => col.columnDef.enableColumnFilter !== false)
        .map((column) => {
          const def = column.columnDef
          const meta = def.meta as ColumnMeta | undefined

          return {
            columnId: column.id,
            label: getColumnLabel(column.id, def, meta),
            type: getFilterType(meta),
            options: meta?.filterOptions?.map((opt) => ({
              label: opt.label,
              value: opt.value as string | number | boolean,
            })),
          }
        })
        .filter((filter) => table.getColumn(filter.columnId) != null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table, filterOptionsKey],
  )

  // Create stable onOpenChange callbacks for each filter
  const onOpenChangeCallbacks = useMemo(() => {
    const callbacks: Record<string, (open: boolean) => void> = {}
    filters.forEach((filter) => {
      callbacks[filter.columnId] = (open: boolean) =>
        setFilterOpen(filter.columnId, open)
    })
    return callbacks
  }, [filters, setFilterOpen])

  const renderFilter = (filter: FilterConfig) => {
    const column = table.getColumn(filter.columnId)
    if (!column) return null

    const filterValue = column.getFilterValue()
    const isOpen = filterOpenStates[filter.columnId] ?? false

    switch (filter.type) {
      case 'text':
        return renderTextFilter(filter, filterValue as string, isOpen, column)
      case 'multi-select':
        return renderMultiSelectFilter(
          filter,
          filterValue as Array<string | number | boolean>,
          isOpen,
          column,
        )
      case 'range':
      case 'percentage-range':
        return renderRangeFilter(
          filter,
          filterValue as [number | '', number | ''],
          isOpen,
          column,
        )
      case 'date-range':
        return renderDateRangeFilter(
          filter,
          filterValue as [string, string],
          isOpen,
          column,
        )
      default:
        return null
    }
  }

  type ColumnType = ReturnType<typeof table.getColumn>

  const renderTextFilter = (
    filter: FilterConfig,
    value: string,
    isOpen: boolean,
    column: ColumnType,
  ) => {
    const hasValue = !!value
    return (
      <FilterPopover
        filter={filter}
        hasValue={hasValue}
        isOpen={isOpen}
        onOpenChange={onOpenChangeCallbacks[filter.columnId]}
        contentWidth="w-80"
      >
        <div className="space-y-2">
          <Input
            placeholder={filter.placeholder || 'Search...'}
            value={value || ''}
            onChange={(e) => column?.setFilterValue(e.target.value)}
            className="h-8"
          />
          {hasValue && (
            <ClearButton
              onClear={() => {
                column?.setFilterValue('')
                setFilterOpen(filter.columnId, false)
              }}
            />
          )}
        </div>
      </FilterPopover>
    )
  }

  const renderMultiSelectFilter = (
    filter: FilterConfig,
    value: Array<string | number | boolean>,
    isOpen: boolean,
    column: ColumnType,
  ) => {
    const currentValue = (value ?? []) as Array<string | number | boolean>
    const hasValue = currentValue.length > 0

    const toggleValue = (optionValue: string | number | boolean) => {
      const newValue = currentValue.includes(optionValue)
        ? currentValue.filter((v) => v !== optionValue)
        : [...currentValue, optionValue]
      column?.setFilterValue(newValue.length > 0 ? newValue : undefined)
    }

    return (
      <FilterPopover
        filter={filter}
        hasValue={hasValue}
        badgeCount={currentValue.length}
        isOpen={isOpen}
        onOpenChange={(open) => setFilterOpen(filter.columnId, open)}
      >
        <div className="space-y-2">
          {filter.options?.map((option) => (
            <div
              key={String(option.value)}
              className="flex items-center space-x-2"
            >
              <Checkbox
                id={`${filter.columnId}-${option.value}`}
                checked={currentValue.includes(option.value)}
                onCheckedChange={() => toggleValue(option.value)}
              />
              <label
                htmlFor={`${filter.columnId}-${option.value}`}
                className="flex-1 cursor-pointer text-sm"
              >
                {option.render ? option.render(option.value) : option.label}
              </label>
            </div>
          ))}
        </div>
        {hasValue && (
          <ClearButton
            onClear={() => {
              column?.setFilterValue(undefined)
              setFilterOpen(filter.columnId, false)
            }}
          />
        )}
      </FilterPopover>
    )
  }

  const updateRangeValue = (
    currentValue: [number | '', number | ''],
    index: 0 | 1,
    newVal: string,
    column: ColumnType,
  ) => {
    const newValue: [number | '', number | ''] = [...currentValue]
    newValue[index] = newVal === '' ? '' : Number(newVal)
    column?.setFilterValue(
      newValue[0] === '' && newValue[1] === '' ? undefined : newValue,
    )
  }

  const updateDateRangeValue = (
    currentValue: [string, string],
    index: 0 | 1,
    newVal: string,
    column: ColumnType,
  ) => {
    const newValue: [string, string] = [...currentValue]
    newValue[index] = newVal
    column?.setFilterValue(
      newValue[0] === '' && newValue[1] === '' ? undefined : newValue,
    )
  }

  const renderRangeFilter = (
    filter: FilterConfig,
    value: [number | '', number | ''],
    isOpen: boolean,
    column: ColumnType,
  ) => {
    const currentValue = (value ?? ['', '']) as [number | '', number | '']
    const hasValue = currentValue[0] !== '' || currentValue[1] !== ''
    const isPercentage = filter.type === 'percentage-range'
    const minLabel = filter.minLabel || (isPercentage ? 'Min %' : 'Min')
    const maxLabel = filter.maxLabel || (isPercentage ? 'Max %' : 'Max')

    return (
      <FilterPopover
        filter={filter}
        hasValue={hasValue}
        isOpen={isOpen}
        onOpenChange={(open) => setFilterOpen(filter.columnId, open)}
      >
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="text-muted-foreground text-xs">{minLabel}</label>
            <Input
              type="number"
              step="0.01"
              placeholder="Min"
              value={currentValue[0]}
              onChange={(e) =>
                updateRangeValue(currentValue, 0, e.target.value, column)
              }
              className="h-8"
            />
          </div>
          <div className="flex-1">
            <label className="text-muted-foreground text-xs">{maxLabel}</label>
            <Input
              type="number"
              step="0.01"
              placeholder="Max"
              value={currentValue[1]}
              onChange={(e) =>
                updateRangeValue(currentValue, 1, e.target.value, column)
              }
              className="h-8"
            />
          </div>
        </div>
        {hasValue && (
          <ClearButton
            onClear={() => {
              column?.setFilterValue(undefined)
              setFilterOpen(filter.columnId, false)
            }}
          />
        )}
      </FilterPopover>
    )
  }

  const renderDateRangeFilter = (
    filter: FilterConfig,
    value: [string, string],
    isOpen: boolean,
    column: ColumnType,
  ) => {
    const currentValue = (value ?? ['', '']) as [string, string]
    const hasValue = currentValue[0] !== '' || currentValue[1] !== ''

    return (
      <FilterPopover
        filter={filter}
        hasValue={hasValue}
        isOpen={isOpen}
        onOpenChange={(open) => setFilterOpen(filter.columnId, open)}
        contentWidth="w-80"
      >
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="text-muted-foreground text-xs">From</label>
            <Input
              type="date"
              value={currentValue[0]}
              onChange={(e) =>
                updateDateRangeValue(currentValue, 0, e.target.value, column)
              }
              className="h-8"
            />
          </div>
          <div className="flex-1">
            <label className="text-muted-foreground text-xs">To</label>
            <Input
              type="date"
              value={currentValue[1]}
              onChange={(e) =>
                updateDateRangeValue(currentValue, 1, e.target.value, column)
              }
              className="h-8"
            />
          </div>
        </div>
        {hasValue && (
          <ClearButton
            onClear={() => {
              column?.setFilterValue(undefined)
              setFilterOpen(filter.columnId, false)
            }}
          />
        )}
      </FilterPopover>
    )
  }

  return (
    <div className="flex items-center gap-2 py-4">
      <div className="text-sm font-medium">Filters:</div>
      {filters.map((filter) => (
        <div key={filter.columnId}>{renderFilter(filter)}</div>
      ))}
    </div>
  )
}
