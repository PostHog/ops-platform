import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { download, generateCsv, mkConfig } from 'export-to-csv'
import { customFilterFns, months } from './employees'
import type { Prisma } from '@prisma/client'
import type { ColumnDef, ColumnFiltersState, Row } from '@tanstack/react-table'
import prisma from '@/db'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { formatCurrency, getFullName } from '@/lib/utils'
import { createAdminFn } from '@/lib/auth-middleware'
import { TableFilters } from '@/components/TableFilters'
import { createToast } from 'vercel-toast'
import { MoreHorizontal, ExternalLink } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import type { RowSelectionState } from '@tanstack/react-table'

type EquityRefreshSalary = Prisma.SalaryGetPayload<{
  include: {
    employee: {
      include: {
        deelEmployee: {
          include: {
            topLevelManager: true
          }
        }
      }
    }
  }
}>

const getEquityRefreshes = createAdminFn({
  method: 'GET',
}).handler(async () => {
  return await prisma.salary.findMany({
    where: {
      equityRefreshAmount: {
        gt: 0,
      },
    },
    include: {
      employee: {
        include: {
          deelEmployee: {
            include: {
              topLevelManager: true,
            },
          },
        },
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
  })
})

const updateEquityGranted = createAdminFn({
  method: 'POST',
})
  .inputValidator((d: { id: string; granted: boolean }) => d)
  .handler(async ({ data }) => {
    return await prisma.salary.update({
      where: { id: data.id },
      data: { equityRefreshGranted: data.granted },
    })
  })

const markMultipleAsGranted = createAdminFn({
  method: 'POST',
})
  .inputValidator((d: { ids: string[] }) => d)
  .handler(async ({ data }) => {
    return await prisma.salary.updateMany({
      where: { id: { in: data.ids } },
      data: { equityRefreshGranted: true },
    })
  })

export const Route = createFileRoute('/equityActions')({
  component: App,
  loader: async () => await getEquityRefreshes(),
})

function App() {
  const equityRefreshes: Array<EquityRefreshSalary> = Route.useLoaderData()
  const router = useRouter()
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const handleMarkSelectedAsGranted = async () => {
    const selectedIds = Object.keys(rowSelection)
    if (selectedIds.length === 0) return

    try {
      await markMultipleAsGranted({
        data: { ids: selectedIds },
      })
      setRowSelection({})
      createToast(
        `Marked ${selectedIds.length} equity refresh${selectedIds.length > 1 ? 'es' : ''} as granted`,
      )
      router.invalidate()
    } catch (error) {
      console.error('Error marking as granted:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      createToast(`Failed to mark as granted: ${errorMessage}`)
    }
  }

  const columns: Array<ColumnDef<EquityRefreshSalary>> = useMemo(
    () => [
      {
        id: 'select-col',
        enableColumnFilter: false,
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsSomeRowsSelected()
                ? 'indeterminate'
                : table.getIsAllRowsSelected()
            }
            onClick={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onClick={row.getToggleSelectedHandler()}
          />
        ),
      },
      {
        accessorKey: 'name',
        header: 'Name',
        filterFn: (
          row: Row<EquityRefreshSalary>,
          _: string,
          filterValue: string,
        ) => {
          const fullName = getFullName(
            row.original.employee.deelEmployee?.firstName,
            row.original.employee.deelEmployee?.lastName,
          )
          return (
            (fullName &&
              customFilterFns.containsText(fullName, _, filterValue)) ||
            customFilterFns.containsText(
              row.original.employee.email,
              _,
              filterValue,
            )
          )
        },
        cell: ({ row }) => (
          <div>
            <Link
              to="/employee/$employeeId"
              params={{ employeeId: row.original.employee.id }}
              className="text-blue-600 hover:underline"
            >
              {getFullName(
                row.original.employee.deelEmployee?.firstName,
                row.original.employee.deelEmployee?.lastName,
                row.original.employee.email,
              )}
            </Link>
          </div>
        ),
      },
      {
        accessorKey: 'timestamp',
        header: 'Date',
        meta: {
          filterVariant: 'dateRange',
        },
        filterFn: (
          row: Row<EquityRefreshSalary>,
          _: string,
          filterValue: [string, string],
        ) => {
          const date = new Date(row.original.timestamp)
          const [from, to] = filterValue
          if (from && date < new Date(from)) return false
          if (to && date > new Date(to)) return false
          return true
        },
        cell: ({ row }) => (
          <div>
            {new Intl.DateTimeFormat('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            }).format(new Date(row.original.timestamp))}
          </div>
        ),
      },
      {
        accessorKey: 'equityRefreshPercentage',
        header: 'Refresh %',
        meta: {
          filterVariant: 'range',
        },
        cell: ({ row }) => (
          <div>{(row.original.equityRefreshPercentage * 100).toFixed(2)}%</div>
        ),
      },
      {
        accessorKey: 'equityRefreshAmount',
        header: 'Refresh Amount ($)',
        meta: {
          filterVariant: 'range',
        },
        cell: ({ row }) => (
          <div>{formatCurrency(row.original.equityRefreshAmount)}</div>
        ),
      },
      {
        accessorKey: 'actualSalary',
        header: 'Total Salary ($)',
        meta: {
          filterVariant: 'range',
        },
        cell: ({ row }) => (
          <div>{formatCurrency(row.original.actualSalary)}</div>
        ),
      },
      {
        accessorKey: 'reviewer',
        header: 'Reviewer',
        filterFn: (
          row: Row<EquityRefreshSalary>,
          _: string,
          filterValue: string,
        ) =>
          customFilterFns.containsText(
            getFullName(
              row.original.employee.deelEmployee?.topLevelManager?.firstName,
              row.original.employee.deelEmployee?.topLevelManager?.lastName,
            ),
            _,
            filterValue,
          ),
        cell: ({ row }) => (
          <div>
            {getFullName(
              row.original.employee.deelEmployee?.topLevelManager?.firstName,
              row.original.employee.deelEmployee?.topLevelManager?.lastName,
            ) || '-'}
          </div>
        ),
      },
      {
        accessorKey: 'notes',
        header: 'Notes',
        cell: ({ row }) => (
          <div className="max-w-[200px] truncate" title={row.original.notes}>
            {row.original.notes || '-'}
          </div>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableColumnFilter: false,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={async () => {
                  await updateEquityGranted({
                    data: {
                      id: row.original.id,
                      granted: true,
                    },
                  })
                  createToast('Marked as granted')
                  router.invalidate()
                }}
              >
                Mark as granted
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  to="/employee/$employeeId"
                  params={{ employeeId: row.original.employee.id }}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View employee
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  )

  const handleExportAsCSV = () => {
    const csvConfig = mkConfig({
      useKeysAsHeaders: true,
      filename: `equity refreshes ${months[new Date().getMonth()]} ${new Date().getFullYear()}`,
    })

    const csv = generateCsv(csvConfig)(
      table.getFilteredRowModel().rows.map((row) => {
        const salary = row.original
        return {
          name: getFullName(
            salary.employee.deelEmployee?.firstName,
            salary.employee.deelEmployee?.lastName,
            salary.employee.email,
          ),
          email: salary.employee.email,
          date: new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }).format(new Date(salary.timestamp)),
          refreshPercentage: `${(salary.equityRefreshPercentage * 100).toFixed(2)}%`,
          refreshAmount: formatCurrency(salary.equityRefreshAmount),
          totalSalary: formatCurrency(salary.actualSalary),
          reviewer: getFullName(
            salary.employee.deelEmployee?.topLevelManager?.firstName,
            salary.employee.deelEmployee?.topLevelManager?.lastName,
          ),
          notes: salary.notes,
        }
      }),
    )

    download(csvConfig)(csv)
  }

  const table = useReactTable({
    data: equityRefreshes,
    columns,
    onColumnFiltersChange: setColumnFilters,
    state: {
      columnFilters,
      rowSelection,
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.id,
    filterFns: {
      fuzzy: () => true,
    },
  })

  return (
    <div className="flex w-full justify-center px-4 pb-4">
      <div className="max-w-full flex-grow 2xl:max-w-[80%]">
        <div className="flex justify-between py-4">
          <div>
            <TableFilters table={table} />
          </div>
          <div className="flex items-center space-x-2">
            {Object.keys(rowSelection).length > 0 && (
              <Button
                variant="outline"
                className="ml-auto"
                onClick={handleMarkSelectedAsGranted}
              >
                Mark selected as granted ({Object.keys(rowSelection).length})
              </Button>
            )}
            <Button
              variant="outline"
              className="ml-auto"
              onClick={handleExportAsCSV}
            >
              Export visible as CSV
            </Button>
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
                              header.getContext(),
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
                    No pending equity refreshes.
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
