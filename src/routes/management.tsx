import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { createToast } from 'vercel-toast'
import type { ColumnDef } from '@tanstack/react-table'
import type { User } from '@prisma/client'
import prisma from '@/db'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  bonusPercentage,
  currencyData,
  locationFactor,
  sfBenchmark,
} from '@/lib/utils'
import { renderToStaticMarkup } from 'react-dom/server'
import { fetchDeelEmployees } from './syncDeelEmployees'
import type { KeeperTestJobPayload } from './runScheduledJobs'
import { createAdminFn } from '@/lib/auth-middleware'
import { ROLES } from '@/lib/consts'
import { CommissionImportPanel } from '@/components/CommissionImportPanel'
import { z } from 'zod'
import { impersonateUser } from '@/lib/auth-client'
import { createAuditLogEntry } from '@/lib/audit-log'
import { AuditLogHistoryDialog } from '@/components/AuditLogHistoryDialog'

export const Route = createFileRoute('/management')({
  component: RouteComponent,
})

const getUsers = createAdminFn({
  method: 'GET',
}).handler(async () => {
  return await prisma.user.findMany({
    orderBy: {
      createdAt: 'asc',
    },
  })
})

const updateUserRole = createAdminFn({
  method: 'POST',
})
  .inputValidator((d: { id: string; role: string }) => d)
  .handler(async ({ data, context }) => {
    // Get current user role
    const currentUser = await prisma.user.findUnique({
      where: { id: data.id },
      select: { role: true, email: true },
    })

    // Update user role
    const updatedUser = await prisma.user.update({
      where: {
        id: data.id,
      },
      data: {
        role: data.role,
      },
    })

    // Create audit log entry
    await createAuditLogEntry({
      actorUserId: context.user.id,
      entityType: 'USER_ROLE',
      entityId: data.id,
      fieldName: 'role',
      oldValue: currentUser?.role ?? null,
      newValue: data.role,
      metadata: {
        userEmail: updatedUser.email,
        userName: updatedUser.name,
      },
    })

    return updatedUser
  })

const startReviewCycle = createAdminFn({
  method: 'POST',
}).handler(async () => {
  return await prisma.employee.updateMany({
    data: {
      reviewed: false,
    },
  })
})

const populateInitialEmployeeSalaries = createAdminFn({
  method: 'POST',
}).handler(async () => {
  const employees = await prisma.deelEmployee.findMany({
    where: {
      employee: {
        salaries: {
          none: {},
        },
      },
    },
    include: {
      employee: true,
    },
  })

  const getMappedRole = (role: string) => {
    return Object.keys(mappedRoles).includes(role)
      ? mappedRoles[role as keyof typeof mappedRoles]
      : role
  }

  const mappedRoles = {
    'Technical Customer Success Manager': 'Customer Success Manager (OTE)',
    'Customer Success Manager': 'Customer Success Manager (OTE)',
    'Technical Support Engineer': 'Support Engineer',
    TAE: 'Account Executive (OTE)',
    'Technical Account Manager': 'Account Executive (OTE)',
    TAM: 'Account Executive (OTE)',
    'Production Designer': 'Graphic Designer',
    'Post Production Specialist': 'Video Producer',
    'Security Engineer': 'Product Engineer',
    'Office Manager': 'People Operations Manager',
    'Content Marketing Manager': 'Content Marketer',
    'Technical Content Marketer': 'Content Marketer',
    'Platform Engineer': 'Site Reliability Engineer',
    'Clickhouse Engineer': 'Product Engineer',
  }

  let successCount = 0
  const logs: Array<string> = []
  const errors: Array<string> = []

  const deelEmployees = await fetchDeelEmployees()

  for (const employee of employees) {
    try {
      if (!employee.employee?.id) continue
      const deelEmployee = deelEmployees.find(
        (deelEmployee) => deelEmployee.workEmail === employee.workEmail,
      )
      if (!deelEmployee) {
        throw new Error('Deel employee not found: ' + employee.workEmail)
      }
      const { level, step, country, area, role } =
        deelEmployee?.customFields ?? {}
      const startDate = deelEmployee?.startDate

      if (!level || !step || !country || !area || !role) {
        throw new Error('level, step, country, area, or role is missing')
      }

      if (!startDate) {
        throw new Error('Start date is missing: ' + employee.workEmail)
      }

      if (!['1.2', '1', '1.0', '0.78', '.78', '0.59', '.59'].includes(level)) {
        throw new Error('Invalid level: ' + level)
      }

      if (Number(step) < 0.85 || Number(step) > 1.2) {
        throw new Error('Invalid step: ' + step)
      }

      const location = locationFactor.find(
        (l) => l.country === country && l.area === area,
      )

      if (!location) {
        throw new Error('Invalid location: ' + country + ' ' + area)
      }

      const locationFactorValue = location?.locationFactor ?? 0

      const benchmarkFactor =
        sfBenchmark[getMappedRole(role) as keyof typeof sfBenchmark] ?? 0

      if (benchmarkFactor === 0) {
        throw new Error('Invalid role: ' + role)
      }

      const totalSalary =
        locationFactorValue * Number(level) * Number(step) * benchmarkFactor

      const exchangeRate = currencyData[location?.currency ?? ''] ?? 1

      const totalSalaryLocal = totalSalary * exchangeRate

      if (totalSalaryLocal <= 1) {
        throw new Error('Total salary local is less than 1')
      }

      const mappedRole = getMappedRole(role)
      const defaultBonusPercentage =
        bonusPercentage[mappedRole as keyof typeof bonusPercentage] ?? 0
      const bonusAmount = Number(
        (totalSalary * defaultBonusPercentage).toFixed(2),
      )

      const actualSalary = totalSalary - bonusAmount

      const actualSalaryLocal = actualSalary * exchangeRate

      await prisma.salary.create({
        data: {
          timestamp: new Date(startDate),
          country: country,
          area: area,
          locationFactor: locationFactorValue,
          level: Number(level),
          step: Number(step),
          benchmark: mappedRole,
          benchmarkFactor: benchmarkFactor,
          totalSalary: totalSalary,
          bonusPercentage: defaultBonusPercentage,
          bonusAmount: bonusAmount,
          changePercentage: 0, // Always 0 for new entries
          changeAmount: 0, // Always 0 for new entries
          localCurrency: location?.currency ?? 'USD',
          exchangeRate: exchangeRate,
          totalSalaryLocal: totalSalaryLocal,
          amountTakenInOptions: 0,
          actualSalary: actualSalary,
          actualSalaryLocal: actualSalaryLocal,
          notes: '',
          employeeId: employee.employee.id,
        },
      })
      successCount++
      logs.push(
        'Successfully imported salary for employee: ' + employee.workEmail,
      )
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      errors.push(
        `Error processing employee ${employee.workEmail}: ${errorMessage}`,
      )
    }
  }

  return {
    successCount,
    errorCount: errors.length,
    errors,
    logs,
  }
})

function RouteComponent() {
  const router = useRouter()
  const [historyDialogOpen, setHistoryDialogOpen] = useState<string | null>(
    null,
  )
  const { data: users, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
  })

  const columns: Array<ColumnDef<User>> = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <div>{row.original.name}</div>,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => <div>{row.original.email}</div>,
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const handleRoleChange = async (value: string) => {
          await updateUserRole({ data: { id: row.original.id, role: value } })
          refetch()
          createToast('Role updated successfully.', {
            timeout: 3000,
          })
        }

        return (
          <div className="flex items-center gap-2">
            <Select
              value={row.original.role ?? 'error'}
              onValueChange={handleRoleChange}
            >
              <SelectTrigger className="h-6 w-[240px] px-1 py-0 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ROLES.ADMIN}>Admin (full access)</SelectItem>
                <SelectItem value={ROLES.ORG_CHART}>
                  Org Chart (access the org chart and proposed hires)
                </SelectItem>
                <SelectItem value={ROLES.USER}>
                  User (view own feedback + salary)
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHistoryDialogOpen(row.original.id)}
              className="h-6 text-xs"
            >
              View history
            </Button>
            <AuditLogHistoryDialog
              entityType="USER_ROLE"
              entityId={row.original.id}
              title={`Role history for ${row.original.name}`}
              open={historyDialogOpen === row.original.id}
              onOpenChange={(open: boolean) =>
                setHistoryDialogOpen(open ? row.original.id : null)
              }
            />
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const handleImpersonate = async () => {
          try {
            await impersonateUser({
              userId: row.original.id,
            })
            window.location.href = '/'
          } catch (error) {
            createToast(
              `Failed to impersonate user: ${error instanceof Error ? error.message : 'Unknown error'}`,
              { timeout: 5000 },
            )
          }
        }

        return (
          <Button
            variant="outline"
            size="sm"
            onClick={handleImpersonate}
            className="h-6 text-xs"
          >
            Impersonate
          </Button>
        )
      },
    },
  ]

  const table = useReactTable({
    data: users || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    filterFns: {},
  })

  return (
    <div className="flex justify-center px-4 pb-4">
      <div className="max-w-full flex-grow 2xl:max-w-[80%]">
        <div className="flex justify-between py-4">
          <div className="text-lg font-bold">User management</div>
        </div>
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
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-gray-50">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-1 py-1">
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
        <div className="flex justify-between py-4">
          <div className="text-lg font-bold">Review cycle</div>
        </div>
        <div className="flex flex-col gap-2 overflow-hidden">
          <Button
            onClick={async () => {
              await startReviewCycle()
              router.invalidate()
              createToast('Review cycle started successfully.', {
                timeout: 3000,
              })
            }}
          >
            Start review cycle (set reviewed to false for all employees)
          </Button>
          <Button
            onClick={async () => {
              const { successCount, errorCount, errors, logs } =
                await populateInitialEmployeeSalaries()
              router.invalidate()

              console.log({ successCount, errorCount, errors, logs })
              const message = document.createElement('div')
              message.className = 'flex flex-col gap-2'
              message.innerHTML = renderToStaticMarkup(
                <>
                  <span>
                    Successfully imported {successCount} employee{' '}
                    {successCount === 1 ? 'salary' : 'salaries'}.
                  </span>
                  <span>
                    Failed to import {errorCount} employee{' '}
                    {errorCount === 1 ? 'salary' : 'salaries'}.
                  </span>
                  <div className="flex flex-col gap-1">
                    {errors.map((error) => (
                      <span key={error}>{error}</span>
                    ))}
                    {logs.map((log) => (
                      <span key={log}>{log}</span>
                    ))}
                  </div>
                </>,
              )

              createToast(message, {
                timeout: 10000,
                action: {
                  text: 'Close',
                  callback(toast) {
                    toast.destroy()
                  },
                },
              })
            }}
          >
            Populate initial employee salaries
          </Button>
          <KeeperTestManagement />
        </div>
        <div className="flex justify-between py-4">
          <div className="text-lg font-bold">Commission Bonuses</div>
        </div>
        <div className="flex flex-col gap-2 overflow-hidden">
          <CommissionImportPanel />
        </div>
      </div>
    </div>
  )
}

export const scheduleKeeperTests = createAdminFn({
  method: 'POST',
}).handler(async () => {
  const employees = await prisma.employee.findMany({
    include: {
      deelEmployee: {
        include: {
          manager: true,
        },
      },
    },
    where: {
      deelEmployee: {
        team: {
          not: 'Blitzscale',
        },
        startDate: {
          lte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // only schedule for employees who have passed probation
        },
      },
    },
  })

  const managerFeedbackJobResult = await prisma.cyclotronJob.createMany({
    data: employees
      .map((employee) => {
        if (
          !employee.deelEmployee?.manager ||
          !employee.deelEmployee?.manager?.workEmail
        ) {
          return null
        }
        return {
          queue_name: 'send_manager_feedback' as const,
          data: JSON.stringify({
            title: 'Manager feedback',
            employee: {
              id: employee.id,
              email: employee.email,
              name: employee.deelEmployee?.name,
            },
            manager: {
              id: employee.deelEmployee?.manager?.id,
              email: employee.deelEmployee?.manager?.workEmail,
              name: employee.deelEmployee?.manager?.name,
            },
          } satisfies KeeperTestJobPayload),
        }
      })
      .filter((emp) => emp !== null),
  })

  const result = await prisma.cyclotronJob.createMany({
    data: employees
      .map((employee) => {
        if (
          !employee.deelEmployee?.manager ||
          !employee.deelEmployee?.manager?.workEmail
        ) {
          return null
        }
        return {
          queue_name: 'send_keeper_test' as const,
          data: JSON.stringify({
            title: 'Keeper test',
            employee: {
              id: employee.id,
              email: employee.email,
              name: employee.deelEmployee?.name,
            },
            manager: {
              id: employee.deelEmployee?.manager?.id,
              email: employee.deelEmployee?.manager?.workEmail,
              name: employee.deelEmployee?.manager?.name,
            },
          } satisfies KeeperTestJobPayload),
        }
      })
      .filter((emp) => emp !== null),
  })

  return {
    success: true,
    count: result.count + managerFeedbackJobResult.count,
  }
})

function KeeperTestManagement() {
  const router = useRouter()

  return (
    <Button
      onClick={async () => {
        const results = await scheduleKeeperTests()
        router.invalidate()

        createToast(`Successfully scheduled ${results.count} keeper tests.`, {
          timeout: 3000,
        })
      }}
    >
      Schedule keeper tests for every employee (incl. manager feedback)
    </Button>
  )
}

const importCommissionBonusesSchema = z.object({
  bonuses: z.array(
    z.object({
      employeeId: z.string(),
      quarter: z.string().regex(/^\d{4}-Q[1-4]$/),
      quota: z.number().positive(),
      attainment: z.number().nonnegative(),
      bonusAmount: z.number().nonnegative(),
      calculatedAmount: z.number().nonnegative(),
      notes: z.string().optional(),
      sheet: z.string().optional(),
      amountHeld: z.number().nonnegative().optional(),
    }),
  ),
})

export const importCommissionBonuses = createAdminFn({
  method: 'POST',
})
  .inputValidator(importCommissionBonusesSchema)
  .handler(async ({ data }) => {
    const errors: string[] = []
    const successIds: string[] = []

    for (const bonus of data.bonuses) {
      try {
        // Check if employee exists
        const employee = await prisma.employee.findUnique({
          where: { id: bonus.employeeId },
          include: {
            salaries: {
              orderBy: { timestamp: 'desc' },
              take: 1,
            },
          },
        })

        if (!employee) {
          throw new Error(`Employee not found: ${bonus.employeeId}`)
        }

        // Check for duplicate (unique constraint on employeeId + quarter)
        const existing = await prisma.commissionBonus.findUnique({
          where: {
            employeeId_quarter: {
              employeeId: bonus.employeeId,
              quarter: bonus.quarter,
            },
          },
        })

        if (existing) {
          throw new Error(
            `Commission bonus already exists for this employee and quarter: ${bonus.quarter}`,
          )
        }

        // Get exchange rate and local currency from latest salary
        const latestSalary = employee.salaries[0]
        const exchangeRate = latestSalary?.exchangeRate ?? 1
        const localCurrency = latestSalary?.localCurrency ?? 'USD'
        const calculatedAmountLocal = bonus.calculatedAmount * exchangeRate

        // Note: bonus.bonusAmount is already the quarterly amount (annual / 4) from the import panel
        // Create commission bonus
        const created = await prisma.commissionBonus.create({
          data: {
            employeeId: bonus.employeeId,
            quarter: bonus.quarter,
            quota: bonus.quota,
            attainment: bonus.attainment,
            bonusAmount: bonus.bonusAmount, // This is already quarterly (annual / 4)
            calculatedAmount: bonus.calculatedAmount,
            amountHeld: bonus.amountHeld ?? 0,
            exchangeRate: exchangeRate,
            localCurrency: localCurrency,
            calculatedAmountLocal: calculatedAmountLocal,
            notes: bonus.notes,
            sheet: bonus.sheet,
            communicated: false,
            synced: false,
          },
        })

        successIds.push(created.id)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        errors.push(
          `Error importing bonus for employee ${bonus.employeeId} (${bonus.quarter}): ${errorMessage}`,
        )
      }
    }

    return {
      successCount: successIds.length,
      errorCount: errors.length,
      errors,
    }
  })

// Get employees for matching during import
export const getEmployeesForImport = createAdminFn({
  method: 'GET',
}).handler(async () => {
  return await prisma.employee.findMany({
    include: {
      salaries: {
        orderBy: { timestamp: 'desc' },
        take: 1,
      },
      deelEmployee: {
        select: {
          startDate: true,
        },
      },
    },
  })
})
