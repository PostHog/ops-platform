import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { useLocalStorage } from 'usehooks-ts'
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
import { formatCurrency, getFullName, getGrantType } from '@/lib/utils'
import { createBlitzscaleFn } from '@/lib/auth-middleware'
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

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

const getEquityRefreshes = createBlitzscaleFn({
  method: 'GET',
}).handler(async ({ context }) => {
  const { excludeEmails } = context.blitzscaleInfo

  const salaries = await prisma.salary.findMany({
    where: {
      equityRefreshAmount: {
        gt: 0,
      },
      timestamp: {
        gte: new Date(new Date().setMonth(new Date().getMonth() - 3)),
      },
      ...(excludeEmails.length > 0
        ? { employee: { email: { notIn: excludeEmails } } }
        : {}),
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

  const sharePrice =
    Number(process.env.CURRENT_VALUATION) /
    Number(process.env.FULLY_DILUTED_SHARES)

  return { salaries, sharePrice }
})

const updateEquityGranted = createBlitzscaleFn({
  method: 'POST',
})
  .inputValidator((d: { id: string; granted: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { excludeEmails } = context.blitzscaleInfo
    if (excludeEmails.length > 0) {
      const salary = await prisma.salary.findUnique({
        where: { id: data.id },
        include: { employee: { select: { email: true } } },
      })
      if (
        salary?.employee?.email &&
        excludeEmails.includes(salary.employee.email)
      ) {
        throw new Error('Unauthorized')
      }
    }
    return await prisma.salary.update({
      where: { id: data.id },
      data: { equityRefreshGranted: data.granted },
    })
  })

const markMultipleAsGranted = createBlitzscaleFn({
  method: 'POST',
})
  .inputValidator((d: { ids: string[] }) => d)
  .handler(async ({ data, context }) => {
    const { excludeEmails } = context.blitzscaleInfo
    if (excludeEmails.length > 0) {
      const salaries = await prisma.salary.findMany({
        where: { id: { in: data.ids } },
        include: { employee: { select: { email: true } } },
      })
      if (
        salaries.some(
          (s) => s.employee?.email && excludeEmails.includes(s.employee.email),
        )
      ) {
        throw new Error('Unauthorized')
      }
    }
    return await prisma.salary.updateMany({
      where: { id: { in: data.ids } },
      data: { equityRefreshGranted: true },
    })
  })

const updateEquityCommunicated = createBlitzscaleFn({
  method: 'POST',
})
  .inputValidator((d: { id: string; communicated: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { excludeEmails } = context.blitzscaleInfo
    if (excludeEmails.length > 0) {
      const salary = await prisma.salary.findUnique({
        where: { id: data.id },
        include: { employee: { select: { email: true } } },
      })
      if (
        salary?.employee?.email &&
        excludeEmails.includes(salary.employee.email)
      ) {
        throw new Error('Unauthorized')
      }
    }
    return await prisma.salary.update({
      where: { id: data.id },
      data: { communicated: data.communicated },
    })
  })

const markMultipleAsCommunicated = createBlitzscaleFn({
  method: 'POST',
})
  .inputValidator((d: { ids: string[] }) => d)
  .handler(async ({ data, context }) => {
    const { excludeEmails } = context.blitzscaleInfo
    if (excludeEmails.length > 0) {
      const salaries = await prisma.salary.findMany({
        where: { id: { in: data.ids } },
        include: { employee: { select: { email: true } } },
      })
      if (
        salaries.some(
          (s) => s.employee?.email && excludeEmails.includes(s.employee.email),
        )
      ) {
        throw new Error('Unauthorized')
      }
    }
    return await prisma.salary.updateMany({
      where: { id: { in: data.ids } },
      data: { communicated: true },
    })
  })

export const Route = createFileRoute('/equityActions')({
  component: App,
  loader: async () => await getEquityRefreshes(),
})

const defaultEquityTemplate = `Hey {firstName}! I just wanted to let you know that we're giving you an equity refresh of {refreshPercentage}%, which works out to {refreshAmount}. Thanks for the hard work you do for PostHog, and let me know if you have any questions!`

function processEquityTemplate(
  template: string,
  salary: EquityRefreshSalary,
): string {
  const firstName = salary.employee.deelEmployee?.firstName || ''
  const name = getFullName(
    salary.employee.deelEmployee?.firstName,
    salary.employee.deelEmployee?.lastName,
  )
  const refreshPercentage = (salary.equityRefreshPercentage * 100).toFixed(2)
  const refreshAmount = formatCurrency(salary.equityRefreshAmount)
  const totalSalary = formatCurrency(salary.actualSalary)
  const reviewer = getFullName(
    salary.employee.deelEmployee?.topLevelManager?.firstName,
    salary.employee.deelEmployee?.topLevelManager?.lastName,
  )
  const grantDate = salary.equityRefreshDate
    ? new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(new Date(salary.equityRefreshDate))
    : ''

  return template
    .replace(/\{firstName\}/g, firstName)
    .replace(/\{name\}/g, name)
    .replace(/\{refreshPercentage\}/g, refreshPercentage)
    .replace(/\{refreshAmount\}/g, refreshAmount)
    .replace(/\{totalSalary\}/g, totalSalary)
    .replace(/\{reviewer\}/g, reviewer)
    .replace(/\{grantDate\}/g, grantDate)
}

function App() {
  const { salaries: equityRefreshes, sharePrice } = Route.useLoaderData() as {
    salaries: Array<EquityRefreshSalary>
    sharePrice: number
  }
  const router = useRouter()
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [template, setTemplate] = useLocalStorage<string>(
    'equity-actions-template-text',
    defaultEquityTemplate,
  )
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [templateInput, setTemplateInput] = useState<string>(template)

  const handleSaveTemplate = () => {
    setTemplate(templateInput)
    setIsTemplateDialogOpen(false)
  }

  const handleMarkSelectedAsCommunicated = async () => {
    const selectedIds = Object.keys(rowSelection)
    if (selectedIds.length === 0) return

    try {
      await markMultipleAsCommunicated({
        data: { ids: selectedIds },
      })
      setRowSelection({})
      createToast(
        `Marked ${selectedIds.length} equity refresh${selectedIds.length > 1 ? 'es' : ''} as communicated`,
      )
      router.invalidate()
    } catch (error) {
      console.error('Error marking as communicated:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      createToast(`Failed to mark as communicated: ${errorMessage}`)
    }
  }

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
        accessorKey: 'equityRefreshDate',
        header: 'Grant Date',
        meta: {
          filterVariant: 'dateRange',
        },
        filterFn: (
          row: Row<EquityRefreshSalary>,
          _: string,
          filterValue: [string, string],
        ) => {
          const date = row.original.equityRefreshDate
            ? new Date(row.original.equityRefreshDate)
            : null
          if (!date) return true
          const [from, to] = filterValue
          if (from && date < new Date(from)) return false
          if (to && date > new Date(to)) return false
          return true
        },
        cell: ({ row }) => (
          <div>
            {row.original.equityRefreshDate
              ? new Intl.DateTimeFormat('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }).format(new Date(row.original.equityRefreshDate))
              : '-'}
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
        accessorKey: 'country',
        header: 'Country',
        filterFn: (
          row: Row<EquityRefreshSalary>,
          _: string,
          filterValue: string,
        ) => customFilterFns.containsText(row.original.country, _, filterValue),
        cell: ({ row }) => <div>{row.original.country || '-'}</div>,
      },
      {
        id: 'numberOfOptions',
        header: '# Options',
        enableColumnFilter: false,
        cell: ({ row }) => {
          const amount = row.original.equityRefreshAmount
          const options = amount ? Math.round(amount / sharePrice) : 0
          return <div>{options.toLocaleString()}</div>
        },
      },
      {
        id: 'grantType',
        header: 'Grant Type',
        meta: {
          filterVariant: 'select',
          filterOptions: [
            { label: 'ISO', value: 'ISO' },
            { label: 'EMI', value: 'EMI' },
            { label: 'NSO', value: 'NSO' },
          ],
        },
        accessorFn: (row) => getGrantType(row.country),
        filterFn: (
          row: Row<EquityRefreshSalary>,
          _: string,
          filterValue: string[],
        ) => filterValue.includes(getGrantType(row.original.country)),
        cell: ({ row }) => <div>{getGrantType(row.original.country)}</div>,
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
        accessorKey: 'equityRefreshGranted',
        header: 'Granted',
        meta: {
          filterVariant: 'select',
          filterOptions: [
            { label: 'Yes', value: true },
            { label: 'No', value: false },
          ],
        },
        filterFn: (
          row: Row<EquityRefreshSalary>,
          _: string,
          filterValue: boolean[],
        ) => {
          return filterValue.includes(row.original.equityRefreshGranted)
        },
        cell: ({ row }) => (
          <div>
            <span>{row.original.equityRefreshGranted ? 'Yes' : 'No'}</span>
            <Button
              variant="outline"
              className="ml-2"
              size="sm"
              onClick={async () => {
                await updateEquityGranted({
                  data: {
                    id: row.original.id,
                    granted: !row.original.equityRefreshGranted,
                  },
                })
                router.invalidate()
              }}
            >
              Toggle
            </Button>
          </div>
        ),
      },
      {
        accessorKey: 'communicated',
        header: 'Communicated',
        meta: {
          filterVariant: 'select',
          filterOptions: [
            { label: 'Yes', value: true },
            { label: 'No', value: false },
          ],
        },
        filterFn: (
          row: Row<EquityRefreshSalary>,
          _: string,
          filterValue: boolean[],
        ) => {
          return filterValue.includes(row.original.communicated)
        },
        cell: ({ row }) => (
          <div>
            <span>{row.original.communicated ? 'Yes' : 'No'}</span>
            <Button
              variant="outline"
              className="ml-2"
              size="sm"
              onClick={async () => {
                await updateEquityCommunicated({
                  data: {
                    id: row.original.id,
                    communicated: !row.original.communicated,
                  },
                })
                router.invalidate()
              }}
            >
              Toggle
            </Button>
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
                onClick={() => {
                  navigator.clipboard.writeText(
                    processEquityTemplate(template, row.original),
                  )
                  createToast('Template text copied to clipboard', {
                    timeout: 3000,
                  })
                }}
              >
                Copy template text
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
    [template],
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
          grantDate: salary.equityRefreshDate
            ? new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              }).format(new Date(salary.equityRefreshDate))
            : '',
          refreshPercentage: `${(salary.equityRefreshPercentage * 100).toFixed(2)}%`,
          refreshAmount: formatCurrency(salary.equityRefreshAmount),
          country: salary.country,
          numberOfOptions: salary.equityRefreshAmount
            ? Math.round(salary.equityRefreshAmount / sharePrice)
            : 0,
          grantType: getGrantType(salary.country),
          totalSalary: formatCurrency(salary.actualSalary),
          reviewer: getFullName(
            salary.employee.deelEmployee?.topLevelManager?.firstName,
            salary.employee.deelEmployee?.topLevelManager?.lastName,
          ),
          notes: salary.notes,
          granted: salary.equityRefreshGranted ? 'Yes' : 'No',
          communicated: salary.communicated ? 'Yes' : 'No',
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
              <>
                <Button
                  variant="outline"
                  className="ml-auto"
                  onClick={handleMarkSelectedAsCommunicated}
                >
                  Mark selected as communicated (
                  {Object.keys(rowSelection).length})
                </Button>
                <Button
                  variant="outline"
                  className="ml-auto"
                  onClick={handleMarkSelectedAsGranted}
                >
                  Mark selected as granted ({Object.keys(rowSelection).length})
                </Button>
              </>
            )}
            <Button
              variant="outline"
              className="ml-auto"
              onClick={() => {
                setTemplateInput(template)
                setIsTemplateDialogOpen(true)
              }}
            >
              Edit template
            </Button>
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
      <Dialog
        open={isTemplateDialogOpen}
        onOpenChange={(open) => {
          setIsTemplateDialogOpen(open)
          if (!open) setTemplateInput(template)
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="equity-template">Template</Label>
              <Textarea
                id="equity-template"
                value={templateInput}
                onChange={(e) => setTemplateInput(e.target.value)}
                placeholder="Enter template text with placeholders..."
                className="min-h-[200px] font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Available Placeholders</Label>
              <div className="text-muted-foreground space-y-1 text-sm">
                <div className="flex flex-wrap gap-1">
                  {[
                    { key: 'firstName', label: 'Employee first name' },
                    { key: 'name', label: 'Employee name' },
                    { key: 'refreshPercentage', label: 'Refresh %' },
                    { key: 'refreshAmount', label: 'Refresh amount ($)' },
                    { key: 'totalSalary', label: 'Total salary ($)' },
                    { key: 'reviewer', label: 'Reviewer' },
                    { key: 'grantDate', label: 'Grant date' },
                  ].map((placeholder) => (
                    <code
                      key={placeholder.key}
                      className="bg-muted rounded px-1 py-0.5"
                    >
                      {`{${placeholder.key}}`}
                    </code>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTemplateInput(template)
                setIsTemplateDialogOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
