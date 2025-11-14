import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { download, generateCsv, mkConfig } from 'export-to-csv'
import { useLocalStorage } from 'usehooks-ts'
import { customFilterFns, Filter, months } from '.'
import type { Prisma } from '@prisma/client'
import type {
  ColumnDef,
  ColumnFiltersState,
  Row,
  RowSelectionState,
} from '@tanstack/react-table'
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
import { createAuthenticatedFn } from '@/lib/auth-middleware'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { createToast } from 'vercel-toast'

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

const getUpdatedSalaries = createAuthenticatedFn({
  method: 'GET',
}).handler(async () => {
  return await prisma.salary.findMany({
    where: {
      timestamp: {
        gte: new Date(new Date().setDate(new Date().getDate() - 30)),
      },
      OR: [
        {
          changePercentage: {
            not: 0,
          },
        },
        {
          notes: {
            not: '',
          },
        },
      ],
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

const updateCommunicated = createAuthenticatedFn({
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

const defaultTemplate = `Hey {firstName}! I just wanted to let you know that we're giving you a raise of {changePercentage}%, which works out to a {changeAmountLocal} increase for a total salary of {salaryLocal}. Thanks for the hard work you do for PostHog and let me konw if you have any questions!`

function processTemplate(template: string, salary: Salary): string {
  const name = salary.employee.deelEmployee?.name || ''
  const firstName = salary.employee.deelEmployee?.name?.split(' ')[0] || ''
  const changePercentage = (salary.changePercentage * 100).toFixed(2)
  const changeAmount = formatCurrency(salary.changeAmount)
  const changeAmountLocal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: salary.localCurrency,
  }).format(salary.changeAmount * salary.exchangeRate)
  const actualSalary = formatCurrency(salary.actualSalary)
  const actualSalaryLocal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: salary.localCurrency,
  }).format(salary.actualSalaryLocal)
  const localCurrency = salary.localCurrency
  const reviewer = salary.employee.deelEmployee?.topLevelManager?.name || ''

  return template
    .replace(/\{name\}/g, name)
    .replace(/\{firstName\}/g, firstName)
    .replace(/\{changePercentage\}/g, changePercentage)
    .replace(/\{changeAmount\}/g, changeAmount)
    .replace(/\{changeAmountLocal\}/g, changeAmountLocal)
    .replace(/\{salary\}/g, actualSalary)
    .replace(/\{salaryLocal\}/g, actualSalaryLocal)
    .replace(/\{localCurrency\}/g, localCurrency)
    .replace(/\{reviewer\}/g, reviewer)
}

function App() {
  const salaries: Array<Salary> = Route.useLoaderData()
  const router = useRouter()
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [template, setTemplate] = useLocalStorage<string>(
    'actions-template-text',
    defaultTemplate,
  )
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [templateInput, setTemplateInput] = useState<string>(template)

  const handleMarkSelectedAsCommunicated = async () => {
    for (const id of Object.keys(rowSelection)) {
      await updateCommunicated({
        data: { id, communicated: true },
      })
    }

    router.invalidate()
  }

  const handleSaveTemplate = () => {
    setTemplate(templateInput)
    setIsTemplateDialogOpen(false)
  }

  const columns: Array<ColumnDef<Salary>> = useMemo(
    () => [
      {
        id: 'select-col',
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
        filterFn: (row: Row<Salary>, _: string, filterValue: string) =>
          (row.original.employee.deelEmployee?.name &&
            customFilterFns.containsText(
              row.original.employee.deelEmployee?.name,
              _,
              filterValue,
            )) ||
          customFilterFns.containsText(
            row.original.employee.email,
            _,
            filterValue,
          ),
        cell: ({ row }) => (
          <div>
            {row.original.employee.deelEmployee?.name ||
              row.original.employee.email}
          </div>
        ),
      },
      {
        accessorKey: 'notes',
        header: 'Notes',
        cell: ({ row }) => (
          <div className="whitespace-pre-line min-w-[200px]">
            {row.original.notes}
          </div>
        ),
      },
      {
        accessorKey: 'actualSalary',
        header: 'Salary ($)',
        meta: {
          filterVariant: 'range',
        },
        cell: ({ row }) => (
          <div>{formatCurrency(row.original.actualSalary)}</div>
        ),
      },
      {
        accessorKey: 'localCurrency',
        header: 'Currency',
        cell: ({ row }) => <div>{row.original.localCurrency}</div>,
      },
      {
        accessorKey: 'actualSalaryLocal',
        header: 'Salary (local)',
        meta: {
          filterVariant: 'range',
        },
        cell: ({ row }) => (
          <div>
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: row.original.localCurrency,
            }).format(row.original.actualSalaryLocal)}
          </div>
        ),
      },
      {
        accessorKey: 'changePercentage',
        header: 'Change (%)',
        meta: {
          filterVariant: 'range',
        },
        cell: ({ row }) => (
          <div>{(row.original.changePercentage * 100).toFixed(2)}%</div>
        ),
      },
      {
        accessorKey: 'reviewer',
        header: 'Reviewer',
        filterFn: (row: Row<Salary>, _: string, filterValue: string) =>
          customFilterFns.containsText(
            row.original.employee.deelEmployee?.topLevelManager?.name ?? '',
            _,
            filterValue,
          ),
        cell: ({ row }) => (
          <div>{row.original.employee.deelEmployee?.topLevelManager?.name}</div>
        ),
      },
      {
        accessorKey: 'communicated',
        header: 'Communicated',
        meta: {
          filterVariant: 'select',
          filterOptions: [
            { label: 'Yes', value: 'true' },
            { label: 'No', value: 'false' },
          ],
        },
        filterFn: (row: Row<Salary>, _: string, filterValue: string) =>
          customFilterFns.equals(
            row.original.communicated.toString(),
            _,
            filterValue,
          ),
        cell: ({ row }) => (
          <div>
            <span>{row.original.communicated ? 'Yes' : 'No'}</span>
            <Button
              variant="outline"
              className="ml-2"
              size="sm"
              onClick={async () => {
                await updateCommunicated({
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
                  onClick={() => {
                    navigator.clipboard.writeText(
                      processTemplate(template, row.original),
                    )
                    createToast('Template text copied to clipboard', {
                      timeout: 3000,
                    })
                  }}
                >
                  Copy template text
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [template],
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
        salary: formatCurrency(salary.actualSalary),
        currency: salary.localCurrency,
        salaryLocal: new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: salary.localCurrency,
        }).format(salary.actualSalaryLocal),
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
    <div className="w-full h-full flex justify-center">
      <div className="max-w-[80%] flex-grow">
        <div className="flex justify-between py-4">
          <div></div>
          <div className="flex items-center space-x-2">
            {Object.keys(rowSelection).length > 0 ? (
              <Button
                variant="outline"
                className="ml-auto"
                onClick={handleMarkSelectedAsCommunicated}
              >
                Mark selected as communicated
              </Button>
            ) : null}
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
      <Dialog
        open={isTemplateDialogOpen}
        onOpenChange={(open) => {
          setIsTemplateDialogOpen(open)
          if (!open) {
            // Reset to current template when dialog closes without saving
            setTemplateInput(template)
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template">Template</Label>
              <Textarea
                id="template"
                value={templateInput}
                onChange={(e) => setTemplateInput(e.target.value)}
                placeholder="Enter template text with placeholders..."
                className="min-h-[200px] font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Available Placeholders</Label>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>
                  <code className="bg-muted px-1 py-0.5 rounded">
                    {'{firstName}'}
                  </code>{' '}
                  - Employee first name
                </div>
                <div>
                  <code className="bg-muted px-1 py-0.5 rounded">
                    {'{name}'}
                  </code>{' '}
                  - Employee name
                </div>
                <div>
                  <code className="bg-muted px-1 py-0.5 rounded">
                    {'{salary}'}
                  </code>{' '}
                  - Salary ($)
                </div>
                <div>
                  <code className="bg-muted px-1 py-0.5 rounded">
                    {'{salaryLocal}'}
                  </code>{' '}
                  - Salary (local)
                </div>
                <div>
                  <code className="bg-muted px-1 py-0.5 rounded">
                    {'{changePercentage}'}
                  </code>{' '}
                  - Change (%)
                </div>
                <div>
                  <code className="bg-muted px-1 py-0.5 rounded">
                    {'{changeAmount}'}
                  </code>{' '}
                  - Change ($)
                </div>
                <div>
                  <code className="bg-muted px-1 py-0.5 rounded">
                    {'{changeAmountLocal}'}
                  </code>{' '}
                  - Change (local)
                </div>
                <div>
                  <code className="bg-muted px-1 py-0.5 rounded">
                    {'{localCurrency}'}
                  </code>{' '}
                  - Currency
                </div>
                <div>
                  <code className="bg-muted px-1 py-0.5 rounded">
                    {'{reviewer}'}
                  </code>{' '}
                  - Reviewer
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
