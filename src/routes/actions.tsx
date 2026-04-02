import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { InfoIcon, MoreHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { download, generateCsv, mkConfig } from 'export-to-csv'
import { useLocalStorage } from 'usehooks-ts'
import { customFilterFns, months } from './employees'
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
import { formatCurrency, getFullName } from '@/lib/utils'
import { createBlitzscaleFn } from '@/lib/auth-middleware'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { TableFilters } from '@/components/TableFilters'

type Salary = Prisma.SalaryGetPayload<{
  include: {
    employee: {
      include: {
        salaries: true
        deelEmployee: {
          include: {
            topLevelManager: true
          }
        }
      }
    }
  }
}>

const getUpdatedSalaries = createBlitzscaleFn({
  method: 'GET',
}).handler(async ({ context }) => {
  const { excludeEmails } = context.blitzscaleInfo

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
      ...(excludeEmails.length > 0
        ? { employee: { email: { notIn: excludeEmails } } }
        : {}),
    },
    include: {
      employee: {
        include: {
          salaries: true,
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

const updateCommunicated = createBlitzscaleFn({
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

export const Route = createFileRoute('/actions')({
  component: App,
  loader: async () => await getUpdatedSalaries(),
})

const defaultTemplate = `Hey {firstName}! I just wanted to let you know that we're giving you a raise of {changePercentage}%, which works out to a {changeAmountLocal} increase for a total salary of {salaryLocal}.

For this round we've increased the benchmark for your role to reflect our focus on raising the bar at PostHog even higher.

{#if benchmarkChanged && levelOrStepIncreased}
Receiving a pay increase after a benchmark update isn't guaranteed and depends on performance. We all agreed that your contributions have justified an increase, as well as an additional step increase for performing above even the new benchmark expectations.
{/if}

{#if benchmarkChanged && levelOrStepSame}
Receiving a pay increase after a benchmark update isn't guaranteed and depends on performance. We all agreed that your contributions have justified an increase. You won't see a change in your level or step, but that's because the expectations for those have changed, and we agreed that you're still meeting the bar for that new expectation. Though level and step stay the same, this is very much a performance raise!
{/if}

{#if benchmarkChanged && levelOrStepDecreased}
The new benchmark represents a change in our expectations for any given level or step - basically the bar for the same level/step has increased. Your performance justifies an increase for the old benchmark, so we're excited about giving you this raise. You may see your level/step numbers change due to the benchmark change updating our expectations, but this isn't a bad sign - it just gives more wiggle room for growth down the line :)
{/if}

{#if locationFactorIncreased}
We've also increased the location factor for where you live, to make sure we stay competitive in that market.
{/if}

Thank you for the work you do for PostHog!`

function processConditionals(
  template: string,
  conditions: Record<string, boolean>,
): string {
  // Process {#if expr}...{/if} blocks
  // Supports: conditionName, !conditionName, a && b, a || b
  return template.replace(
    /\{#if\s+(.+?)\}([\s\S]*?)\{\/if\}/g,
    (_match, expr: string, body: string) => {
      const result = evaluateCondition(expr.trim(), conditions)
      return result ? body : ''
    },
  )
}

function evaluateCondition(
  expr: string,
  conditions: Record<string, boolean>,
): boolean {
  // Handle && (all must be true)
  if (expr.includes('&&')) {
    return expr.split('&&').every((part) => evaluateCondition(part.trim(), conditions))
  }
  // Handle || (any must be true)
  if (expr.includes('||')) {
    return expr.split('||').some((part) => evaluateCondition(part.trim(), conditions))
  }
  // Handle negation
  if (expr.startsWith('!')) {
    return !conditions[expr.slice(1).trim()]
  }
  return !!conditions[expr]
}

function processTemplate(template: string, salary: Salary): string {
  const name = getFullName(
    salary.employee.deelEmployee?.firstName,
    salary.employee.deelEmployee?.lastName,
  )
  const firstName = salary.employee.deelEmployee?.firstName || ''
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
  const reviewer = getFullName(
    salary.employee.deelEmployee?.topLevelManager?.firstName,
    salary.employee.deelEmployee?.topLevelManager?.lastName,
  )
  const step = salary.step
  const level = salary.level
  const benchmark = salary.benchmark
  const locationFactor = salary.locationFactor
  const hasPreviousSalary = salary.employee.salaries.length > 1
  const previousSalary = salary.employee.salaries[1]
  const previousStep = previousSalary.step
  const previousLevel = previousSalary.level
  const previousBenchmark = previousSalary.benchmark
  const previousLocationFactor = previousSalary.locationFactor

  // Computed boolean conditions for {#if} blocks
  const conditions: Record<string, boolean> = {
    benchmarkChanged: hasPreviousSalary && benchmark !== previousBenchmark,
    levelOrStepIncreased:
      hasPreviousSalary &&
      (level > previousLevel || step > previousStep),
    levelOrStepSame:
      hasPreviousSalary &&
      level === previousLevel &&
      step === previousStep,
    levelOrStepDecreased:
      hasPreviousSalary &&
      (level < previousLevel || step < previousStep),
    locationFactorIncreased:
      hasPreviousSalary &&
      locationFactor > previousLocationFactor,
    locationFactorChanged:
      hasPreviousSalary &&
      locationFactor !== previousLocationFactor,
  }

  // First process conditionals, then replace variables
  let result = processConditionals(template, conditions)

  result = result
    .replace(/\{name\}/g, name)
    .replace(/\{firstName\}/g, firstName)
    .replace(/\{changePercentage\}/g, changePercentage)
    .replace(/\{changeAmount\}/g, changeAmount)
    .replace(/\{changeAmountLocal\}/g, changeAmountLocal)
    .replace(/\{salary\}/g, actualSalary)
    .replace(/\{salaryLocal\}/g, actualSalaryLocal)
    .replace(/\{localCurrency\}/g, localCurrency)
    .replace(/\{reviewer\}/g, reviewer)
    .replace(/\{step\}/g, step.toString())
    .replace(/\{level\}/g, level.toString())
    .replace(/\{benchmark\}/g, benchmark)
    .replace(/\{locationFactor\}/g, locationFactor.toString())
    .replace(/\{previousStep\}/g, previousStep.toString())
    .replace(/\{previousLevel\}/g, previousLevel.toString())
    .replace(/\{previousBenchmark\}/g, previousBenchmark)
    .replace(/\{previousLocationFactor\}/g, previousLocationFactor.toString())

  // Clean up extra blank lines left by removed conditional blocks
  result = result.replace(/\n{3,}/g, '\n\n').trim()

  return result
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
        filterFn: (row: Row<Salary>, _: string, filterValue: string) => {
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
            {getFullName(
              row.original.employee.deelEmployee?.firstName,
              row.original.employee.deelEmployee?.lastName,
              row.original.employee.email,
            )}
          </div>
        ),
      },
      {
        accessorKey: 'notes',
        header: 'Notes',
        cell: ({ row }) => (
          <div className="min-w-[200px] whitespace-pre-line">
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
            )}
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
        filterFn: (row: Row<Salary>, _: string, filterValue: boolean[]) => {
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
        accessorKey: 'synced',
        header: () => (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-row items-center gap-1">
                  <span>Synced</span>
                  <InfoIcon className="h-4 w-4 cursor-help text-gray-600" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Whether the salary has been automatically synced to the
                  payroll provider.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
        meta: {
          filterVariant: 'select',
          filterOptions: [
            { label: 'Yes', value: true },
            { label: 'No', value: false },
          ],
        },
        filterFn: (row: Row<Salary>, _: string, filterValue: boolean[]) => {
          return filterValue.includes(row.original.synced)
        },
        cell: ({ row }) => (
          <div>
            <span>{row.original.synced ? 'Yes' : 'No'}</span>
          </div>
        ),
      },
      {
        id: 'actions',
        enableColumnFilter: false,
        enableHiding: false,
        cell: ({ row }) => {
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
      table.getFilteredRowModel().rows.map((row) => {
        const salary = row.original
        return {
          name: getFullName(
            salary.employee.deelEmployee?.firstName,
            salary.employee.deelEmployee?.lastName,
            salary.employee.email,
          ),
          notes: salary.notes,
          salary: formatCurrency(salary.actualSalary),
          currency: salary.localCurrency,
          salaryLocal: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: salary.localCurrency,
          }).format(salary.actualSalaryLocal),
          changePercentage: salary.changePercentage,
          reviewer: getFullName(
            salary.employee.deelEmployee?.topLevelManager?.firstName,
            salary.employee.deelEmployee?.topLevelManager?.lastName,
          ),
          communicated: salary.communicated ? 'Yes' : 'No',
        }
      }),
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
    <div className="flex w-full justify-center px-4 pb-4">
      <div className="max-w-full flex-grow 2xl:max-w-[80%]">
        <div className="flex justify-between py-4">
          <div>
            <TableFilters table={table} />
          </div>
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
              <div className="text-muted-foreground space-y-1 text-sm">
                <div className="flex flex-wrap gap-1">
                  {[
                    { key: 'firstName', label: 'Employee first name' },
                    { key: 'name', label: 'Employee name' },
                    { key: 'salary', label: 'Salary ($)' },
                    { key: 'salaryLocal', label: 'Salary (local)' },
                    { key: 'changePercentage', label: 'Change (%)' },
                    { key: 'changeAmount', label: 'Change ($)' },
                    { key: 'changeAmountLocal', label: 'Change (local)' },
                    { key: 'localCurrency', label: 'Currency' },
                    { key: 'reviewer', label: 'Reviewer' },
                    { key: 'previousStep', label: 'Previous step' },
                    { key: 'previousLevel', label: 'Previous level' },
                    { key: 'previousBenchmark', label: 'Previous benchmark' },
                    {
                      key: 'previousLocationFactor',
                      label: 'Previous location factor',
                    },
                    { key: 'step', label: 'Step' },
                    { key: 'level', label: 'Level' },
                    { key: 'benchmark', label: 'Benchmark' },
                    { key: 'locationFactor', label: 'Location factor' },
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
            <div className="space-y-2">
              <Label>Conditional Blocks</Label>
              <div className="text-muted-foreground space-y-2 text-sm">
                <p>
                  Use{' '}
                  <code className="bg-muted rounded px-1 py-0.5">
                    {'{#if condition}'}...{'{/if}'}
                  </code>{' '}
                  to show text only when a condition is true. Combine
                  with <code className="bg-muted rounded px-1 py-0.5">{'&&'}</code>,{' '}
                  <code className="bg-muted rounded px-1 py-0.5">{'||'}</code>, or{' '}
                  <code className="bg-muted rounded px-1 py-0.5">{'!'}</code>.
                </p>
                <div className="flex flex-wrap gap-1">
                  {[
                    {
                      key: 'benchmarkChanged',
                      label: 'Benchmark differs from previous',
                    },
                    {
                      key: 'levelOrStepIncreased',
                      label: 'Level or step went up',
                    },
                    {
                      key: 'levelOrStepSame',
                      label: 'Level and step unchanged',
                    },
                    {
                      key: 'levelOrStepDecreased',
                      label: 'Level or step went down',
                    },
                    {
                      key: 'locationFactorIncreased',
                      label: 'Location factor went up',
                    },
                    {
                      key: 'locationFactorChanged',
                      label: 'Location factor changed',
                    },
                  ].map((condition) => (
                    <TooltipProvider key={condition.key}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <code className="bg-muted cursor-help rounded px-1 py-0.5">
                            {condition.key}
                          </code>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{condition.label}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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
