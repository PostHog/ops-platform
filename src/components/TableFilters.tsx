import { useState, ReactNode } from 'react'
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

export function TableFilters<TData>({ table }: TableFiltersProps<TData>) {
  const [filterOpenStates, setFilterOpenStates] = useState<
    Record<string, boolean>
  >({})

  const setFilterOpen = (columnId: string, open: boolean) => {
    setFilterOpenStates((prev) => ({ ...prev, [columnId]: open }))
  }

  // Derive filters from columns
  const filters: FilterConfig[] = table
    .getAllColumns()
    .filter((column) => {
      const def = column.columnDef
      return def.enableColumnFilter !== false
    })
    .map((column) => {
      const def = column.columnDef
      const columnId = column.id
      const meta = def.meta as
        | {
            filterVariant?: string
            filterOptions?: Array<{ label: string; value: string }>
            filterLabel?: string
          }
        | undefined

      // Get label from filterLabel (meta), header, or use columnId
      let label = columnId
      if (meta?.filterLabel) {
        label = meta.filterLabel
      } else if (typeof def.header === 'string') {
        label = def.header
      } else if (typeof def.header === 'function') {
        // Try to extract text from React element (fallback to columnId)
        label = columnId
      }

      // Map filterVariant to our FilterType
      const filterVariant = meta?.filterVariant
      let type: FilterType = 'text' // default

      // If filterOptions is present, default to multi-select unless another type is specified
      if (
        filterVariant === 'select' ||
        (meta?.filterOptions && !filterVariant)
      ) {
        type = 'multi-select'
      } else if (filterVariant === 'dateRange') {
        type = 'date-range'
      } else if (filterVariant === 'range') {
        type = 'range'
      }

      // Convert filterOptions to our FilterOption format
      const options =
        meta?.filterOptions?.map((opt) => ({
          label: opt.label,
          value: opt.value as string | number | boolean,
        })) ?? undefined

      return {
        columnId,
        label: meta?.filterLabel
          ? label
          : label.charAt(0).toUpperCase() +
            label.slice(1).replace(/([A-Z])/g, ' $1'),
        type,
        options,
      }
    })
    .filter((filter) => {
      // Only include filters that have a valid type or can be inferred
      const column = table.getColumn(filter.columnId)
      return column != null
    })

  const getFilterValue = (columnId: string) => {
    const column = table.getColumn(columnId)
    return column?.getFilterValue()
  }

  const renderFilter = (filter: FilterConfig) => {
    const column = table.getColumn(filter.columnId)
    if (!column) return null

    const filterValue = getFilterValue(filter.columnId)
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
      case 'percentage-range':
        return renderPercentageRangeFilter(
          filter,
          filterValue as [number | '', number | ''],
          isOpen,
          column,
        )
      default:
        return null
    }
  }

  const renderTextFilter = (
    filter: FilterConfig,
    value: string,
    isOpen: boolean,
    column: ReturnType<typeof table.getColumn>,
  ) => {
    const hasValue = !!value
    return (
      <Popover
        open={isOpen}
        onOpenChange={(open) => setFilterOpen(filter.columnId, open)}
      >
        <PopoverTrigger asChild>
          <Button
            variant={hasValue ? 'default' : 'outline'}
            size="sm"
            className="h-8"
          >
            {filter.label}
            {hasValue && (
              <span className="bg-background text-foreground ml-1 rounded-full px-1.5 text-xs">
                1
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-2">
            <div className="text-sm font-medium">
              Filter by {filter.label.toLowerCase()}
            </div>
            <Input
              placeholder={filter.placeholder || 'Search...'}
              value={value || ''}
              onChange={(e) => column?.setFilterValue(e.target.value)}
              className="h-8"
            />
            {hasValue && (
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    column?.setFilterValue('')
                    setFilterOpen(filter.columnId, false)
                  }}
                  className="h-7 text-xs"
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  const renderMultiSelectFilter = (
    filter: FilterConfig,
    value: Array<string | number | boolean>,
    isOpen: boolean,
    column: ReturnType<typeof table.getColumn>,
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
      <Popover
        open={isOpen}
        onOpenChange={(open) => setFilterOpen(filter.columnId, open)}
      >
        <PopoverTrigger asChild>
          <Button
            variant={hasValue ? 'default' : 'outline'}
            size="sm"
            className="h-8"
          >
            {filter.label}
            {hasValue && (
              <span className="bg-background text-foreground ml-1 rounded-full px-1.5 text-xs">
                {currentValue.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-3">
            <div className="text-sm font-medium">
              Filter by {filter.label.toLowerCase()}
            </div>
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
              <div className="flex justify-end border-t pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    column?.setFilterValue(undefined)
                    setFilterOpen(filter.columnId, false)
                  }}
                  className="h-7 text-xs"
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  const renderRangeFilter = (
    filter: FilterConfig,
    value: [number | '', number | ''],
    isOpen: boolean,
    column: ReturnType<typeof table.getColumn>,
  ) => {
    const currentValue = (value ?? ['', '']) as [number | '', number | '']
    const hasValue = currentValue[0] !== '' || currentValue[1] !== ''

    return (
      <Popover
        open={isOpen}
        onOpenChange={(open) => setFilterOpen(filter.columnId, open)}
      >
        <PopoverTrigger asChild>
          <Button
            variant={hasValue ? 'default' : 'outline'}
            size="sm"
            className="h-8"
          >
            {filter.label}
            {hasValue && (
              <span className="bg-background text-foreground ml-1 rounded-full px-1.5 text-xs">
                1
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-3">
            <div className="text-sm font-medium">
              Filter by {filter.label.toLowerCase()}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-muted-foreground text-xs">
                  {filter.minLabel || 'Min'}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Min"
                  value={currentValue[0]}
                  onChange={(e) => {
                    const newValue: [number | '', number | ''] = [
                      e.target.value === '' ? '' : Number(e.target.value),
                      currentValue[1],
                    ]
                    column?.setFilterValue(
                      newValue[0] === '' && newValue[1] === ''
                        ? undefined
                        : newValue,
                    )
                  }}
                  className="h-8"
                />
              </div>
              <div className="flex-1">
                <label className="text-muted-foreground text-xs">
                  {filter.maxLabel || 'Max'}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Max"
                  value={currentValue[1]}
                  onChange={(e) => {
                    const newValue: [number | '', number | ''] = [
                      currentValue[0],
                      e.target.value === '' ? '' : Number(e.target.value),
                    ]
                    column?.setFilterValue(
                      newValue[0] === '' && newValue[1] === ''
                        ? undefined
                        : newValue,
                    )
                  }}
                  className="h-8"
                />
              </div>
            </div>
            {hasValue && (
              <div className="flex justify-end border-t pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    column?.setFilterValue(undefined)
                    setFilterOpen(filter.columnId, false)
                  }}
                  className="h-7 text-xs"
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  const renderDateRangeFilter = (
    filter: FilterConfig,
    value: [string, string],
    isOpen: boolean,
    column: ReturnType<typeof table.getColumn>,
  ) => {
    const currentValue = (value ?? ['', '']) as [string, string]
    const hasValue = currentValue[0] !== '' || currentValue[1] !== ''

    return (
      <Popover
        open={isOpen}
        onOpenChange={(open) => setFilterOpen(filter.columnId, open)}
      >
        <PopoverTrigger asChild>
          <Button
            variant={hasValue ? 'default' : 'outline'}
            size="sm"
            className="h-8"
          >
            {filter.label}
            {hasValue && (
              <span className="bg-background text-foreground ml-1 rounded-full px-1.5 text-xs">
                1
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-3">
            <div className="text-sm font-medium">
              Filter by {filter.label.toLowerCase()}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-muted-foreground text-xs">From</label>
                <Input
                  type="date"
                  value={currentValue[0]}
                  onChange={(e) => {
                    const newValue: [string, string] = [
                      e.target.value,
                      currentValue[1],
                    ]
                    column?.setFilterValue(
                      newValue[0] === '' && newValue[1] === ''
                        ? undefined
                        : newValue,
                    )
                  }}
                  className="h-8"
                />
              </div>
              <div className="flex-1">
                <label className="text-muted-foreground text-xs">To</label>
                <Input
                  type="date"
                  value={currentValue[1]}
                  onChange={(e) => {
                    const newValue: [string, string] = [
                      currentValue[0],
                      e.target.value,
                    ]
                    column?.setFilterValue(
                      newValue[0] === '' && newValue[1] === ''
                        ? undefined
                        : newValue,
                    )
                  }}
                  className="h-8"
                />
              </div>
            </div>
            {hasValue && (
              <div className="flex justify-end border-t pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    column?.setFilterValue(undefined)
                    setFilterOpen(filter.columnId, false)
                  }}
                  className="h-7 text-xs"
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  const renderPercentageRangeFilter = (
    filter: FilterConfig,
    value: [number | '', number | ''],
    isOpen: boolean,
    column: ReturnType<typeof table.getColumn>,
  ) => {
    const currentValue = (value ?? ['', '']) as [number | '', number | '']
    const hasValue = currentValue[0] !== '' || currentValue[1] !== ''

    return (
      <Popover
        open={isOpen}
        onOpenChange={(open) => setFilterOpen(filter.columnId, open)}
      >
        <PopoverTrigger asChild>
          <Button
            variant={hasValue ? 'default' : 'outline'}
            size="sm"
            className="h-8"
          >
            {filter.label}
            {hasValue && (
              <span className="bg-background text-foreground ml-1 rounded-full px-1.5 text-xs">
                1
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-3">
            <div className="text-sm font-medium">
              Filter by {filter.label.toLowerCase()}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-muted-foreground text-xs">
                  {filter.minLabel || 'Min %'}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Min"
                  value={currentValue[0]}
                  onChange={(e) => {
                    const newValue: [number | '', number | ''] = [
                      e.target.value === '' ? '' : Number(e.target.value),
                      currentValue[1],
                    ]
                    column?.setFilterValue(
                      newValue[0] === '' && newValue[1] === ''
                        ? undefined
                        : newValue,
                    )
                  }}
                  className="h-8"
                />
              </div>
              <div className="flex-1">
                <label className="text-muted-foreground text-xs">
                  {filter.maxLabel || 'Max %'}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Max"
                  value={currentValue[1]}
                  onChange={(e) => {
                    const newValue: [number | '', number | ''] = [
                      currentValue[0],
                      e.target.value === '' ? '' : Number(e.target.value),
                    ]
                    column?.setFilterValue(
                      newValue[0] === '' && newValue[1] === ''
                        ? undefined
                        : newValue,
                    )
                  }}
                  className="h-8"
                />
              </div>
            </div>
            {hasValue && (
              <div className="flex justify-end border-t pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    column?.setFilterValue(undefined)
                    setFilterOpen(filter.columnId, false)
                  }}
                  className="h-7 text-xs"
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
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
