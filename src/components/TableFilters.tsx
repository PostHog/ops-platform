import { useState } from 'react'
import type { Table } from '@tanstack/react-table'
import type { Priority } from '@prisma/client'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { SALARY_LEVEL_OPTIONS } from '@/lib/utils'
import { PriorityBadge } from '@/components/PriorityBadge'

interface TableFiltersProps<TData> {
  table: Table<TData>
}

const PRIORITY_OPTIONS: Array<{ label: string; value: Priority }> = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
]

const STATUS_OPTIONS = [
  { label: 'Reviewed', value: true },
  { label: 'Needs Review', value: false },
]

export function TableFilters<TData>({ table }: TableFiltersProps<TData>) {
  const [nameFilterOpen, setNameFilterOpen] = useState(false)
  const [levelFilterOpen, setLevelFilterOpen] = useState(false)
  const [stepFilterOpen, setStepFilterOpen] = useState(false)
  const [priorityFilterOpen, setPriorityFilterOpen] = useState(false)
  const [reviewerFilterOpen, setReviewerFilterOpen] = useState(false)
  const [statusFilterOpen, setStatusFilterOpen] = useState(false)

  const nameColumn = table.getColumn('name')
  const nameFilterValue = (nameColumn?.getFilterValue() ?? '') as string

  const levelColumn = table.getColumn('level')
  const levelFilterValue = (levelColumn?.getFilterValue() ?? []) as number[]

  const stepLevelColumn = table.getColumn('stepLevel')
  const stepLevelFilterValue = (stepLevelColumn?.getFilterValue() ?? [
    '',
    '',
  ]) as [number | '', number | '']

  const priorityColumn = table.getColumn('priority')
  const priorityFilterValue = (priorityColumn?.getFilterValue() ??
    []) as Priority[]

  const reviewerColumn = table.getColumn('reviewer')
  const reviewerFilterValue = (reviewerColumn?.getFilterValue() ?? '') as string

  const statusColumn = table.getColumn('reviewed')
  const statusFilterValue = (statusColumn?.getFilterValue() ?? []) as boolean[]

  const toggleLevel = (levelValue: number) => {
    const current = levelFilterValue
    const newValue = current.includes(levelValue)
      ? current.filter((v) => v !== levelValue)
      : [...current, levelValue]

    levelColumn?.setFilterValue(newValue.length > 0 ? newValue : undefined)
  }

  const togglePriority = (priorityValue: Priority) => {
    const current = priorityFilterValue
    const newValue = current.includes(priorityValue)
      ? current.filter((v) => v !== priorityValue)
      : [...current, priorityValue]

    priorityColumn?.setFilterValue(newValue.length > 0 ? newValue : undefined)
  }

  const toggleStatus = (statusValue: boolean) => {
    const current = statusFilterValue
    const newValue = current.includes(statusValue)
      ? current.filter((v) => v !== statusValue)
      : [...current, statusValue]

    statusColumn?.setFilterValue(newValue.length > 0 ? newValue : undefined)
  }

  const hasStepFilter =
    stepLevelFilterValue[0] !== '' || stepLevelFilterValue[1] !== ''

  return (
    <div className="flex items-center gap-2 py-4">
      <div className="text-sm font-medium">Filters:</div>

      <Popover open={nameFilterOpen} onOpenChange={setNameFilterOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={nameFilterValue ? 'default' : 'outline'}
            size="sm"
            className="h-8"
          >
            Name
            {nameFilterValue && (
              <span className="ml-1 rounded-full bg-background px-1.5 text-xs text-foreground">
                1
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-2">
            <div className="font-medium text-sm">Filter by name</div>
            <Input
              placeholder="Search names, emails, or notes..."
              value={nameFilterValue}
              onChange={(e) => nameColumn?.setFilterValue(e.target.value)}
              className="h-8"
            />
            {nameFilterValue && (
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    nameColumn?.setFilterValue('')
                    setNameFilterOpen(false)
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

      <Popover open={levelFilterOpen} onOpenChange={setLevelFilterOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={levelFilterValue.length > 0 ? 'default' : 'outline'}
            size="sm"
            className="h-8"
          >
            Level
            {levelFilterValue.length > 0 && (
              <span className="ml-1 rounded-full bg-background px-1.5 text-xs text-foreground">
                {levelFilterValue.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-3">
            <div className="font-medium text-sm">Filter by level</div>
            <div className="space-y-2">
              {SALARY_LEVEL_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`level-${option.value}`}
                    checked={levelFilterValue.includes(option.value)}
                    onCheckedChange={() => toggleLevel(option.value)}
                  />
                  <label
                    htmlFor={`level-${option.value}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {option.name} ({option.value})
                  </label>
                </div>
              ))}
            </div>
            {levelFilterValue.length > 0 && (
              <div className="flex justify-end pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    levelColumn?.setFilterValue(undefined)
                    setLevelFilterOpen(false)
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

      <Popover open={stepFilterOpen} onOpenChange={setStepFilterOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={hasStepFilter ? 'default' : 'outline'}
            size="sm"
            className="h-8"
          >
            Step
            {hasStepFilter && (
              <span className="ml-1 rounded-full bg-background px-1.5 text-xs text-foreground">
                1
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-3">
            <div className="font-medium text-sm">Filter by step</div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Min</label>
                <Input
                  type="number"
                  placeholder="Min"
                  value={stepLevelFilterValue[0]}
                  onChange={(e) => {
                    const value = e.target.value === '' ? '' : Number(e.target.value)
                    const newValue: [number | '', number | ''] = [
                      value,
                      stepLevelFilterValue[1],
                    ]
                    stepLevelColumn?.setFilterValue(
                      newValue[0] === '' && newValue[1] === ''
                        ? undefined
                        : newValue,
                    )
                  }}
                  className="h-8"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Max</label>
                <Input
                  type="number"
                  placeholder="Max"
                  value={stepLevelFilterValue[1]}
                  onChange={(e) => {
                    const value = e.target.value === '' ? '' : Number(e.target.value)
                    const newValue: [number | '', number | ''] = [
                      stepLevelFilterValue[0],
                      value,
                    ]
                    stepLevelColumn?.setFilterValue(
                      newValue[0] === '' && newValue[1] === ''
                        ? undefined
                        : newValue,
                    )
                  }}
                  className="h-8"
                />
              </div>
            </div>
            {hasStepFilter && (
              <div className="flex justify-end pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    stepLevelColumn?.setFilterValue(undefined)
                    setStepFilterOpen(false)
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

      <Popover open={priorityFilterOpen} onOpenChange={setPriorityFilterOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={priorityFilterValue.length > 0 ? 'default' : 'outline'}
            size="sm"
            className="h-8"
          >
            Priority
            {priorityFilterValue.length > 0 && (
              <span className="ml-1 rounded-full bg-background px-1.5 text-xs text-foreground">
                {priorityFilterValue.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-3">
            <div className="font-medium text-sm">Filter by priority</div>
            <div className="space-y-2">
              {PRIORITY_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`priority-${option.value}`}
                    checked={priorityFilterValue.includes(option.value)}
                    onCheckedChange={() => togglePriority(option.value)}
                  />
                  <label
                    htmlFor={`priority-${option.value}`}
                    className="cursor-pointer flex-1"
                  >
                    <PriorityBadge priority={option.value} />
                  </label>
                </div>
              ))}
            </div>
            {priorityFilterValue.length > 0 && (
              <div className="flex justify-end pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    priorityColumn?.setFilterValue(undefined)
                    setPriorityFilterOpen(false)
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

      <Popover open={reviewerFilterOpen} onOpenChange={setReviewerFilterOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={reviewerFilterValue ? 'default' : 'outline'}
            size="sm"
            className="h-8"
          >
            Reviewer
            {reviewerFilterValue && (
              <span className="ml-1 rounded-full bg-background px-1.5 text-xs text-foreground">
                1
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-2">
            <div className="font-medium text-sm">Filter by reviewer</div>
            <Input
              placeholder="Search reviewer name..."
              value={reviewerFilterValue}
              onChange={(e) => reviewerColumn?.setFilterValue(e.target.value)}
              className="h-8"
            />
            {reviewerFilterValue && (
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    reviewerColumn?.setFilterValue('')
                    setReviewerFilterOpen(false)
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

      <Popover open={statusFilterOpen} onOpenChange={setStatusFilterOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={statusFilterValue.length > 0 ? 'default' : 'outline'}
            size="sm"
            className="h-8"
          >
            Status
            {statusFilterValue.length > 0 && (
              <span className="ml-1 rounded-full bg-background px-1.5 text-xs text-foreground">
                {statusFilterValue.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-3">
            <div className="font-medium text-sm">Filter by status</div>
            <div className="space-y-2">
              {STATUS_OPTIONS.map((option) => (
                <div key={String(option.value)} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${option.value}`}
                    checked={statusFilterValue.includes(option.value)}
                    onCheckedChange={() => toggleStatus(option.value)}
                  />
                  <label
                    htmlFor={`status-${option.value}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
            {statusFilterValue.length > 0 && (
              <div className="flex justify-end pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    statusColumn?.setFilterValue(undefined)
                    setStatusFilterOpen(false)
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
    </div>
  )
}
