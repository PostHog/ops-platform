import { useEffect, useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ChevronDown, Filter as FilterIcon, MoreHorizontal } from 'lucide-react'
import { useServerFn } from '@tanstack/react-start'
import { useQuery } from '@tanstack/react-query'
import { createToast } from 'vercel-toast'
import { useAtom } from 'jotai'
import { useLocalStorage } from 'usehooks-ts'
import type { InputHTMLAttributes } from 'react'
import type {
  Column,
  ColumnDef,
  ColumnFiltersState,
  Row,
  RowData,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table'
import type { Priority, Prisma } from '@prisma/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import prisma from '@/db'
import { formatCurrency } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import 'vercel-toast/dist/vercel-toast.css'
import { reviewQueueAtom } from '@/atoms'
import { createAuthenticatedFn } from '@/lib/auth-middleware'

export const Route = createFileRoute('/')({
  component: App,
})

type Employee = Prisma.EmployeeGetPayload<{
  include: {
    salaries: {
      orderBy: {
        timestamp: 'desc'
      }
    }
    deelEmployee: {
      include: {
        topLevelManager: true
      }
    }
  }
}>

declare module '@tanstack/react-table' {
  // allows us to define custom properties for our columns
  interface ColumnMeta<TData extends RowData, TValue> {
    filterVariant?: 'text' | 'range' | 'select' | 'dateRange'
    filterOptions?: Array<{ label: string; value: string }>
  }
}

export const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const getEmployees = createAuthenticatedFn({
  method: 'GET',
}).handler(async () => {
  return await prisma.employee.findMany({
    include: {
      salaries: {
        orderBy: {
          timestamp: 'desc',
        },
        take: 1,
      },
      deelEmployee: {
        include: {
          topLevelManager: true,
        },
      },
    },
    where: {
      salaries: { some: {} },
      deelEmployee: {
        startDate: {
          lte: new Date(),
        },
      },
    },
    orderBy: {
      deelEmployee: {
        name: 'asc',
      },
    },
  })
})

const updateEmployeePriority = createAuthenticatedFn({
  method: 'POST',
})
  .inputValidator((d: { employeeId: string; priority: string }) => d)
  .handler(async ({ data }) => {
    if (!data.priority) return
    return await prisma.employee.update({
      where: { id: data.employeeId },
      data: { priority: data.priority as Priority },
    })
  })

export const customFilterFns = {
  inDateRange: (
    row: Row<Employee>,
    _: string,
    filterValue: [string | undefined, string | undefined],
  ) => {
    const [minStr, maxStr] = filterValue
    const date = new Date(row.original.salaries?.[0]?.timestamp)
    const value = date.getTime()

    const min = minStr ? new Date(minStr).getTime() : undefined
    const max = maxStr ? new Date(maxStr).getTime() : undefined

    if (min !== undefined && value < min) return false
    if (max !== undefined && value > max) return false
    return true
  },
  inNumberRange: (
    value: number,
    _: string,
    filterValue: [number | undefined, number | undefined],
  ) => {
    const [min, max] = filterValue as [number | '', number | '']

    if (min !== '' && value < min) return false
    if (max !== '' && value > max) return false
    return true
  },
  containsText: (value: string, _: string, filterValue: string) => {
    if (filterValue !== '' && !value.toLowerCase().includes(filterValue))
      return false
    return true
  },
  equals: (value: string, _: string, filterValue: string) => {
    if (filterValue !== '' && value !== filterValue) return false
    return true
  },
}

function App() {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useLocalStorage<ColumnFiltersState>(
    'employees.table',
    [],
  )
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [_, setReviewQueue] = useAtom(reviewQueueAtom)

  const getEmployeesFn = useServerFn(getEmployees)

  const {
    data: employees,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['employees'],
    queryFn: () => getEmployeesFn(),
  })

  const columns: Array<ColumnDef<Employee>> = [
    {
      accessorKey: 'name',
      header: 'Name',
      meta: {
        filterVariant: 'text',
      },
      filterFn: (row: Row<Employee>, _: string, filterValue: string) =>
        (row.original.deelEmployee?.name &&
          customFilterFns.containsText(
            row.original.deelEmployee?.name,
            _,
            filterValue,
          )) ||
        customFilterFns.containsText(row.original.email, _, filterValue),
      cell: ({ row }) => (
        <div>{row.original.deelEmployee?.name || row.original.email}</div>
      ),
    },
    {
      accessorKey: 'timestamp',
      header: 'Last Change (date)',
      meta: {
        filterVariant: 'dateRange',
      },
      filterFn: customFilterFns.inDateRange,
      enableColumnFilter: true,
      cell: ({ row }) => {
        const date = new Date(row.original.salaries?.[0]?.timestamp)
        return (
          <div>
            {months[date.getMonth()]} {date.getFullYear()}
          </div>
        )
      },
    },
    {
      accessorKey: 'level',
      header: 'Level',
      meta: {
        filterVariant: 'range',
      },
      filterFn: (
        row: Row<Employee>,
        _: string,
        filterValue: [number | undefined, number | undefined],
      ) =>
        customFilterFns.inNumberRange(
          row.original.salaries?.[0]?.level,
          _,
          filterValue,
        ),
      cell: ({ row }) => (
        <div className="text-right">{row.original.salaries[0].level}</div>
      ),
    },
    {
      accessorKey: 'step',
      header: 'Step',
      meta: {
        filterVariant: 'range',
      },
      filterFn: (
        row: Row<Employee>,
        _: string,
        filterValue: [number | undefined, number | undefined],
      ) =>
        customFilterFns.inNumberRange(
          row.original.salaries?.[0]?.step,
          _,
          filterValue,
        ),
      cell: ({ row }) => (
        <div className="text-right">{row.original.salaries[0].step}</div>
      ),
    },
    {
      accessorKey: 'totalSalary',
      header: 'Total Salary',
      meta: {
        filterVariant: 'range',
      },
      filterFn: (
        row: Row<Employee>,
        _: string,
        filterValue: [number | undefined, number | undefined],
      ) =>
        customFilterFns.inNumberRange(
          row.original.salaries?.[0]?.totalSalary,
          _,
          filterValue,
        ),
      cell: ({ row }) => (
        <div className="text-right">
          {formatCurrency(row.original.salaries[0].totalSalary)}
        </div>
      ),
    },
    {
      accessorKey: 'changePercentage',
      header: 'Last Change (%)',
      meta: {
        filterVariant: 'range',
      },
      filterFn: (
        row: Row<Employee>,
        _: string,
        filterValue: [number | undefined, number | undefined],
      ) =>
        customFilterFns.inNumberRange(
          row.original.salaries?.[0]?.changePercentage * 100,
          _,
          filterValue,
        ),
      cell: ({ row }) => (
        <div className="text-right">
          {(row.original.salaries[0].changePercentage * 100).toFixed(2)}%
        </div>
      ),
    },
    {
      accessorKey: 'changeAmount',
      header: 'Last Change ($)',
      meta: {
        filterVariant: 'range',
      },
      filterFn: (
        row: Row<Employee>,
        _: string,
        filterValue: [number | undefined, number | undefined],
      ) =>
        customFilterFns.inNumberRange(
          row.original.salaries?.[0]?.changeAmount,
          _,
          filterValue,
        ),
      cell: ({ row }) => (
        <div className="text-right">
          {formatCurrency(row.original.salaries[0].changeAmount)}
        </div>
      ),
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      meta: {
        filterVariant: 'select',
        filterOptions: [
          { label: 'Low', value: 'low' },
          { label: 'Medium', value: 'medium' },
          { label: 'High', value: 'high' },
        ],
      },
      cell: ({ row }) => {
        const handlePriorityChange = async (value: string) => {
          await updateEmployeePriority({
            data: { employeeId: row.original.id, priority: value },
          })
          refetch()
          createToast('Priority updated successfully.', {
            timeout: 3000,
          })
        }

        return (
          <Select
            value={row.original.priority}
            onValueChange={handlePriorityChange}
          >
            <SelectTrigger className="w-24 h-6 text-xs px-1 py-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        )
      },
    },
    {
      accessorKey: 'reviewer',
      header: 'Reviewer',
      meta: {
        filterVariant: 'text',
      },
      filterFn: (row: Row<Employee>, _: string, filterValue: string) =>
        customFilterFns.containsText(
          row.original.deelEmployee?.topLevelManager?.name ?? '',
          _,
          filterValue,
        ),
      cell: ({ row }) => (
        <div>{row.original.deelEmployee?.topLevelManager?.name}</div>
      ),
    },
    {
      accessorKey: 'notes',
      header: 'Notes',
      meta: {
        filterVariant: 'text',
      },
      filterFn: (row: Row<Employee>, _: string, filterValue: string) =>
        customFilterFns.containsText(
          row.original.salaries?.[0]?.notes,
          _,
          filterValue,
        ),
      cell: ({ row }) => (
        <div className="whitespace-pre-line min-w-[200px]">
          {row.original.salaries[0].notes}
        </div>
      ),
    },
    {
      accessorKey: 'reviewed',
      header: 'reviewed',
      meta: {
        filterVariant: 'select',
        filterOptions: [
          { label: 'Yes', value: 'true' },
          { label: 'No', value: 'false' },
        ],
      },
      filterFn: (row: Row<Employee>, _: string, filterValue: string) =>
        customFilterFns.equals(
          row.original.reviewed.toString(),
          _,
          filterValue,
        ),
      cell: ({ row }) => <div>{row.original.reviewed ? 'Yes' : 'No'}</div>,
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const employee = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() =>
                  router.navigate({
                    to: '/employee/$employeeId',
                    params: { employeeId: employee.id },
                  })
                }
              >
                Edit person
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: employees || [],
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
    filterFns: {},
  })

  const handleReviewVisibleEmployees = () => {
    const visibleEmployees = table
      .getFilteredRowModel()
      .rows.map((row) => row.original.id)
    setReviewQueue(visibleEmployees)
    router.navigate({
      to: '/employee/$employeeId',
      params: { employeeId: visibleEmployees[0] },
    })
  }

  return (
    <div className="flex justify-center">
      <div className="max-w-[80%] flex-grow">
        <div className="flex justify-between py-4">
          <div></div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="ml-auto"
              onClick={handleReviewVisibleEmployees}
            >
              Review visible employees
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto">
                  Columns <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="rounded-md border">
          <Table className="text-xs">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} className="group">
                        <div className="flex items-center gap-1">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                          {header.column.getCanFilter() ? (
                            <FilterButton column={header.column} />
                          ) : null}
                        </div>
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={(e) => {
                      const url = `/employee/${row.original.id}`
                      if (e.metaKey || e.ctrlKey) {
                        // Cmd/Ctrl+click: open in new tab
                        e.preventDefault()
                        window.open(url, '_blank')
                      } else {
                        // Regular click: navigate normally
                        router.navigate({
                          to: '/employee/$employeeId',
                          params: { employeeId: row.original.id },
                        })
                      }
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-1 px-1">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    {isFetching ? (
                      'Loading...'
                    ) : (
                      <div>
                        <span>No results. </span>
                        {columnFilters.some((filter) => filter) && (
                          <span
                            className="text-blue-500 cursor-pointer"
                            onClick={() => setColumnFilters([])}
                          >
                            Clear filters
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

export function FilterButton({ column }: { column: Column<any, unknown> }) {
  const columnFilterValue = column.getFilterValue()
  const hasFilter = columnFilterValue !== undefined && columnFilterValue !== ''

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity ${
            hasFilter ? 'opacity-100 text-blue-600' : ''
          }`}
        >
          <FilterIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Filter</h4>
            {hasFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => column.setFilterValue(undefined)}
                className="h-6 px-2 text-xs"
              >
                Clear
              </Button>
            )}
          </div>
          <FilterContent column={column} />
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Legacy Filter component for backward compatibility with other pages
export function Filter({ column }: { column: Column<any, unknown> }) {
  return <FilterContent column={column} />
}

function FilterContent({ column }: { column: Column<any, unknown> }) {
  const columnFilterValue = column.getFilterValue()
  const { filterVariant, filterOptions } = column.columnDef.meta ?? {}

  if (filterVariant === 'range') {
    return (
      <div className="flex flex-col space-y-2">
        <DebouncedInput
          type="number"
          value={(columnFilterValue as [number, number])?.[0] ?? ''}
          onChange={(value) => {
            const old = (columnFilterValue as [number, number]) ?? ['', '']
            const newValue: [string | number, string | number] = [
              value,
              old?.[1] ?? '',
            ]
            if (newValue[0] === '' && newValue[1] === '') {
              column.setFilterValue(undefined)
            } else {
              column.setFilterValue(newValue)
            }
          }}
          placeholder="Min"
          className="w-full border shadow-sm rounded px-2 py-1 text-sm"
        />
        <DebouncedInput
          type="number"
          value={(columnFilterValue as [number, number])?.[1] ?? ''}
          onChange={(value) => {
            const old = (columnFilterValue as [number, number]) ?? ['', '']
            const newValue: [string | number, string | number] = [
              old?.[0] ?? '',
              value,
            ]
            if (newValue[0] === '' && newValue[1] === '') {
              column.setFilterValue(undefined)
            } else {
              column.setFilterValue(newValue)
            }
          }}
          placeholder="Max"
          className="w-full border shadow-sm rounded px-2 py-1 text-sm"
        />
      </div>
    )
  }

  if (filterVariant === 'dateRange') {
    return (
      <div className="flex flex-col space-y-2">
        <DebouncedInput
          type="date"
          value={(columnFilterValue as [string, string])?.[0] ?? ''}
          onChange={(value) => {
            const old = (columnFilterValue as [string, string]) ?? ['', '']
            const newValue: [string, string] = [value as string, old?.[1] ?? '']
            if (newValue[0] === '' && newValue[1] === '') {
              column.setFilterValue(undefined)
            } else {
              column.setFilterValue(newValue)
            }
          }}
          placeholder="From"
          className="w-full border shadow-sm rounded px-2 py-1 text-sm"
        />
        <DebouncedInput
          type="date"
          value={(columnFilterValue as [string, string])?.[1] ?? ''}
          onChange={(value) => {
            const old = (columnFilterValue as [string, string]) ?? ['', '']
            const newValue: [string, string] = [old?.[0] ?? '', value as string]
            if (newValue[0] === '' && newValue[1] === '') {
              column.setFilterValue(undefined)
            } else {
              column.setFilterValue(newValue)
            }
          }}
          placeholder="To"
          className="w-full border shadow-sm rounded px-2 py-1 text-sm"
        />
      </div>
    )
  }

  if (filterVariant === 'select') {
    return (
      <select
        onChange={(e) => column.setFilterValue(e.target.value)}
        value={columnFilterValue?.toString()}
        className="w-full border shadow-sm rounded px-2 py-1.5 text-sm"
      >
        <option value="">All</option>
        {filterOptions?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )
  }

  return (
    <DebouncedInput
      className="w-full border shadow-sm rounded px-2 py-1 text-sm"
      onChange={(value) => column.setFilterValue(value)}
      placeholder="Search..."
      type="text"
      value={(columnFilterValue ?? '') as string}
    />
  )
}

// A typical debounced input react component
function DebouncedInput({
  value: initialValue,
  onChange,
  debounce = 500,
  ...props
}: {
  value: string | number
  onChange: (value: string | number) => void
  debounce?: number
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value)
    }, debounce)

    return () => clearTimeout(timeout)
  }, [value])

  return (
    <input
      {...props}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  )
}
