import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
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
import { currencyData, locationFactor, sfBenchmark } from '@/lib/utils'
import { renderToStaticMarkup } from 'react-dom/server'
import { fetchDeelEmployees } from './syncDeelEmployees'
import type { KeeperTestJobPayload } from './runScheduledJobs'

export const Route = createFileRoute('/management')({
  component: RouteComponent,
})

const fetchDeelContract = async (id: string) => {
  const response = await fetch(
    `https://api.letsdeel.com/rest/v2/contracts/${id}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.DEEL_API_KEY}`,
      },
    },
  )

  if (response.status !== 200) {
    throw new Error(`Failed to fetch contract: ${response.statusText}`)
  }

  const data = await response.json()

  return data.data
}

const getUsers = createServerFn({
  method: 'GET',
}).handler(async () => {
  return await prisma.user.findMany({})
})

const updateUserRole = createServerFn({
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

const startReviewCycle = createServerFn({
  method: 'POST',
}).handler(async () => {
  return await prisma.employee.updateMany({
    data: {
      reviewed: false,
    },
  })
})

const checkSalaryDeviation = createServerFn({
  method: 'POST',
}).handler(async () => {
  const deelEmployees = await fetchDeelEmployees()
  const employees = await prisma.employee.findMany({
    where: {
      salaries: { some: {} },
    },
    include: {
      salaries: {
        orderBy: {
          timestamp: 'desc',
        },
      },
    },
  })

  const results: Array<{
    email: string
    salary: number
    deelSalary: number
    deviation: number
    deviationPercentage: number
    compensation_details: any
    team: string
  }> = []
  const errors: Array<string> = []

  for (const employee of employees) {
    try {
      const localDeelEmployee = deelEmployees.find(
        (x) => x.workEmail === employee.email,
      )
      const { compensation_details } = await fetchDeelContract(
        localDeelEmployee?.contractId ?? '',
      )

      const calcDeelSalary = (compensation_details: any) => {
        if (compensation_details.gross_annual_salary != 0) {
          return Number(compensation_details.gross_annual_salary)
        }

        if (compensation_details.scale === 'monthly') {
          return Number(compensation_details.amount) * 12
        }
        return Number(compensation_details.amount)
      }

      results.push({
        email: employee.email,
        salary: employee.salaries[0].actualSalaryLocal,
        deelSalary: calcDeelSalary(compensation_details),
        deviation:
          employee.salaries[0].actualSalaryLocal -
          calcDeelSalary(compensation_details),
        deviationPercentage:
          Math.abs(
            employee.salaries[0].actualSalaryLocal -
              calcDeelSalary(compensation_details),
          ) / employee.salaries[0].actualSalaryLocal,
        compensation_details: compensation_details,
        team: localDeelEmployee?.team ?? '',
      })
      console.log('processed employee: ' + employee.email)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      errors.push(
        `Error processing employee ${employee.email}: ${errorMessage}`,
      )
      console.error(
        'Error processing employee: ' + employee.email + ' - ' + errorMessage,
      )
    }
  }

  return {
    allResults: results,
    filteredResultsNote:
      'Deviation percentage > 0.1%, deviation percentage !== 0.5, currency code !== GBP, team does not include Sales or Customer Success',
    filteredResults: results
      .filter(
        (x) =>
          x.deviationPercentage > 0.001 &&
          x.deviationPercentage !== 0.5 &&
          x.compensation_details.currency_code !== 'GBP' &&
          !x.team.includes('Sales') &&
          !x.team.includes('Customer Success'),
      )
      .map((x) => ({
        deelSalary: x.deelSalary,
        deviation: x.deviation,
        deviationPercentage: x.deviationPercentage,
        email: x.email,
        salary: x.salary,
        currency: x.compensation_details.currency_code,
        team: x.team,
      })),
    errors,
  }
})

const populateInitialEmployeeSalaries = createServerFn({
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

      if (!['1.2', '1', '0.78', '.78', '0.59', '.59'].includes(level)) {
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

      const actualSalary = totalSalary

      const actualSalaryLocal = actualSalary * exchangeRate

      if (totalSalaryLocal <= 1) {
        throw new Error('Total salary local is less than 1')
      }

      await prisma.salary.create({
        data: {
          timestamp: new Date(startDate),
          country: country,
          area: area,
          locationFactor: locationFactorValue,
          level: Number(level),
          step: Number(step),
          benchmark: getMappedRole(role),
          benchmarkFactor: benchmarkFactor,
          totalSalary: totalSalary,
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
      console.log(
        'Successfully imported salary for employee: ' + employee.workEmail,
      )
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      errors.push(
        `Error processing employee ${employee.workEmail}: ${errorMessage}`,
      )
      console.error(
        'Error processing employee: ' +
          employee.workEmail +
          ' - ' +
          errorMessage,
      )
    }
  }

  return {
    successCount,
    errorCount: errors.length,
    errors,
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
            <SelectTrigger className="w-24 h-6 text-xs px-1 py-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin (full access)</SelectItem>
              <SelectItem value="user">User (no access)</SelectItem>
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
    <div className="w-screen flex justify-center">
      <div className="max-w-[80%] flex-grow">
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
                      <TableCell key={cell.id} className="py-1 px-1">
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
        <div className="overflow-hidden flex flex-col gap-2">
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
              const { successCount, errorCount, errors } =
                await populateInitialEmployeeSalaries()
              router.invalidate()

              const message = document.createElement('div')
              message.className = 'flex flex-col gap-2'
              message.innerHTML = renderToStaticMarkup(
                <>
                  <span>
                    Successfully imported {successCount} employee salaries.
                  </span>
                  <span>Failed to import {errorCount} employee salaries.</span>
                  <div className="flex flex-col gap-1">
                    {errors.map((error) => (
                      <span key={error}>{error}</span>
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
          <Button
            onClick={async () => {
              createToast(
                'Checking salary deviation... (this may take a while). Results will be logged in the console.',
                {
                  timeout: 10000,
                },
              )
              const results = await checkSalaryDeviation()
              console.log(results)
              router.invalidate()

              createToast('Salary deviation checked successfully.', {
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
            Check salary deviation compared to Deel
          </Button>
          <KeeperTestManagement />
        </div>
      </div>
    </div>
  )
}

export const scheduleKeeperTests = createServerFn({
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
