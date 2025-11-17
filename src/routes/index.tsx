import { InputHTMLAttributes, useEffect, useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ChevronDown, MoreHorizontal } from 'lucide-react'
import { useServerFn } from '@tanstack/react-start'
import { useQuery } from '@tanstack/react-query'
import { createToast } from 'vercel-toast'
import { useAtom } from 'jotai'
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
import { useLocalStorage } from 'usehooks-ts'
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
import prisma from '@/db'
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
import { EmployeeNameCell } from '@/components/EmployeeNameCell'
import { SalaryChangeDisplay } from '@/components/SalaryChangeDisplay'
import { LevelStepDisplay } from '@/components/LevelStepDisplay'
import { PriorityBadge } from '@/components/PriorityBadge'
import { StatusCell } from '@/components/StatusCell'

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
      header: 'Name/notes',
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
        customFilterFns.containsText(row.original.email, _, filterValue) ||
        customFilterFns.containsText(
          row.original.salaries?.[0]?.notes ?? '',
          _,
          filterValue,
        ),
      cell: ({ row }) => (
        <EmployeeNameCell
          name={row.original.deelEmployee?.name || row.original.email}
          notes={row.original.salaries?.[0]?.notes}
        />
      ),
    },
    {
      accessorKey: 'lastChange',
      header: 'Last change',
      meta: {
        filterVariant: 'dateRange',
      },
      filterFn: customFilterFns.inDateRange,
      enableColumnFilter: true,
      cell: ({ row }) => {
        const salary = row.original.salaries?.[0]
        if (!salary) return null
        return (
          <SalaryChangeDisplay
            changePercentage={salary.changePercentage}
            changeAmount={salary.changeAmount}
            totalSalary={salary.totalSalary}
            timestamp={new Date(salary.timestamp)}
            showDate={true}
            size="sm"
            benchmarkFactor={salary.benchmarkFactor}
            locationFactor={salary.locationFactor}
            level={salary.level}
            step={salary.step}
          />
        )
      },
    },
    {
      accessorKey: 'stepLevel',
      header: 'Step / Level',
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
        ) ||
        customFilterFns.inNumberRange(
          row.original.salaries?.[0]?.level,
          _,
          filterValue,
        ),
      cell: ({ row }) => {
        const salary = row.original.salaries?.[0]
        if (!salary) return null
        return (
          <LevelStepDisplay level={salary.level} step={salary.step} size="sm" />
        )
      },
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
            <SelectTrigger className="h-auto border-0 shadow-none p-0 hover:bg-transparent focus:ring-0 w-24">
              <SelectValue>
                <PriorityBadge priority={row.original.priority} />
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">
                <PriorityBadge priority="low" />
              </SelectItem>
              <SelectItem value="medium">
                <PriorityBadge priority="medium" />
              </SelectItem>
              <SelectItem value="high">
                <PriorityBadge priority="high" />
              </SelectItem>
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
      accessorKey: 'reviewed',
      header: 'Status',
      meta: {
        filterVariant: 'select',
        filterOptions: [
          { label: 'Reviewed', value: 'true' },
          { label: 'Needs Review', value: 'false' },
        ],
      },
      filterFn: (row: Row<Employee>, _: string, filterValue: string) =>
        customFilterFns.equals(
          row.original.reviewed.toString(),
          _,
          filterValue,
        ),
      cell: ({ row }) => (
        <StatusCell
          reviewed={row.original.reviewed}
          employeeId={row.original.id}
        />
      ),
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
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                        {header.column.getCanFilter() ? (
                          <div>
                            <Filter column={header.column} />
                          </div>
                        ) : null}
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

export function Filter({ column }: { column: Column<any, unknown> }) {
  const columnFilterValue = column.getFilterValue()
  const { filterVariant, filterOptions } = column.columnDef.meta ?? {}

  return filterVariant === 'range' ? (
    <div>
      <div className="flex flex-col space-y-1">
        {/* See faceted column filters example for min max values functionality */}
        <DebouncedInput
          type="number"
          value={(columnFilterValue as [number, number])?.[0] ?? ''}
          onChange={(value) => {
            const old = (columnFilterValue as [number, number]) ?? ['', '']
            const newValue: [string | number, string | number] = [
              value,
              old?.[1] ?? '',
            ]
            // Remove filter if both values are empty
            if (newValue[0] === '' && newValue[1] === '') {
              column.setFilterValue(undefined)
            } else {
              column.setFilterValue(newValue)
            }
          }}
          placeholder={`Min`}
          className="w-16 border shadow rounded"
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
            // Remove filter if both values are empty
            if (newValue[0] === '' && newValue[1] === '') {
              column.setFilterValue(undefined)
            } else {
              column.setFilterValue(newValue)
            }
          }}
          placeholder={`Max`}
          className="w-16 border shadow rounded"
        />
      </div>
      <div className="h-1" />
    </div>
  ) : filterVariant === 'dateRange' ? (
    <div>
      <div className="flex flex-col space-y-1">
        <DebouncedInput
          type="date"
          value={(columnFilterValue as [string, string])?.[0] ?? ''}
          onChange={(value) => {
            const old = (columnFilterValue as [string, string]) ?? ['', '']
            const newValue: [string, string] = [
              value as string,
              (old?.[1] ?? '') as string,
            ]
            // Remove filter if both values are empty
            if (newValue[0] === '' && newValue[1] === '') {
              column.setFilterValue(undefined)
            } else {
              column.setFilterValue(newValue)
            }
          }}
          placeholder={`Min`}
          className="w-24 border shadow rounded"
        />
        <DebouncedInput
          type="date"
          value={(columnFilterValue as [string, string])?.[1] ?? ''}
          onChange={(value) => {
            const old = (columnFilterValue as [string, string]) ?? ['', '']
            const newValue: [string, string] = [
              (old?.[0] ?? '') as string,
              value as string,
            ]
            // Remove filter if both values are empty
            if (newValue[0] === '' && newValue[1] === '') {
              column.setFilterValue(undefined)
            } else {
              column.setFilterValue(newValue)
            }
          }}
          placeholder={`Max`}
          className="w-24 border shadow rounded"
        />
      </div>
      <div className="h-1" />
    </div>
  ) : filterVariant === 'select' ? (
    <select
      onChange={(e) => column.setFilterValue(e.target.value)}
      value={columnFilterValue?.toString()}
    >
      {/* See faceted column filters example for dynamic select options */}
      <option value="">All</option>
      {filterOptions?.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ) : (
    <DebouncedInput
      className="w-36 border shadow rounded"
      onChange={(value) => column.setFilterValue(value)}
      placeholder={`Search...`}
      type="text"
      value={(columnFilterValue ?? '') as string}
    />
    // See faceted column filters example for datalist search suggestions
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
