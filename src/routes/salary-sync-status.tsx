import prisma from '@/db'
import { createAuthenticatedFn } from '@/lib/auth-middleware'
import { formatCurrency } from '@/lib/utils'
import { type Prisma } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  Column,
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  Row,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { useMemo } from 'react'
import { customFilterFns, Filter } from '.'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { useLocalStorage } from 'usehooks-ts'

dayjs.extend(relativeTime)

export const Route = createFileRoute('/salary-sync-status')({
  component: RouteComponent,
})

type Employee = Prisma.EmployeeGetPayload<{
  include: {
    salaries: true
    deelEmployee: true
  }
}>

const getSalarySyncStatus = createAuthenticatedFn({
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
      deelEmployee: true,
    },
    where: {
      salaries: { some: {} },
      deelEmployee: { isNot: null },
    },
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

function RouteComponent() {
  const [columnFilters, setColumnFilters] = useLocalStorage<ColumnFiltersState>(
    'salary-sync-status.table.filters',
    [],
  )
  const [sorting, setSorting] = useLocalStorage<SortingState>(
    'salary-sync-status.table.sorting',
    [
      {
        id: 'salaryDeviationStatus',
        desc: false,
      },
    ],
  )
  const { data: employees } = useQuery({
    queryKey: ['salarySyncStatus'],
    queryFn: getSalarySyncStatus,
  })

  const columns: Array<ColumnDef<Employee>> = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
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
        accessorKey: 'salaries.0.actualSalary',
        header: 'Salary ($)',
        meta: {
          filterVariant: 'range',
        },
        cell: ({ row }) => (
          <div>{formatCurrency(row.original.salaries[0]?.actualSalary)}</div>
        ),
      },
      {
        accessorKey: 'salaries.0.localCurrency',
        header: 'Currency',
        cell: ({ row }) => {
          const localCurrency = row.original.salaries[0]?.localCurrency

          if (!localCurrency) return <span>N/A</span>

          return <div>{localCurrency}</div>
        },
      },
      {
        accessorKey: 'salaries.0.actualSalaryLocal',
        header: 'Salary (local)',
        meta: {
          filterVariant: 'range',
        },
        cell: ({ row }) => {
          const actualSalaryLocal = row.original.salaries[0]?.actualSalaryLocal
          const localCurrency = row.original.salaries[0]?.localCurrency

          if (!actualSalaryLocal || !localCurrency) return <span>N/A</span>

          return (
            <div>
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: row.original.salaries[0].localCurrency,
              }).format(row.original.salaries[0].actualSalaryLocal)}
            </div>
          )
        },
      },
      {
        accessorKey: 'salaryDeviationStatus',
        header: 'Sync status',
        meta: {
          filterVariant: 'select',
          filterOptions: [
            { label: 'In sync', value: 'IN_SYNC' },
            { label: 'Deviated', value: 'DEVIATED' },
          ],
        },
        cell: ({ row }) => {
          const salaryDeviationStatus = row.original.salaryDeviationStatus
          const lastSalaryChecked =
            row.original.salaries[0]?.timestamp >
            row.original.salaryDeviationCheckedAt

          if (!salaryDeviationStatus) return <span>N/A</span>

          return (
            <div>
              {salaryDeviationStatus}{' '}
              {lastSalaryChecked ? ' (out of date)' : ''}
            </div>
          )
        },
      },
      {
        accessorKey: 'salaryDeviationCheckedAt',
        header: 'Checked at',
        cell: ({ row }) => {
          const salaryDeviationCheckedAt = row.original.salaryDeviationCheckedAt

          if (!salaryDeviationCheckedAt) return <span>N/A</span>

          return <div>{dayjs(salaryDeviationCheckedAt).fromNow()}</div>
        },
      },
      {
        accessorKey: 'salaries.0.timestamp',
        header: 'Salary updated at',
        cell: ({ row }) => {
          const salaryUpdatedAt = row.original.salaries[0]?.timestamp

          if (!salaryUpdatedAt) return <span>N/A</span>

          return <div>{dayjs(salaryUpdatedAt).fromNow()}</div>
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
    getRowId: (row) => row.id,
    filterFns: {
      fuzzy: () => true,
    },
  })

  return (
    <div className="flex h-full w-full justify-center px-4">
      <div className="max-w-full flex-grow 2xl:max-w-[80%]">
        <div className="flex justify-between py-4">
          <div></div>
          {/* <div className="flex items-center space-x-2">
            <Button variant="outline" className="ml-auto">
              Some button
            </Button>
          </div> */}
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
