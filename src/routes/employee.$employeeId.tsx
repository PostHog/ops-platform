import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import ReactMarkdown from 'react-markdown'
import { useForm, useStore } from '@tanstack/react-form'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import 'vercel-toast/dist/vercel-toast.css'
import { createToast } from 'vercel-toast'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { AlertCircle, Trash2 } from 'lucide-react'
import { useAtom } from 'jotai'
import { months } from '.'
import type { ColumnDef } from '@tanstack/react-table'
import type { Prisma, Salary } from '@prisma/client'
import type { AnyFormApi } from '@tanstack/react-form'
import { reviewQueueAtom } from '@/atoms'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  currencyData,
  formatCurrency,
  getAreasByCountry,
  getCountries,
  locationFactor,
  sfBenchmark,
} from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import prisma from '@/db'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useQuery } from '@tanstack/react-query'
import { createAuthenticatedFn, createUserFn } from '@/lib/auth-middleware'
import { useSession } from '@/lib/auth-client'
import { ROLES } from '@/lib/consts'

export const Route = createFileRoute('/employee/$employeeId')({
  component: EmployeeOverview,
  loader: async ({ params }) =>
    await getEmployeeById({ data: { employeeId: params.employeeId } }),
})

const getEmployeeById = createUserFn({
  method: 'GET',
})
  .inputValidator((d: { employeeId: string }) => d)
  .handler(async ({ data, context }) => {
    const isAdmin = context.user.role === ROLES.ADMIN
    return await prisma.employee.findUnique({
      where: {
        id: data.employeeId,
        ...(!isAdmin
          ? {
              email: context.user.email,
            }
          : {}),
      },
      select: {
        id: true,
        email: true,
        ...(isAdmin ? { priority: true, reviewed: true } : {}),
        ...(isAdmin
          ? {
              keeperTestFeedback: {
                orderBy: {
                  timestamp: 'desc',
                },
                include: {
                  manager: {
                    include: {
                      deelEmployee: true,
                    },
                  },
                },
              },
            }
          : {}),
        salaries: {
          orderBy: {
            timestamp: 'desc',
          },
          ...(isAdmin
            ? {}
            : {
                select: {
                  id: true,
                  timestamp: true,
                  country: true,
                  area: true,
                  locationFactor: true,
                  level: true,
                  step: true,
                  benchmark: true,
                  benchmarkFactor: true,
                  totalSalary: true,
                  changePercentage: true,
                  changeAmount: true,
                  exchangeRate: true,
                  localCurrency: true,
                  totalSalaryLocal: true,
                  amountTakenInOptions: true,
                  actualSalary: true,
                  actualSalaryLocal: true,
                },
                where: {
                  OR: [
                    {
                      communicated: true,
                    },
                    {
                      timestamp: {
                        lte: new Date(
                          new Date().setDate(new Date().getDate() - 30),
                        ),
                      },
                    },
                  ],
                },
              }),
        },
        deelEmployee: {
          include: {
            topLevelManager: true,
          },
        },
      },
    })
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
    keeperTestFeedback: {
      include: {
        manager: {
          include: {
            deelEmployee: true
          }
        }
      }
    }
  }
}>

export const getReferenceEmployees = createAuthenticatedFn({
  method: 'GET',
})
  .inputValidator(
    (d: {
      level: number
      step: number
      benchmark: string
      filterByLevel?: boolean
      filterByExec?: boolean
      filterByTitle?: boolean
      topLevelManagerId?: string | null
    }) => d,
  )
  .handler(async ({ data }) => {
    const whereClause: Prisma.EmployeeWhereInput = {
      salaries: {
        some: {
          ...(data.filterByLevel !== false ? { level: data.level } : {}),
          ...(data.filterByTitle !== false
            ? { benchmark: data.benchmark }
            : {}),
        },
      },
      ...(data.filterByExec && data.topLevelManagerId
        ? {
            deelEmployee: {
              topLevelManagerId: data.topLevelManagerId,
            },
          }
        : {}),
    }

    const employees = await prisma.employee.findMany({
      where: whereClause,
      include: {
        salaries: {
          orderBy: {
            timestamp: 'desc',
          },
        },
        deelEmployee: {
          select: {
            name: true,
          },
        },
      },
    })

    return employees
      .filter(
        (employee) =>
          (data.filterByLevel !== false
            ? employee.salaries[0]?.level === data.level
            : true) &&
          (data.filterByTitle !== false
            ? employee.salaries[0]?.benchmark === data.benchmark
            : true),
      )
      .map((employee) => ({
        id: employee.id,
        name: employee.deelEmployee?.name ?? employee.email,
        level: employee.salaries[0]?.level,
        step: employee.salaries[0]?.step,
        locationFactor: employee.salaries[0]?.locationFactor ?? 1,
        location:
          employee.salaries[0]?.country + ', ' + employee.salaries[0]?.area,
        salary: employee.salaries[0]?.totalSalary ?? 0,
      }))
      .sort((a, b) => a.step * a.level - b.step * b.level)
  })

export const updateSalary = createAuthenticatedFn({
  method: 'POST',
})
  .inputValidator((d: Omit<Salary, 'id' | 'timestamp' | 'communicated'>) => d)
  .handler(async ({ data }) => {
    // Create the salary entry
    const salary = await prisma.salary.create({
      data: {
        ...data,
      },
    })

    // Update the employee's reviewed status to true
    await prisma.employee.update({
      where: { id: data.employeeId },
      data: { reviewed: true },
    })

    return salary
  })

export const deleteSalary = createAuthenticatedFn({
  method: 'POST',
})
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const existingSalary = await prisma.salary.findUnique({
      where: { id: data.id },
    })

    if (!existingSalary) {
      throw new Error('Salary not found')
    }

    const hoursSinceCreation =
      (Date.now() - existingSalary.timestamp.getTime()) / (1000 * 60 * 60)
    if (hoursSinceCreation > 24) {
      throw new Error('Cannot delete salary after 24 hours')
    }

    await prisma.salary.delete({
      where: { id: data.id },
    })

    return { success: true }
  })

function EmployeeOverview() {
  const { data: session } = useSession()
  const user = session?.user
  const [showInlineForm, setShowInlineForm] = useState(
    user?.role === ROLES.ADMIN,
  )
  const [showOverrideMode, setShowOverrideMode] = useState(false)
  const [showReferenceEmployees, setShowReferenceEmployees] = useState(false)
  const [showDetailedColumns, setShowDetailedColumns] = useState(false)
  const [filterByExec, setFilterByExec] = useState(false)
  const [filterByLevel, setFilterByLevel] = useState(true)
  const [filterByTitle, setFilterByTitle] = useState(true)

  const router = useRouter()
  const employee: Employee = Route.useLoaderData()
  const [reviewQueue, setReviewQueue] = useAtom(reviewQueueAtom)
  const [level, setLevel] = useState(employee.salaries[0]?.level ?? 1)
  const [step, setStep] = useState(employee.salaries[0]?.step ?? 1)
  const [benchmark, setBenchmark] = useState(
    employee.salaries[0]?.benchmark ?? 'Product Engineer',
  )

  if (!employee) return null

  const { data: referenceEmployees } = useQuery({
    queryKey: [
      'referenceEmployees',
      employee.id,
      level,
      step,
      benchmark,
      filterByExec,
      filterByLevel,
      filterByTitle,
    ],
    queryFn: () =>
      getReferenceEmployees({
        data: {
          level,
          step,
          benchmark,
          filterByExec,
          filterByLevel,
          filterByTitle,
          topLevelManagerId: employee.deelEmployee?.topLevelManagerId ?? null,
        },
      }),
    placeholderData: (prevData, prevQuery) => {
      if (prevQuery?.queryKey[1] === employee.id) return prevData
    },
    enabled: !!level && !!step && !!benchmark && user?.role === ROLES.ADMIN,
  })

  // Combine reference employees with current employee (using form values if available)
  const combinedReferenceEmployees = useMemo(() => {
    const refs = referenceEmployees ?? []
    const currentEmployeeRef: ReferenceEmployee = {
      id: employee.id,
      name: employee.deelEmployee?.name ?? employee.email,
      level: level,
      step: step,
      locationFactor: employee.salaries[0]?.locationFactor ?? 1,
      location:
        employee.salaries[0]?.country + ', ' + employee.salaries[0]?.area,
      salary: employee.salaries[0]?.totalSalary ?? 0,
    }

    // Filter out current employee from refs if it exists, then add it back with updated values
    const filteredRefs = refs.filter((ref) => ref.id !== employee.id)
    const combined = [...filteredRefs, currentEmployeeRef]

    // Sort by step
    return combined.sort((a, b) => a.step * a.level - b.step * b.level)
  }, [referenceEmployees, employee, level, step])

  const columns: Array<ColumnDef<Salary>> = useMemo(() => {
    const baseColumns: Array<ColumnDef<Salary>> = [
      {
        accessorKey: 'timestamp',
        header: 'Last Change (date)',
        cell: ({ row }) => {
          const date = new Date(row.original.timestamp)
          return (
            <div>
              {months[date.getMonth()]} {date.getFullYear()}
            </div>
          )
        },
      },
      {
        accessorKey: 'country',
        header: 'Country',
        cell: ({ row }) => <div>{row.original.country}</div>,
      },
      {
        accessorKey: 'area',
        header: 'Area',
        cell: ({ row }) => <div>{row.original.area}</div>,
      },
      {
        accessorKey: 'benchmark',
        header: 'Benchmark',
        cell: ({ row }) => <div>{row.original.benchmark}</div>,
      },
      {
        accessorKey: 'locationFactor',
        header: () => <div className="text-right">Location</div>,
        cell: ({ row }) => (
          <div className="text-right">{row.original.locationFactor}</div>
        ),
      },
      {
        accessorKey: 'level',
        header: () => <div className="text-right">Level</div>,
        cell: ({ row }) => (
          <div className="text-right">{row.original.level}</div>
        ),
      },
      {
        accessorKey: 'step',
        header: () => <div className="text-right">Step</div>,
        cell: ({ row }) => (
          <div className="text-right">{row.original.step}</div>
        ),
      },
      {
        accessorKey: 'totalSalary',
        header: () => <div className="text-right">Total Salary ($)</div>,
        cell: ({ row }) => {
          const salary = row.original
          const expectedTotal =
            salary.locationFactor *
            salary.level *
            salary.step *
            salary.benchmarkFactor
          const isMismatch = Math.abs(salary.totalSalary - expectedTotal) > 0.01 // Allow for small floating point differences

          return (
            <div
              className={`text-right ${isMismatch ? 'text-red-600 font-medium' : ''}`}
              title={
                isMismatch
                  ? `Mismatch detected! Expected: ${formatCurrency(expectedTotal)}, Actual: ${formatCurrency(salary.totalSalary)}`
                  : ''
              }
            >
              {formatCurrency(salary.totalSalary)}
            </div>
          )
        },
      },
      {
        accessorKey: 'changeAmount',
        header: () => <div className="text-right">Change ($)</div>,
        cell: ({ row }) => (
          <div className="text-right">
            {formatCurrency(row.original.changeAmount)}
          </div>
        ),
      },
      {
        accessorKey: 'changePercentage',
        header: () => <div className="text-right">Change (%)</div>,
        cell: ({ row }) => (
          <div className="text-right">
            {(row.original.changePercentage * 100).toFixed(2)}%
          </div>
        ),
      },
      ...(user?.role === ROLES.ADMIN
        ? ([
            {
              accessorKey: 'notes',
              header: 'Notes',
              cell: ({ row }) => (
                <div className="min-w-[200px] whitespace-pre-line">
                  {row.original.notes}
                </div>
              ),
            },
          ] as ColumnDef<Salary>[])
        : []),
      {
        id: 'actions',
        header: () => (
          <button
            onClick={() => setShowDetailedColumns(!showDetailedColumns)}
            className="flex items-center justify-center text-gray-400 hover:text-gray-600 w-full"
          >
            <span className="text-xs">{showDetailedColumns ? '▶' : '◀'}</span>
          </button>
        ),
        cell: ({ row }) => {
          if (user?.role !== ROLES.ADMIN) return null
          const salary = row.original
          const hoursSinceCreation =
            (Date.now() - salary.timestamp.getTime()) / (1000 * 60 * 60)
          const isDeletable = hoursSinceCreation <= 24
          return (
            <div className="flex items-center justify-center">
              {isDeletable && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await deleteSalary({ data: { id: salary.id } })
                      createToast('Salary deleted successfully.', {
                        timeout: 3000,
                      })
                      router.invalidate()
                    } catch (error) {
                      createToast(
                        error instanceof Error
                          ? error.message
                          : 'Failed to delete salary.',
                        {
                          timeout: 3000,
                        },
                      )
                    }
                  }}
                  className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          )
        },
      },
    ]

    const detailedColumns: Array<ColumnDef<Salary>> = [
      {
        accessorKey: 'exchangeRate',
        header: () => <div className="text-right">Exchange Rate</div>,
        cell: ({ row }) => (
          <div className="text-right">{row.original.exchangeRate}</div>
        ),
      },
      {
        accessorKey: 'totalSalaryLocal',
        header: () => <div className="text-right">Total Salary (local)</div>,
        cell: ({ row }) => (
          <div className="text-right">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: row.original.localCurrency,
            }).format(row.original.totalSalaryLocal)}
          </div>
        ),
      },
      {
        accessorKey: 'amountTakenInOptions',
        header: () => (
          <div className="text-right">Amount Taken In Options ($)</div>
        ),
        cell: ({ row }) => (
          <div className="text-right">
            {formatCurrency(row.original.amountTakenInOptions)}
          </div>
        ),
      },
      {
        accessorKey: 'actualSalary',
        header: () => <div className="text-right">Actual Salary ($)</div>,
        cell: ({ row }) => (
          <div className="text-right">
            {formatCurrency(row.original.actualSalary)}
          </div>
        ),
      },
      {
        accessorKey: 'actualSalaryLocal',
        header: () => <div className="text-right">Actual Salary (local)</div>,
        cell: ({ row }) => (
          <div className="text-right">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: row.original.localCurrency,
            }).format(row.original.actualSalaryLocal)}
          </div>
        ),
      },
    ]

    return showDetailedColumns
      ? [...baseColumns, ...detailedColumns]
      : [...baseColumns]
  }, [showDetailedColumns, user?.role, employee.salaries])

  const handleMoveToNextEmployee = () => {
    const currentIndex = reviewQueue.indexOf(employee.id)
    const nextEmployee = reviewQueue[currentIndex + 1] ?? null
    if (nextEmployee) {
      router.navigate({
        to: '/employee/$employeeId',
        params: { employeeId: nextEmployee },
      })
      setShowInlineForm(true)
      setShowOverrideMode(false)
    } else {
      createToast(
        'No more employees in review queue, navigating to overview.',
        {
          timeout: 3000,
        },
      )
      setReviewQueue([])
      router.navigate({ to: '/' })
    }
  }

  const table = useReactTable({
    data: employee.salaries,
    columns,
    getCoreRowModel: getCoreRowModel(),
    filterFns: {
      fuzzy: () => true,
    },
  })

  const benchmarkUpdated =
    employee.salaries[0] &&
    sfBenchmark[employee.salaries[0]?.benchmark as keyof typeof sfBenchmark] !==
      employee.salaries[0].benchmarkFactor

  return (
    <div className="pt-8 flex justify-center flex flex-col items-center gap-5">
      <div className="2xl:w-[80%] max-w-full px-4 flex flex-col gap-5">
        <div className="flex flex-row justify-between items-center">
          <div className="flex flex-col">
            <span className="text-xl font-bold">
              {employee.deelEmployee?.name || employee.email || 'Edit employee'}
            </span>
            <div className="text-sm text-gray-600 mt-1 flex gap-4">
              <span>Email: {employee.email}</span>
              {employee.priority ? (
                <span>Priority: {employee.priority}</span>
              ) : null}
              {employee.deelEmployee?.topLevelManager?.name && (
                <span>
                  Reviewer: {employee.deelEmployee.topLevelManager.name}
                </span>
              )}
              {typeof employee.reviewed === 'boolean' ? (
                <span>Reviewed: {employee.reviewed ? 'Yes' : 'No'}</span>
              ) : null}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            {user?.role === ROLES.ADMIN ? (
              <Button
                variant="outline"
                type="button"
                onClick={() => router.navigate({ to: '/' })}
              >
                Back to overview
              </Button>
            ) : null}
            {reviewQueue.length > 0 ? (
              <Button
                variant="outline"
                type="button"
                onClick={handleMoveToNextEmployee}
              >
                Move to next employee
              </Button>
            ) : null}
          </div>
        </div>

        {user?.role === ROLES.ADMIN ? (
          <>
            <div className="flex flex-row gap-2 justify-between items-center mt-2">
              <span className="text-md font-bold">Feedback</span>
            </div>

            <div className="w-full flex-grow">
              <div className="mb-4 p-4 border rounded-lg bg-gray-50 max-h-[300px] overflow-y-auto">
                {employee.keeperTestFeedback.map(
                  ({
                    id,
                    title,
                    manager,
                    wouldYouTryToKeepThem,
                    whatMakesThemValuable,
                    driverOrPassenger,
                    proactiveToday,
                    optimisticByDefault,
                    areasToWatch,
                    recommendation,
                    sharedWithTeamMember,
                    timestamp,
                  }) => (
                    <div
                      key={id}
                      className="mb-4 p-4 border rounded-lg bg-gray-50"
                    >
                      <span className="text-sm text-gray-500 w-full text-right list-disc">
                        {new Date(timestamp).toLocaleDateString()}
                      </span>
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => (
                            <h1 className="text-2xl font-bold">{children}</h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-xl font-bold">{children}</h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-lg font-bold">{children}</h3>
                          ),
                          h4: ({ children }) => (
                            <h4 className="text-base font-bold">{children}</h4>
                          ),
                          h5: ({ children }) => (
                            <h5 className="text-sm font-bold">{children}</h5>
                          ),
                          h6: ({ children }) => (
                            <h6 className="text-xs font-bold">{children}</h6>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc list-inside">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ul className="list-decimal list-inside">
                              {children}
                            </ul>
                          ),
                        }}
                      >
                        {`### ${title} feedback from ${manager.deelEmployee?.name ?? manager.email}:\n` +
                          `- **If this team member was leaving for a similar role at another company, would you try to keep them?** ${wouldYouTryToKeepThem ? 'Yes' : 'No'}\n` +
                          `- **What makes them so valuable to your team and PostHog?** ${whatMakesThemValuable}\n` +
                          `- **Are they a driver or a passenger?** ${driverOrPassenger}\n` +
                          `- **Do they get things done proactively, today?** ${proactiveToday ? 'Yes' : 'No'}\n` +
                          `- **Are they optimistic by default?** ${optimisticByDefault ? 'Yes' : 'No'}\n` +
                          `- **Areas to watch:** ${areasToWatch}\n` +
                          (recommendation
                            ? `- **Recommendation**: ${recommendation}\n`
                            : '') +
                          `- **Have you shared this feedback with your team member?** ${sharedWithTeamMember ? 'Yes' : 'No, but I will do right now!'}`}
                      </ReactMarkdown>
                    </div>
                  ),
                )}

                {employee.keeperTestFeedback.length === 0 && (
                  <div className="text-center text-sm text-gray-500">
                    No feedback yet.
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}

        <div className="flex flex-row gap-2 justify-between items-center mt-2">
          <span className="text-md font-bold">Salary history</span>
          <div className="flex gap-2">
            {showInlineForm ? (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setShowReferenceEmployees(!showReferenceEmployees)
                }
              >
                {showReferenceEmployees
                  ? 'Hide reference employees'
                  : 'Show reference employees'}
              </Button>
            ) : null}
            {showInlineForm ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowOverrideMode(!showOverrideMode)}
              >
                {showOverrideMode
                  ? 'Disable override mode'
                  : 'Enable override mode'}
              </Button>
            ) : null}
            {user?.role === ROLES.ADMIN ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowInlineForm(!showInlineForm)}
              >
                {showInlineForm ? 'Cancel' : 'Add New Salary'}
              </Button>
            ) : null}
          </div>
        </div>

        {employee.salaries[0] &&
          (() => {
            const locationFactorUpdated =
              locationFactor.find(
                (l) =>
                  l.country === employee.salaries[0].country &&
                  l.area === employee.salaries[0].area,
              )?.locationFactor !== employee.salaries[0].locationFactor

            return (
              <>
                {benchmarkUpdated && user?.role === ROLES.ADMIN && (
                  <Alert variant="default">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>
                      This employee is currently on an old benchmark factor.
                    </AlertTitle>
                    <AlertDescription>
                      You can keep it that way by choosing `
                      {employee.salaries[0].benchmark} (old)` as the benchmark,
                      or updated it by choosing `
                      {employee.salaries[0].benchmark.replace(' (old)', '')}` as
                      the benchmark.
                    </AlertDescription>
                  </Alert>
                )}

                {locationFactorUpdated && user?.role === ROLES.ADMIN && (
                  <Alert variant="default">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>
                      This employee is currently on an old location factor.
                    </AlertTitle>
                    <AlertDescription>
                      The location factor will be updated on the next salary
                      update.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )
          })()}

        <div className="w-full flex-grow">
          <div className="overflow-hidden rounded-md border">
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
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {showInlineForm && (
                  <InlineSalaryFormRow
                    employeeId={employee.id}
                    showOverrideMode={showOverrideMode}
                    latestSalary={employee.salaries[0]}
                    showDetailedColumns={showDetailedColumns}
                    totalAmountInStockOptions={employee.salaries.reduce(
                      (acc, salary) => acc + salary.amountTakenInOptions,
                      0,
                    )}
                    onSuccess={() => {
                      setShowInlineForm(false)
                      router.invalidate()
                    }}
                    onCancel={() => setShowInlineForm(false)}
                    benchmarkUpdated={benchmarkUpdated}
                    setLevel={setLevel}
                    setStep={setStep}
                    setBenchmark={setBenchmark}
                  />
                )}
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

        {showInlineForm && showReferenceEmployees && (
          <>
            <div className="flex flex-row gap-2 justify-between items-center mt-2">
              <span className="text-md font-bold">Reference employees</span>
              <div className="flex gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Switch
                    id="filter-by-level"
                    checked={filterByLevel}
                    onCheckedChange={setFilterByLevel}
                  />
                  <Label htmlFor="filter-by-level" className="text-sm">
                    Filter by level
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="filter-by-exec"
                    checked={filterByExec}
                    onCheckedChange={setFilterByExec}
                  />
                  <Label htmlFor="filter-by-exec" className="text-sm">
                    Filter by exec
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="filter-by-title"
                    checked={filterByTitle}
                    onCheckedChange={setFilterByTitle}
                  />
                  <Label htmlFor="filter-by-title" className="text-sm">
                    Filter by titles
                  </Label>
                </div>
              </div>
            </div>

            <div className="w-full flex-grow">
              <ReferenceEmployeesTable
                referenceEmployees={combinedReferenceEmployees}
                currentEmployee={employee}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function InlineSalaryFormRow({
  employeeId,
  showOverrideMode,
  onSuccess,
  onCancel,
  latestSalary,
  showDetailedColumns,
  totalAmountInStockOptions,
  benchmarkUpdated,
  setLevel,
  setStep,
  setBenchmark,
}: {
  employeeId: string
  showOverrideMode: boolean
  onSuccess: () => void
  onCancel: () => void
  latestSalary: Salary | undefined
  showDetailedColumns: boolean
  totalAmountInStockOptions: number
  benchmarkUpdated: boolean
  setLevel: (level: number) => void
  setStep: (step: number) => void
  setBenchmark: (benchmark: string) => void
}) {
  const getDefaultValues = () => ({
    country: latestSalary?.country ?? 'United States',
    area: latestSalary?.area ?? 'San Francisco, California',
    locationFactor: latestSalary?.locationFactor ?? 0,
    level: latestSalary?.level ?? 1,
    step: latestSalary?.step ?? 1,
    benchmark: latestSalary?.benchmark ?? 'Product Engineer',
    benchmarkFactor: latestSalary?.benchmarkFactor ?? 0,
    totalSalary: latestSalary?.totalSalary ?? 0,
    changePercentage: 0, // Always 0 for new entries
    changeAmount: 0, // Always 0 for new entries
    localCurrency: latestSalary?.localCurrency ?? 'USD',
    exchangeRate: latestSalary?.exchangeRate ?? 1,
    totalSalaryLocal: latestSalary?.totalSalaryLocal ?? 0,
    amountTakenInOptions: 0,
    actualSalary: latestSalary?.actualSalary ?? 0,
    actualSalaryLocal: latestSalary?.actualSalaryLocal ?? 0,
    notes: '',
    employeeId: employeeId,
  })

  const updateFormFields = (formApi: AnyFormApi) => {
    const location = locationFactor.find(
      (l) =>
        l.country === formApi.getFieldValue('country') &&
        l.area === formApi.getFieldValue('area'),
    )
    const locationFactorValue = location?.locationFactor ?? 0
    formApi.setFieldValue(
      'locationFactor',
      Number(locationFactorValue.toFixed(2)),
    )

    const benchmarkValue = formApi.getFieldValue('benchmark')
    const benchmarkFactor = benchmarkValue?.includes('(old)')
      ? (latestSalary?.benchmarkFactor ?? 0)
      : (sfBenchmark[
          benchmarkValue?.replace(' (old)', '') as keyof typeof sfBenchmark
        ] ?? 0)
    formApi.setFieldValue('benchmarkFactor', Number(benchmarkFactor.toFixed(2)))

    const currentLocationFactor = formApi.getFieldValue('locationFactor') ?? 0
    const level = formApi.getFieldValue('level') ?? 1
    const step = formApi.getFieldValue('step') ?? 1
    let totalSalary = currentLocationFactor * level * step * benchmarkFactor
    if (!showOverrideMode) {
      formApi.setFieldValue('totalSalary', Number(totalSalary.toFixed(2)))
    } else {
      totalSalary = formApi.getFieldValue('totalSalary') ?? totalSalary
    }

    // Calculate change from the latest salary
    const latestTotalSalary = latestSalary?.totalSalary ?? 0
    const changePercentage =
      latestTotalSalary > 0 ? totalSalary / latestTotalSalary - 1 : 0
    formApi.setFieldValue(
      'changePercentage',
      Number(changePercentage.toFixed(4)),
    )

    const changeAmount = totalSalary - latestTotalSalary
    formApi.setFieldValue('changeAmount', Number(changeAmount.toFixed(2)))

    const exchangeRate = currencyData[location?.currency ?? ''] ?? 1
    formApi.setFieldValue('exchangeRate', exchangeRate)
    formApi.setFieldValue(
      'localCurrency',
      currencyData[location?.currency ?? ''] ? location?.currency : 'USD',
    )

    const totalSalaryLocal = totalSalary * exchangeRate
    formApi.setFieldValue(
      'totalSalaryLocal',
      Number(totalSalaryLocal.toFixed(2)),
    )

    const amountTakenInOptions =
      formApi.getFieldValue('amountTakenInOptions') ?? 0
    const actualSalary =
      totalSalary - amountTakenInOptions - totalAmountInStockOptions
    formApi.setFieldValue('actualSalary', Number(actualSalary.toFixed(2)))

    const actualSalaryLocal = actualSalary * exchangeRate
    formApi.setFieldValue(
      'actualSalaryLocal',
      Number(actualSalaryLocal.toFixed(2)),
    )
  }

  const form = useForm({
    defaultValues: getDefaultValues(),
    onSubmit: async ({ value }) => {
      await updateSalary({ data: value })
      onSuccess()
      createToast('Salary added successfully.', {
        timeout: 3000,
      })
    },
    listeners: {
      onMount({ formApi }) {
        updateFormFields(formApi)
      },
      onChange: ({ formApi, fieldApi }) => {
        if (
          [
            'country',
            'area',
            'level',
            'step',
            'benchmark',
            'amountTakenInOptions',
          ].includes(fieldApi.name)
        ) {
          updateFormFields(formApi)
        } else if (
          ['totalSalary'].includes(fieldApi.name) &&
          showOverrideMode
        ) {
          updateFormFields(formApi)
        }
      },
    },
  })

  const level = useStore(form.store, (state) => state.values.level)
  const step = useStore(form.store, (state) => state.values.step)
  const benchmark = useStore(form.store, (state) => state.values.benchmark)
  const canSubmit = useStore(form.store, (state) => state.canSubmit)

  useEffect(() => {
    setLevel(level)
    setStep(step)
    setBenchmark(benchmark)
  }, [level, step, benchmark, setLevel, setStep, setBenchmark])

  useEffect(() => {
    form.reset(getDefaultValues())
    form.mount()
  }, [employeeId])

  const country = useStore(form.store, (state) => state.values.country)

  return (
    <TableRow className="bg-blue-50">
      <TableCell>
        <div className="text-xs text-gray-500">New Entry</div>
      </TableCell>
      <TableCell>
        <form.Field
          name="country"
          children={(field) => (
            <Select
              value={field.state.value}
              onValueChange={(value) => field.handleChange(value)}
            >
              <SelectTrigger className="w-full h-6 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getCountries().map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </TableCell>
      <TableCell>
        <form.Field
          name="area"
          children={(field) => (
            <Select
              value={field.state.value}
              onValueChange={(value) => field.handleChange(value)}
              disabled={!country}
            >
              <SelectTrigger className="w-full h-6 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getAreasByCountry(country).map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </TableCell>
      <TableCell>
        <form.Field
          name="benchmark"
          children={(field) => (
            <Select
              value={field.state.value}
              onValueChange={(value) => field.handleChange(value)}
            >
              <SelectTrigger className="w-full h-6 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {benchmarkUpdated ? (
                  <SelectItem
                    value={`${latestSalary?.benchmark?.replace(' (old)', '')} (old)`}
                    key="old-benchmark"
                  >
                    {latestSalary?.benchmark?.replace(' (old)', '')} (old) (
                    {latestSalary?.benchmarkFactor})
                  </SelectItem>
                ) : null}
                {Object.keys(sfBenchmark).map((benchmark) => (
                  <SelectItem key={benchmark} value={benchmark}>
                    {benchmark} ({sfBenchmark[benchmark]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </TableCell>
      <TableCell>
        <form.Field
          name="locationFactor"
          children={(field) => (
            <div className="text-xs py-1 px-1 text-right">
              {field.state.value}
            </div>
          )}
        />
      </TableCell>
      <TableCell>
        <form.Field
          name="level"
          children={(field) => (
            <Select
              value={field.state.value.toString()}
              onValueChange={(value) => field.handleChange(Number(value))}
            >
              <SelectTrigger className="w-full h-6 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.59">Junior (0.59)</SelectItem>
                <SelectItem value="0.78">Intermediate (0.78)</SelectItem>
                <SelectItem value="1">Senior (1)</SelectItem>
                <SelectItem value="1.2">Staff (1.2)</SelectItem>
                <SelectItem value="1.4">Director (1.4)</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </TableCell>
      <TableCell>
        <form.Field
          name="step"
          validators={{
            onChange: ({ value }) => {
              if (value < 0.85 || value > 1.2) {
                return 'Step must be between 0.85 and 1.2'
              }
            },
          }}
          children={(field) => (
            <Input
              className={
                'w-full h-6 text-xs min-w-[70px]' +
                (field.state.meta.errors.length > 0
                  ? ' border-red-500 ring-red-500'
                  : '')
              }
              value={field.state.value}
              type="number"
              step={0.01}
              min={0.85}
              max={1.2}
              onChange={(e) => field.handleChange(Number(e.target.value))}
            />
          )}
        />
      </TableCell>
      <TableCell>
        <form.Field
          name="totalSalary"
          children={(field) => {
            const locationFactor = form.getFieldValue('locationFactor') ?? 0
            const level = form.getFieldValue('level') ?? 1
            const step = form.getFieldValue('step') ?? 1
            const benchmarkFactor = form.getFieldValue('benchmarkFactor') ?? 0
            const expectedTotal =
              locationFactor * level * step * benchmarkFactor
            const isMismatch =
              Math.abs(field.state.value - expectedTotal) > 0.01

            if (showOverrideMode) {
              return (
                <Input
                  className="w-full h-6 text-xs min-w-[70px]"
                  value={field.state.value}
                  type="number"
                  step={1}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                />
              )
            }

            return (
              <div
                className={`text-xs py-1 px-1 text-right ${isMismatch ? 'text-red-600 font-medium' : ''}`}
                title={
                  isMismatch
                    ? `Mismatch detected! Expected: ${formatCurrency(expectedTotal)}, Actual: ${formatCurrency(field.state.value)}`
                    : ''
                }
              >
                {formatCurrency(field.state.value)}
              </div>
            )
          }}
        />
      </TableCell>
      <TableCell>
        <form.Field
          name="changeAmount"
          children={(field) => (
            <div className="text-xs py-1 px-1 text-right">
              {formatCurrency(field.state.value)}
            </div>
          )}
        />
      </TableCell>
      <TableCell>
        <form.Field
          name="changePercentage"
          children={(field) => (
            <div className="text-xs py-1 px-1 text-right">
              {(field.state.value * 100).toFixed(2)}%
            </div>
          )}
        />
      </TableCell>
      <TableCell>
        <form.Field
          name="notes"
          children={(field) => (
            <Textarea
              className="w-full min-h-[24px] text-xs !text-xs resize-none"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Notes..."
              autoFocus
            />
          )}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-center text-gray-400">
          <span className="text-xs">{showDetailedColumns ? '▶' : '◀'}</span>
        </div>
      </TableCell>
      {showDetailedColumns && (
        <>
          <TableCell>
            <form.Field
              name="exchangeRate"
              children={(field) => (
                <div className="text-xs py-1 px-1 text-right">
                  {field.state.value}
                </div>
              )}
            />
          </TableCell>
          <TableCell>
            <form.Field
              name="totalSalaryLocal"
              children={(field) => {
                const localCurrency =
                  form.getFieldValue('localCurrency') ?? 'USD'
                return (
                  <div className="text-xs py-1 px-1 text-right">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: localCurrency,
                    }).format(field.state.value)}
                  </div>
                )
              }}
            />
          </TableCell>
          <TableCell>
            <form.Field
              name="amountTakenInOptions"
              children={(field) => (
                <Input
                  className="w-full h-6 text-xs"
                  value={field.state.value}
                  type="number"
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                />
              )}
            />
          </TableCell>
          <TableCell>
            <form.Field
              name="actualSalary"
              children={(field) => (
                <div className="text-xs py-1 px-1 text-right">
                  {formatCurrency(field.state.value)}
                </div>
              )}
            />
          </TableCell>
          <TableCell>
            <form.Field
              name="actualSalaryLocal"
              children={(field) => {
                const localCurrency =
                  form.getFieldValue('localCurrency') ?? 'USD'
                return (
                  <div className="text-xs py-1 px-1 text-right">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: localCurrency,
                    }).format(field.state.value)}
                  </div>
                )
              }}
            />
          </TableCell>
        </>
      )}
      <TableCell>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            disabled={!canSubmit}
            onClick={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
            className="h-6 px-2 text-xs"
          >
            Save
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onCancel}
            className="h-6 px-2 text-xs"
          >
            Cancel
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

type ReferenceEmployee = {
  id: string
  name: string
  level: number
  step: number
  locationFactor: number
  location: string
  salary: number
}

function ReferenceEmployeesTable({
  referenceEmployees,
  currentEmployee,
}: {
  referenceEmployees: ReferenceEmployee[]
  currentEmployee: Employee
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const currentEmployeeRowRef = useRef<HTMLTableRowElement>(null)

  const columns: Array<ColumnDef<ReferenceEmployee>> = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => <div>{row.original.name}</div>,
      },
      {
        accessorKey: 'level',
        header: 'Level',
        cell: ({ row }) => <div>{row.original.level}</div>,
      },
      {
        accessorKey: 'step',
        header: 'Step',
        cell: ({ row }) => <div>{row.original.step}</div>,
      },
    ],
    [],
  )

  const table = useReactTable({
    data: referenceEmployees,
    columns,
    getCoreRowModel: getCoreRowModel(),
    filterFns: {
      fuzzy: () => true,
    },
  })

  useEffect(() => {
    if (currentEmployeeRowRef.current && scrollContainerRef.current) {
      // Use requestAnimationFrame to ensure the DOM has updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const row = currentEmployeeRowRef.current
          const container = scrollContainerRef.current
          if (!row || !container) return

          // Calculate position relative to the scroll container
          const containerRect = container.getBoundingClientRect()
          const rowRect = row.getBoundingClientRect()
          const rowOffsetTop =
            rowRect.top - containerRect.top + container.scrollTop
          const rowHeight = rowRect.height
          const containerHeight = container.clientHeight

          // Scroll to center the row in the container
          const scrollTop = rowOffsetTop - containerHeight / 2 + rowHeight / 2

          container.scrollTo({
            top: scrollTop,
            behavior: 'smooth',
          })
        })
      })
    }
  }, [referenceEmployees, currentEmployee.id])

  return (
    <div
      ref={scrollContainerRef}
      className="overflow-hidden max-h-[300px] overflow-y-auto rounded-md border"
    >
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
                ref={(el) => {
                  if (currentEmployee.id === row.original.id) {
                    currentEmployeeRowRef.current = el
                  }
                }}
                onClick={() =>
                  window.open(`/employee/${row.original.id}`, '_blank')
                }
                className={`cursor-pointer ${currentEmployee.id === row.original.id ? 'bg-blue-200 font-semibold' : ''}`}
                data-state={row.getIsSelected() && 'selected'}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
