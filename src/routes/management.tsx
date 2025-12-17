import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
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
import { Card, CardContent } from '@/components/ui/card'
import {
  bonusPercentage,
  currencyData,
  locationFactor,
  sfBenchmark,
} from '@/lib/utils'
import { renderToStaticMarkup } from 'react-dom/server'
import { fetchDeelEmployees } from './syncDeelEmployees'
import type { KeeperTestJobPayload } from './runScheduledJobs'
import { createAuthenticatedFn } from '@/lib/auth-middleware'
import { ROLES } from '@/lib/consts'
import { CartaConfig } from './syncCartaData'

export const Route = createFileRoute('/management')({
  component: RouteComponent,
})

const getUsers = createAuthenticatedFn({
  method: 'GET',
}).handler(async () => {
  return await prisma.user.findMany({
    orderBy: {
      createdAt: 'asc',
    },
  })
})

const updateUserRole = createAuthenticatedFn({
  method: 'POST',
})
  .inputValidator((d: { id: string; role: string }) => d)
  .handler(async ({ data }) => {
    return await prisma.user.update({
      where: {
        id: data.id,
      },
      data: {
        role: data.role,
      },
    })
  })

const startReviewCycle = createAuthenticatedFn({
  method: 'POST',
}).handler(async () => {
  return await prisma.employee.updateMany({
    data: {
      reviewed: false,
    },
  })
})

const populateInitialEmployeeSalaries = createAuthenticatedFn({
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
    <div className="flex w-screen justify-center px-4">
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
          <div className="text-lg font-bold">Integrations</div>
        </div>
        <div className="flex flex-col gap-2 overflow-hidden">
          <CartaIntegration />
        </div>
      </div>
    </div>
  )
}

const getCartaIntegration = createAuthenticatedFn({
  method: 'GET',
}).handler(async ({ context }) => {
  const clientId = process.env.CARTA_INTEGRATION_CLIENT_ID
  const clientSecret = process.env.CARTA_INTEGRATION_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error(
      'Carta credentials not configured. Please set CARTA_INTEGRATION_CLIENT_ID and CARTA_INTEGRATION_CLIENT_SECRET environment variables.',
    )
  }

  return await prisma.integration.findFirst({
    where: {
      kind: 'carta',
      created_by_id: context.user.id,
    },
  })
})

const authorizeCartaAccount = createAuthenticatedFn({
  method: 'POST',
}).handler(async ({ context }) => {
  const clientId = process.env.CARTA_INTEGRATION_CLIENT_ID
  const clientSecret = process.env.CARTA_INTEGRATION_CLIENT_SECRET
  const scope =
    'read_issuer_info read_issuer_stakeholders read_issuer_securities read_issuer_securitiestemplates readwrite_issuer_draftsecurities read_issuer_capitalizationtablesummary read_issuer_valuations'

  if (!clientId || !clientSecret) {
    throw new Error(
      'Carta credentials not configured. Please set CARTA_INTEGRATION_CLIENT_ID and CARTA_INTEGRATION_CLIENT_SECRET environment variables.',
    )
  }

  const base64Credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    'base64',
  )

  const response = await fetch(
    `https://login.playground.carta.team/o/access_token/`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${base64Credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        scope: scope,
        grant_type: 'CLIENT_CREDENTIALS',
      }),
    },
  )

  if (response.status !== 200) {
    const errorText = await response.text()
    throw new Error(`Failed to authorize: ${errorText}`)
  }

  const responseData = await response.json()

  const tokenData = {
    access_token: responseData.access_token,
    expires_in: responseData.expires_in,
    token_type: responseData.token_type,
    scope: responseData.scope,
  }

  const existing = await prisma.integration.findFirst({
    where: {
      kind: 'carta',
    },
  })

  if (existing) {
    await prisma.integration.update({
      where: { id: existing.id },
      data: {
        config: tokenData,
        created_at: new Date(),
        created_by_id: context.user.id,
      },
    })
  } else {
    await prisma.integration.create({
      data: {
        kind: 'carta',
        config: tokenData,
        created_by_id: context.user.id,
        integration_id: 'carta',
      },
    })
  }

  return {
    success: true,
  }
})

const revokeCartaToken = createAuthenticatedFn({
  method: 'POST',
}).handler(async ({ context }) => {
  const integration = await prisma.integration.findFirst({
    where: {
      kind: 'carta',
      created_by_id: context.user.id,
    },
  })

  if (!integration) {
    throw new Error('No integration found')
  }

  await prisma.integration.delete({
    where: { id: integration.id },
  })

  return {
    success: true,
  }
})

export const scheduleKeeperTests = createAuthenticatedFn({
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
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // only schedule for employees who have passed probation
        },
      },
    },
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
    count: result.count,
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
      Schedule keeper tests for every employee
    </Button>
  )
}

function CartaIntegration() {
  const {
    data: integration,
    error,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['cartaIntegration'],
    queryFn: () => getCartaIntegration(),
  })

  const config = integration?.config as CartaConfig | undefined

  const isTokenValid =
    config?.access_token &&
    config?.expires_in &&
    integration?.created_at &&
    integration.created_at.getTime() + (config.expires_in * 1000) / 2 >
      Date.now()

  const handleAuthorize = async () => {
    try {
      await authorizeCartaAccount()
      refetch()
      createToast(`Successfully authorized!`, {
        timeout: 5000,
      })
    } catch (error) {
      createToast(error instanceof Error ? error.message : 'Unknown error', {
        timeout: 5000,
      })
    }
  }

  const handleRevoke = async () => {
    try {
      await revokeCartaToken()
      refetch()
      createToast('Token revoked successfully.', {
        timeout: 3000,
      })
    } catch (error) {
      createToast(
        `Failed to revoke token: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          timeout: 5000,
        },
      )
    }
  }

  return (
    <Card>
      <CardContent>
        {!isLoading && error ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            {error.message}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="text-sm font-semibold">Carta Integration</div>
              {config?.expires_in && integration?.created_at && (
                <div className="text-xs text-gray-500">
                  Expires{' '}
                  {new Date(
                    integration.created_at.getTime() + config.expires_in * 1000,
                  ).toLocaleString()}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isTokenValid ? (
                <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-600" />
                  Connected
                </div>
              ) : (
                <div className="flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                  <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                  Disconnected
                </div>
              )}
              <Button
                onClick={handleAuthorize}
                variant="default"
                size="sm"
                className="text-xs"
              >
                {isTokenValid ? 'Refresh' : 'Authorize'}
              </Button>
              {isTokenValid && (
                <Button
                  onClick={handleRevoke}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Revoke
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
