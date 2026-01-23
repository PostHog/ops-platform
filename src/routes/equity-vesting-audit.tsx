import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import prisma from '@/db'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { createAdminFn } from '@/lib/auth-middleware'
import { calculateVestedQuantity } from '@/lib/vesting'
import {
  Column,
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  Row,
  RowData,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { useMemo } from 'react'
import { TableFilters } from '@/components/TableFilters'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { useLocalStorage } from 'usehooks-ts'
import { customFilterFns } from './employees'

export const Route = createFileRoute('/equity-vesting-audit')({
  component: EquityVestingAudit,
})

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    filterVariant?: 'text' | 'range' | 'select' | 'dateRange'
    filterOptions?: Array<{ label: string; value: string | number | boolean }>
    filterLabel?: string
  }
}

type EmployeeVestingData = {
  email: string
  dbVested: number
  calculatedVested: number
  difference: number
  status: 'MATCH' | 'MISMATCH'
}

const getEmployeesWithGrants = createAdminFn({
  method: 'GET',
}).handler(async () => {
  const employees = await prisma.employee.findMany({
    where: {
      cartaOptionGrants: {
        some: {},
      },
    },
    include: {
      cartaOptionGrants: true,
    },
    orderBy: {
      email: 'asc',
    },
  })

  return employees.map((employee): EmployeeVestingData => {
    const dbVestedTotal = employee.cartaOptionGrants.reduce(
      (sum, grant) => sum + grant.vestedQuantity,
      0,
    )
    const calculatedVestedTotal = employee.cartaOptionGrants.reduce(
      (sum, grant) => sum + calculateVestedQuantity(grant),
      0,
    )

    return {
      email: employee.email,
      dbVested: dbVestedTotal,
      calculatedVested: calculatedVestedTotal,
      difference: calculatedVestedTotal - dbVestedTotal,
      status: dbVestedTotal === calculatedVestedTotal ? 'MATCH' : 'MISMATCH',
    }
  })
})

function handleSortToggle(column: Column<any, unknown>) {
  const sortState = column.getIsSorted()
  if (!sortState) {
    column.toggleSorting(false) // asc
  } else if (sortState === 'asc') {
    column.toggleSorting(true) // desc
  } else {
    column.clearSorting() // no sort
  }
}

function EquityVestingAudit() {
  const [columnFilters, setColumnFilters] = useLocalStorage<ColumnFiltersState>(
    'equity-vesting-audit.table.filters',
    [],
  )
  const [sorting, setSorting] = useLocalStorage<SortingState>(
    'equity-vesting-audit.table.sorting',
    [
      {
        id: 'status',
        desc: true,
      },
    ],
  )

  const { data: employees, isLoading } = useQuery({
    queryKey: ['equityVestingAudit'],
    queryFn: () => getEmployeesWithGrants(),
  })

  const columns: Array<ColumnDef<EmployeeVestingData>> = useMemo(
    () => [
      {
        accessorKey: 'email',
        header: 'Employee Email',
        filterFn: (
          row: Row<EmployeeVestingData>,
          _: string,
          filterValue: string,
        ) => {
          return customFilterFns.containsText(
            row.original.email,
            _,
            filterValue,
          )
        },
        cell: ({ row }) => (
          <div className="font-medium">{row.original.email}</div>
        ),
      },
      {
        accessorKey: 'dbVested',
        header: 'DB Vested',
        meta: {
          filterVariant: 'range',
        },
        cell: ({ row }) => (
          <div className="text-right">
            {row.original.dbVested.toLocaleString()}
          </div>
        ),
      },
      {
        accessorKey: 'calculatedVested',
        header: 'Calculated Vested',
        meta: {
          filterVariant: 'range',
        },
        cell: ({ row }) => (
          <div className="text-right">
            {row.original.calculatedVested.toLocaleString()}
          </div>
        ),
      },
      {
        accessorKey: 'difference',
        header: 'Difference',
        meta: {
          filterVariant: 'range',
        },
        cell: ({ row }) => {
          const difference = row.original.difference
          if (difference === 0) return <div className="text-right">-</div>
          return (
            <div
              className={`text-right ${difference > 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {difference > 0 ? '+' : ''}
              {difference.toLocaleString()}
            </div>
          )
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: {
          filterVariant: 'select',
          filterOptions: [
            { label: 'Match', value: 'MATCH' },
            { label: 'Mismatch', value: 'MISMATCH' },
          ],
        },
        filterFn: (
          row: Row<EmployeeVestingData>,
          _: string,
          filterValue: string[],
        ) => {
          return filterValue.includes(row.original.status)
        },
        cell: ({ row }) => {
          const isMatch = row.original.status === 'MATCH'
          return (
            <Badge
              variant="outline"
              className={
                isMatch
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }
            >
              {isMatch ? 'Match' : 'Mismatch'}
            </Badge>
          )
        },
      },
    ],
    [],
  )

  const table = useReactTable({
    data: employees || [],
    columns,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    state: {
      columnFilters,
      sorting,
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (row) => row.email,
    filterFns: {
      fuzzy: () => true,
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <span>Loading…</span>
      </div>
    )
  }

  return (
    <div className="flex w-full justify-center px-4 pb-4">
      <div className="max-w-full flex-grow 2xl:max-w-[80%]">
        <div className="flex items-center justify-between py-4">
          <div>
            <TableFilters table={table} />
          </div>
        </div>
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const sortState = header.column.getIsSorted()
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : (
                          <div
                            {...{
                              className: header.column.getCanSort()
                                ? 'cursor-pointer select-none flex items-center gap-2 hover:text-gray-700'
                                : 'flex items-center gap-2',
                              onClick: header.column.getCanSort()
                                ? () => handleSortToggle(header.column)
                                : undefined,
                            }}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {header.column.getCanSort() &&
                              (sortState === 'asc' ? (
                                <ArrowUp className="h-4 w-4" />
                              ) : sortState === 'desc' ? (
                                <ArrowDown className="h-4 w-4" />
                              ) : (
                                <ArrowUpDown className="h-4 w-4 opacity-50" />
                              ))}
                          </div>
                        )}
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
                    data-state={row.getIsSelected() && 'selected'}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
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
                    No results.
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
