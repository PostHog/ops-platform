import ReactMarkdown from 'react-markdown'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useAtom } from 'jotai'
import { AlertCircle, ArrowLeft, Trash2 } from 'lucide-react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createToast } from 'vercel-toast'
import { useQuery } from '@tanstack/react-query'
import { useLocalStorage } from 'usehooks-ts'
import { months } from '.'
import 'vercel-toast/dist/vercel-toast.css'
import type { ColumnDef } from '@tanstack/react-table'
import type { Prisma, Salary } from '@prisma/client'
import { reviewQueueAtom } from '@/atoms'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { SalaryHistoryCard } from '@/components/SalaryHistoryCard'
import { FeedbackCard } from '@/components/FeedbackCard'
import { SalaryWithMismatchIndicator } from '@/components/SalaryWithMismatchIndicator'
import {
  bonusPercentage,
  formatCurrency,
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
import { createAuthenticatedFn, createUserFn } from '@/lib/auth-middleware'
import { useSession } from '@/lib/auth-client'
import { ROLES } from '@/lib/consts'
import { NewSalaryForm } from '@/components/NewSalaryForm'

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
                  bonusPercentage: true,
                  bonusAmount: true,
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
  .inputValidator(
    (d: Omit<Salary, 'id' | 'timestamp' | 'communicated' | 'synced'>) => d,
  )
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
  const [showNewSalaryForm, setShowNewSalaryForm] = useState(
    user?.role === ROLES.ADMIN,
  )
  const [showOverrideMode, setShowOverrideMode] = useState(false)
  const [showReferenceEmployees, setShowReferenceEmployees] = useState(false)
  const [showDetailedColumns, setShowDetailedColumns] =
    useLocalStorage<boolean>(
      'employee.overview.table.showDetailedColumns',
      false,
    )
  const [filterByExec, setFilterByExec] = useState(false)
  const [filterByLevel, setFilterByLevel] = useState(true)
  const [filterByTitle, setFilterByTitle] = useState(true)
  const [viewMode, setViewMode] = useLocalStorage<'table' | 'card'>(
    'preferredEmployeeView',
    'table',
  )

  // Hide inline form when switching to timeline view
  useEffect(() => {
    if (viewMode === 'card') {
      setShowNewSalaryForm(false)
    }
  }, [viewMode])

  const router = useRouter()
  const employee: Employee = Route.useLoaderData()
  const [reviewQueue, setReviewQueue] = useAtom(reviewQueueAtom)
  const [level, setLevel] = useState(employee.salaries[0]?.level ?? 1)
  const [step, setStep] = useState(employee.salaries[0]?.step ?? 1)
  const [benchmark, setBenchmark] = useState(
    employee.salaries[0]?.benchmark ?? 'Product Engineer',
  )

  const showBonusPercentage =
    employee.salaries.some((salary) => salary.bonusPercentage > 0) ||
    Object.keys(bonusPercentage).includes(benchmark)

  if (!employee) return null

  const handleDeleteSalary = async (salaryId: string) => {
    try {
      await deleteSalary({ data: { id: salaryId } })
      createToast('Salary deleted successfully.', {
        timeout: 3000,
      })
      router.invalidate()
    } catch (error) {
      createToast(
        error instanceof Error ? error.message : 'Failed to delete salary.',
        {
          timeout: 3000,
        },
      )
    }
  }

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

  // Combine and sort salary history with feedback, grouped by month
  const timelineByMonth = useMemo(() => {
    const salaryItems = employee.salaries.map((salary) => ({
      type: 'salary' as const,
      timestamp: salary.timestamp,
      data: salary,
    }))

    const feedbackItems = (employee.keeperTestFeedback || []).map(
      (feedback) => ({
        type: 'feedback' as const,
        timestamp: feedback.timestamp,
        data: feedback,
      }),
    )

    const allItems = [...salaryItems, ...feedbackItems].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    )

    // Group items by month/year
    const grouped = new Map<
      string,
      {
        month: number
        year: number
        items: typeof allItems
      }
    >()

    allItems.forEach((item) => {
      const date = new Date(item.timestamp)
      const key = `${date.getFullYear()}-${date.getMonth()}`

      if (!grouped.has(key)) {
        grouped.set(key, {
          month: date.getMonth(),
          year: date.getFullYear(),
          items: [],
        })
      }
      grouped.get(key)!.items.push(item)
    })

    return Array.from(grouped.values())
  }, [employee.salaries, employee.keeperTestFeedback])

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
      ...(showBonusPercentage
        ? ([
            {
              accessorKey: 'bonusPercentage',
              header: () => <div className="text-right">Bonus (%)</div>,
              cell: ({ row }) => (
                <div className="text-right">
                  {(row.original.bonusPercentage * 100).toFixed(2)}%
                </div>
              ),
            },
          ] as ColumnDef<Salary>[])
        : []),
      {
        accessorKey: 'totalSalary',
        header: () => <div className="text-right">Total Salary ($)</div>,
        cell: ({ row }) => {
          const salary = row.original
          return (
            <SalaryWithMismatchIndicator
              totalSalary={salary.totalSalary}
              benchmarkFactor={salary.benchmarkFactor}
              locationFactor={salary.locationFactor}
              level={salary.level}
              step={salary.step}
              align="right"
            />
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
          ] as Array<ColumnDef<Salary>>)
        : []),
      {
        id: 'actions',
        header: () => (
          <button
            onClick={() => setShowDetailedColumns(!showDetailedColumns)}
            className="flex w-full items-center justify-center text-gray-400 hover:text-gray-600"
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
                  onClick={() => handleDeleteSalary(salary.id)}
                  className="h-6 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
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
  }, [showDetailedColumns, user?.role, employee.salaries, showBonusPercentage])

  const handleMoveToNextEmployee = () => {
    const currentIndex = reviewQueue.indexOf(employee.id)
    const nextEmployee = reviewQueue[currentIndex + 1] ?? null
    if (nextEmployee) {
      router.navigate({
        to: '/employee/$employeeId',
        params: { employeeId: nextEmployee },
      })
      setShowNewSalaryForm(true)
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
    sfBenchmark[employee.salaries[0]?.benchmark] !==
      employee.salaries[0].benchmarkFactor

  return (
    <div className="flex flex-col items-center justify-center gap-5 pt-8">
      <div className="flex w-full flex-col gap-5 px-4 2xl:max-w-7xl">
        {user?.role === ROLES.ADMIN ? (
          <Button
            variant="ghost"
            type="button"
            onClick={() => router.navigate({ to: '/' })}
            className="-ml-2 self-start"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to overview
          </Button>
        ) : null}
        <div className="flex flex-row items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xl font-bold">
              {employee.deelEmployee?.name || employee.email || 'Edit employee'}
            </span>
            <div className="mt-1 flex gap-4 text-sm text-gray-600">
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
          <div className="flex justify-end gap-2">
            <div className="flex gap-1 rounded-md border">
              <Button
                type="button"
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                Table view
              </Button>
              <Button
                type="button"
                variant={viewMode === 'card' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('card')}
              >
                Timeline view
              </Button>
            </div>
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

        {user?.role === ROLES.ADMIN && viewMode === 'table' ? (
          <>
            <div className="mt-2 flex flex-row items-center justify-between gap-2">
              <span className="text-md font-bold">Feedback</span>
            </div>

            <div className="w-full flex-grow">
              <div className="mb-4 max-h-[300px] overflow-y-auto rounded-lg border bg-gray-50 p-4">
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
                      className="mb-4 rounded-lg border bg-gray-50 p-4"
                    >
                      <span className="w-full list-disc text-right text-sm text-gray-500">
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
                            <ul className="list-inside list-disc">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ul className="list-inside list-decimal">
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

        <div className="mt-2 flex flex-row items-center justify-between gap-2">
          {viewMode === 'table' && (
            <span className="text-md font-bold">Salary history</span>
          )}
          <div className="flex gap-2">
            {showNewSalaryForm ? (
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
            {showNewSalaryForm ? (
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
                onClick={() => setShowNewSalaryForm(!showNewSalaryForm)}
              >
                {showNewSalaryForm ? 'Cancel' : 'Add New Salary'}
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

        {showNewSalaryForm && showReferenceEmployees && viewMode === 'card' ? (
          <ReferenceEmployeesTable
            referenceEmployees={combinedReferenceEmployees}
            currentEmployee={employee}
            filterByLevel={filterByLevel}
            setFilterByLevel={setFilterByLevel}
            filterByExec={filterByExec}
            setFilterByExec={setFilterByExec}
            filterByTitle={filterByTitle}
            setFilterByTitle={setFilterByTitle}
          />
        ) : null}

        <div className="w-full flex-grow">
          {viewMode === 'table' ? (
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
                  {showNewSalaryForm && (
                    <NewSalaryForm
                      employeeId={employee.id}
                      showOverride={showOverrideMode}
                      setShowOverride={setShowOverrideMode}
                      latestSalary={employee.salaries[0]}
                      showDetailedColumns={showDetailedColumns}
                      totalAmountInStockOptions={employee.salaries.reduce(
                        (acc, salary) => acc + salary.amountTakenInOptions,
                        0,
                      )}
                      onSuccess={() => {
                        setShowNewSalaryForm(false)
                        router.invalidate()
                      }}
                      onCancel={() => setShowNewSalaryForm(false)}
                      benchmarkUpdated={benchmarkUpdated}
                      setLevel={setLevel}
                      setStep={setStep}
                      setBenchmark={setBenchmark}
                      showBonusPercentage={showBonusPercentage}
                      displayMode="inline"
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
          ) : (
            <div className="mb-8">
              {showNewSalaryForm && (
                <NewSalaryForm
                  employeeId={employee.id}
                  showOverride={showOverrideMode}
                  setShowOverride={setShowOverrideMode}
                  latestSalary={employee.salaries[0]}
                  showDetailedColumns={showDetailedColumns}
                  totalAmountInStockOptions={employee.salaries.reduce(
                    (acc, salary) => acc + salary.amountTakenInOptions,
                    0,
                  )}
                  onSuccess={() => {
                    setShowNewSalaryForm(false)
                    router.invalidate()
                  }}
                  onCancel={() => setShowNewSalaryForm(false)}
                  benchmarkUpdated={benchmarkUpdated}
                  setLevel={setLevel}
                  setStep={setStep}
                  setBenchmark={setBenchmark}
                  showBonusPercentage={showBonusPercentage}
                  displayMode="card"
                />
              )}
              {timelineByMonth.length > 0 ? (
                timelineByMonth.map((monthGroup, monthGroupIndex) => (
                  <div key={`${monthGroup.year}-${monthGroup.month}`}>
                    <div
                      className={`flex items-center border border-gray-200 px-4 py-2 ${monthGroupIndex !== 0 ? 'border-t-0' : 'rounded-t-md'}`}
                    >
                      <h3 className="text-lg font-bold">
                        {months[monthGroup.month]} {monthGroup.year}
                      </h3>
                      <span className="mx-2">·</span>
                      <p className="text-sm text-gray-500">
                        {(() => {
                          const now = new Date()
                          const diffMonths =
                            (now.getFullYear() - monthGroup.year) * 12 +
                            (now.getMonth() - monthGroup.month)

                          if (diffMonths === 0) return 'this month'
                          if (diffMonths === 1) return '1 month ago'
                          if (diffMonths < 12) return `${diffMonths} months ago`

                          const years = Math.floor(diffMonths / 12)
                          const remainingMonths = diffMonths % 12
                          if (remainingMonths === 0) {
                            return years === 1
                              ? '1 year ago'
                              : `${years} years ago`
                          }
                          return `${years} year${years > 1 ? 's' : ''} ${remainingMonths} month${remainingMonths > 1 ? 's' : ''} ago`
                        })()}
                      </p>
                    </div>
                    <div className="w-full">
                      {monthGroup.items.map((item, itemIndex) => {
                        const isLastMonth =
                          monthGroupIndex === timelineByMonth.length - 1
                        const isLastItemInMonth =
                          itemIndex === monthGroup.items.length - 1
                        const lastTableItem = isLastMonth && isLastItemInMonth

                        return item.type === 'salary' ? (
                          <SalaryHistoryCard
                            key={`salary-${item.data.id}`}
                            salary={item.data}
                            isAdmin={user?.role === ROLES.ADMIN}
                            onDelete={handleDeleteSalary}
                            lastTableItem={lastTableItem}
                          />
                        ) : (
                          <FeedbackCard
                            key={`feedback-${item.data.id}`}
                            feedback={item.data}
                            lastTableItem={lastTableItem}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-gray-500">
                  No history available.
                </div>
              )}
            </div>
          )}
        </div>

        {showNewSalaryForm && showReferenceEmployees && viewMode === 'table' ? (
          <ReferenceEmployeesTable
            referenceEmployees={combinedReferenceEmployees}
            currentEmployee={employee}
            filterByLevel={filterByLevel}
            setFilterByLevel={setFilterByLevel}
            filterByExec={filterByExec}
            setFilterByExec={setFilterByExec}
            filterByTitle={filterByTitle}
            setFilterByTitle={setFilterByTitle}
          />
        ) : null}
      </div>
    </div>
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
  filterByLevel,
  setFilterByLevel,
  filterByExec,
  setFilterByExec,
  filterByTitle,
  setFilterByTitle,
}: {
  referenceEmployees: Array<ReferenceEmployee>
  currentEmployee: Employee
  filterByLevel: boolean
  setFilterByLevel: (filterByLevel: boolean) => void
  filterByExec: boolean
  setFilterByExec: (filterByExec: boolean) => void
  filterByTitle: boolean
  setFilterByTitle: (filterByTitle: boolean) => void
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
    <>
      <div className="mt-2 flex flex-row items-center justify-between gap-2">
        <span className="text-md font-bold">Reference employees</span>
        <div className="flex items-center gap-4">
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
              Filter by title
            </Label>
          </div>
        </div>
      </div>

      <div className="w-full flex-grow">
        <div
          ref={scrollContainerRef}
          className="max-h-[300px] overflow-hidden overflow-y-auto rounded-md border"
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
    </>
  )
}
