import React from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  flexRender,
  getCoreRowModel,
  VisibilityState,
  useReactTable,
  ColumnFiltersState,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table'
import type { Column, ColumnDef, Row, RowData } from '@tanstack/react-table'
import { ChevronDown, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createServerFn } from '@tanstack/react-start'
import prisma from '@/db'
import { Prisma } from "@/../generated/prisma/client.js";
import { useQuery } from '@tanstack/react-query'

export const Route = createFileRoute("/")({
  component: App
})

type Employee = Prisma.EmployeeGetPayload<{
  include: {
    salaries: {
      orderBy: {
        timestamp: 'desc',
      },
    },
    deelEmployee: {
      include: {
        topLevelManager: true
      }
    }
  }
}>

declare module '@tanstack/react-table' {
  //allows us to define custom properties for our columns
  interface ColumnMeta<TData extends RowData, TValue> {
    filterVariant?: 'text' | 'range' | 'select' | 'dateRange'
    filterOptions?: { label: string, value: string }[]
  }
}

export const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const getEmployees = createServerFn({
  method: 'GET',
}).handler(async () => {
  return await prisma.employee.findMany({
    include: {
      salaries: {
        orderBy: {
          timestamp: 'desc',
        },
      },
      deelEmployee: {
        include: {
          topLevelManager: true
        }
      }
    },
    where: {
      salaries: { some: {} }
    }
  })
})

const customFilterFns = {
  inDateRange: (row: Row<Employee>, _: string, filterValue: [string | undefined, string | undefined]) => {
    const [minStr, maxStr] = filterValue as [string | undefined, string | undefined]
    const date = new Date(row.original.salaries?.[0]?.timestamp)
    const value = date.getTime()

    const min = minStr ? new Date(minStr).getTime() : undefined
    const max = maxStr ? new Date(maxStr).getTime() : undefined

    if (min !== undefined && value < min) return false
    if (max !== undefined && value > max) return false
    return true
  },
  inNumberRange: (value: number, _: string, filterValue: [number | undefined, number | undefined]) => {
    const [min, max] = filterValue as [number | '', number | '']

    if (min !== '' && value < min) return false
    if (max !== '' && value > max) return false
    return true
  },
  containsText: (value: string, _: string, filterValue: string) => {
    if (filterValue !== '' && !value.toLowerCase().includes(filterValue)) return false
    return true
  },
  equals: (value: string, _: string, filterValue: string) => {
    if (filterValue !== '' && value !== filterValue) return false
    return true
  }
}

function App() {
  const router = useRouter()
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => getEmployees(),
  })

  const columns: ColumnDef<Employee>[] = [
    {
      accessorKey: "name",
      header: "Name",
      meta: {
        filterVariant: 'text',
      },
      filterFn: (row: Row<Employee>, _: string, filterValue: string)=> customFilterFns.containsText(row.original.deelEmployee?.name ?? '', _, filterValue),
      cell: ({ row }) => (
        <div>{row.original.deelEmployee?.name}</div>
      ),
    },
    {
      accessorKey: "timestamp",
      header: "Last Change (date)",
      meta: {
        filterVariant: 'dateRange',
      },
      filterFn: customFilterFns.inDateRange,
      enableColumnFilter: true,
      cell: ({ row }) => {
        const date = new Date(row.original.salaries?.[0]?.timestamp)
        return <div>{months[date.getMonth()]} {date.getFullYear()}</div>
      },
    },
    {
      accessorKey: "level",
      header: "Level",
      meta: {
        filterVariant: 'range',
      },
      filterFn: (row: Row<Employee>, _: string, filterValue: [number | undefined, number | undefined])=> customFilterFns.inNumberRange(row.original.salaries?.[0]?.level, _, filterValue),
      cell: ({ row }) => <div>{row.original.salaries[0].level}</div>,
    },
    {
      accessorKey: "step",
      header: "Step",
      meta: {
        filterVariant: 'range',
      },
      filterFn: (row: Row<Employee>, _: string, filterValue: [number | undefined, number | undefined])=> customFilterFns.inNumberRange(row.original.salaries?.[0]?.step, _, filterValue),
      cell: ({ row }) => <div>{row.original.salaries[0].step}</div>,
    },
    {
      accessorKey: "totalSalary",
      header: "Total Salary",
      meta: {
        filterVariant: 'range',
      },
      filterFn: (row: Row<Employee>, _: string, filterValue: [number | undefined, number | undefined])=> customFilterFns.inNumberRange(row.original.salaries?.[0]?.totalSalary, _, filterValue),
      cell: ({ row }) => <div>{row.original.salaries[0].totalSalary}</div>,
    },
    {
      accessorKey: "changePercentage",
      header: "Last Change (%)",
      meta: {
        filterVariant: 'range',
      },
      filterFn: (row: Row<Employee>, _: string, filterValue: [number | undefined, number | undefined])=> customFilterFns.inNumberRange(row.original.salaries?.[0]?.changePercentage * 100, _, filterValue),
      cell: ({ row }) => <div>{row.original.salaries[0].changePercentage * 100}%</div>,
    },
    {
      accessorKey: "changeAmount",
      header: "Last Change ($)",
      meta: {
        filterVariant: 'range',
      },
      filterFn: (row: Row<Employee>, _: string, filterValue: [number | undefined, number | undefined])=> customFilterFns.inNumberRange(row.original.salaries?.[0]?.changeAmount, _, filterValue),
      cell: ({ row }) => <div>{row.original.salaries[0].changeAmount}</div>,
    },
    {
      accessorKey: "priority",
      header: "Priority",
      meta: {
        filterVariant: 'select',
        filterOptions: [
          { label: 'Low', value: 'low' },
          { label: 'Medium', value: 'medium' },
          { label: 'High', value: 'high' },
        ]
      },
      cell: ({ row }) => <div>{row.original.priority}</div>,
    },
    {
      accessorKey: "reviewer",
      header: "Reviewer",
      meta: {
        filterVariant: 'text',
      },
      filterFn: (row: Row<Employee>, _: string, filterValue: string)=> customFilterFns.containsText(row.original.deelEmployee?.topLevelManager?.name ?? '', _, filterValue),
      cell: ({ row }) => <div>{row.original.deelEmployee?.topLevelManager?.name}</div>,
    },
    {
      accessorKey: "notes",
      header: "Notes",
      meta: {
        filterVariant: 'text'
      },
      filterFn: (row: Row<Employee>, _: string, filterValue: string)=> customFilterFns.containsText(row.original.salaries?.[0]?.notes, _, filterValue),
      cell: ({ row }) => <div>{row.original.salaries[0].notes}</div>,
    },
    {
      accessorKey: "reviewd",
      header: "Reviewd",
      meta: {
        filterVariant: 'select',
        filterOptions: [
          { label: 'Yes', value: 'true' },
          { label: 'No', value: 'false' },
        ]
      },
      filterFn: (row: Row<Employee>, _: string, filterValue: string)=> customFilterFns.equals(row.original.reviewd.toString(), _, filterValue),
      cell: ({ row }) => <div>{row.original.reviewd ? "Yes" : "No"}</div>,
    },
    {
      id: "actions",
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
                onClick={() => router.navigate({ to: '/employee/$employeeId', params: { employeeId: employee.id } })}
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
    getPaginationRowModel: getPaginationRowModel(),
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

  return (
    <div className="w-screen flex justify-center">
      <div className="max-w-[80%] flex-grow">
        <div className="flex justify-between py-4">
          <div></div>
          <div className="flex items-center space-x-2">
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
        <div className="overflow-hidden rounded-md border">
          <Table>
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
                            header.getContext()
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
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
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
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Filter({ column }: { column: Column<any, unknown> }) {
  const columnFilterValue = column.getFilterValue()
  const { filterVariant, filterOptions } = column.columnDef.meta ?? {}

  return filterVariant === 'range' ? (
    <div>
      <div className="flex space-x-2">
        {/* See faceted column filters example for min max values functionality */}
        <DebouncedInput
          type="number"
          value={(columnFilterValue as [number, number])?.[0] ?? ''}
          onChange={value =>
            column.setFilterValue((old: [number, number]) => [value, old?.[1]])
          }
          placeholder={`Min`}
          className="w-24 border shadow rounded"
        />
        <DebouncedInput
          type="number"
          value={(columnFilterValue as [number, number])?.[1] ?? ''}
          onChange={value =>
            column.setFilterValue((old: [number, number]) => [old?.[0], value])
          }
          placeholder={`Max`}
          className="w-24 border shadow rounded"
        />
      </div>
      <div className="h-1" />
    </div>
  ) : filterVariant === 'dateRange' ? (
    <div>
      <div className="flex space-x-2">
        <DebouncedInput
          type="date"
          value={(columnFilterValue as [string, string])?.[0] ?? ''}
          onChange={value =>
            column.setFilterValue((old: [string, string]) => [value, old?.[1]])
          }
          placeholder={`Min`}
          className="w-32 border shadow rounded"
        />
        <DebouncedInput
          type="date"
          value={(columnFilterValue as [string, string])?.[1] ?? ''}
          onChange={value =>
            column.setFilterValue((old: [string, string]) => [old?.[0], value])
          }
          placeholder={`Max`}
          className="w-32 border shadow rounded"
        />
      </div>
      <div className="h-1" />
    </div>
  ) : filterVariant === 'select' ? (
    <select
      onChange={e => column.setFilterValue(e.target.value)}
      value={columnFilterValue?.toString()}
    >
      {/* See faceted column filters example for dynamic select options */}
      <option value="">All</option>
      {filterOptions?.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  ) : (
    <DebouncedInput
      className="w-36 border shadow rounded"
      onChange={value => column.setFilterValue(value)}
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
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
  const [value, setValue] = React.useState(initialValue)

  React.useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value)
    }, debounce)

    return () => clearTimeout(timeout)
  }, [value])

  return (
    <input {...props} value={value} onChange={e => setValue(e.target.value)} />
  )
}