import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import { createServerFn } from '@tanstack/react-start'
import { useMemo } from 'react'
import { download, generateCsv, mkConfig } from 'export-to-csv'
import { months } from '.'
import type { Prisma } from 'generated/prisma/client'
import type {
  ColumnDef} from '@tanstack/react-table';
import prisma from '@/db'
import {
  DropdownMenu,
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
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'

type Salary = Prisma.SalaryGetPayload<{
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

const getUpdatedSalaries = createServerFn({
  method: 'GET',
}).handler(async () => {
  return await prisma.salary.findMany({
    where: {
      timestamp: {
        gte: new Date(new Date().setDate(new Date().getDate() - 30)),
      },
      changeAmount: {
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

const updateCommunicated = createServerFn({
  method: 'POST',
})
  .inputValidator((d: { id: string; communicated: boolean }) => d)
  .handler(async ({ data }) => {
    return await prisma.salary.update({
      where: { id: data.id },
      data: { communicated: data.communicated },
    })
  })

export const Route = createFileRoute('/actions')({
  component: App,
  loader: async () => await getUpdatedSalaries(),
})

function App() {
  const salaries: Array<Salary> = Route.useLoaderData()
  const router = useRouter()
  const columns: Array<ColumnDef<Salary>> = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div>{row.original.employee.deelEmployee?.name}</div>
        ),
      },
      {
        accessorKey: 'notes',
        header: 'Notes',
        cell: ({ row }) => <div>{row.original.notes}</div>,
      },
      {
        accessorKey: 'totalSalary',
        header: 'Total Salary',
        cell: ({ row }) => (
          <div>{formatCurrency(row.original.totalSalary)}</div>
        ),
      },
      {
        accessorKey: 'changePercentage',
        header: 'Change (%)',
        cell: ({ row }) => (
          <div>{(row.original.changePercentage * 100).toFixed(2)}%</div>
        ),
      },
      {
        accessorKey: 'reviewer',
        header: 'Reviewer',
        cell: ({ row }) => (
          <div>{row.original.employee.deelEmployee?.topLevelManager?.name}</div>
        ),
      },
      {
        accessorKey: 'communicated',
        header: 'Communicated',
        cell: ({ row }) => (
          <div>{row.original.communicated ? 'Yes' : 'No'}</div>
        ),
      },
      {
        id: 'actions',
        enableHiding: false,
        cell: ({ row }) => {
          const { communicated, id } = row.original

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
                  onClick={async () => {
                    await updateCommunicated({
                      data: { id, communicated: !communicated },
                    })
                    router.invalidate()
                  }}
                >
                  Toggle communicated
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [],
  )

  const handleExportAsCSV = () => {
    const csvConfig = mkConfig({
      useKeysAsHeaders: true,
      filename: `pay review actions ${months[new Date().getMonth()]} ${new Date().getFullYear()}`,
    })

    const csv = generateCsv(csvConfig)(
      salaries.map((salary) => ({
        name: salary.employee.deelEmployee?.name,
        notes: salary.notes,
        totalSalary: salary.totalSalary,
        changePercentage: salary.changePercentage,
        reviewer: salary.employee.deelEmployee?.topLevelManager?.name,
        communicated: salary.communicated ? 'Yes' : 'No',
      })),
    )

    download(csvConfig)(csv)
  }

  const table = useReactTable({
    data: salaries,
    columns,
    getCoreRowModel: getCoreRowModel(),
    filterFns: {
      fuzzy: () => true,
    },
  })

  return (
    <div className="w-full h-full flex justify-center">
      <div className="max-w-[80%] flex-grow">
        <div className="flex justify-between py-4">
          <div></div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="ml-auto"
              onClick={handleExportAsCSV}
            >
              Export as CSV
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
