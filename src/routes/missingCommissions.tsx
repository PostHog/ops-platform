import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ColumnDef, Row } from '@tanstack/react-table'
import type { Prisma } from '@prisma/client'
import prisma from '@/db'
import {
  getPreviousQuarter,
  getPreviousNQuarters,
  calculateQuarterBreakdown,
  type QuarterBreakdown,
} from '@/lib/commission-calculator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createAdminFn } from '@/lib/auth-middleware'
import { customFilterFns } from './employees'
import { TableFilters } from '@/components/TableFilters'
import { AlertTriangle } from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

type EmployeeWithSalaryAndCommission = Prisma.EmployeeGetPayload<{
  include: {
    salaries: {
      orderBy: {
        timestamp: 'desc'
      }
      take: 1
    }
    deelEmployee: true
    commissionBonuses: true
  }
}>

type MissingCommissionEmployee = {
  id: string
  email: string
  benchmark: string
  startDate: Date | null
  hasCommissionForQuarter: boolean
  quarterBreakdown: QuarterBreakdown
}

/**
 * Get the eligibility cutoff date for commission for a given quarter.
 * Employees must join before the 15th of the last month of the quarter to be eligible.
 */
function getCommissionEligibilityCutoff(quarter: string): Date {
  const [yearStr, quarterStr] = quarter.split('-Q')
  const year = parseInt(yearStr, 10)
  const q = parseInt(quarterStr, 10)
  const lastMonthOfQuarter = q * 3 - 1
  return new Date(year, lastMonthOfQuarter, 15)
}

const getEmployeesWithMissingCommissions = createAdminFn({
  method: 'GET',
}).handler(async () => {
  const employees = await prisma.employee.findMany({
    include: {
      salaries: {
        orderBy: {
          timestamp: 'desc',
        },
        take: 1,
      },
      deelEmployee: true,
      commissionBonuses: true,
    },
  })

  return employees
})

export const Route = createFileRoute('/missingCommissions')({
  component: MissingCommissionsPage,
  loader: async () => await getEmployeesWithMissingCommissions(),
})

function MissingCommissionsPage() {
  const employees: EmployeeWithSalaryAndCommission[] = Route.useLoaderData()
  const [quarter, setQuarter] = useState(() => getPreviousQuarter())

  // Compute quarters on every render to handle quarter boundary crossings
  const previousQuarter = getPreviousQuarter()
  const quarters = [
    previousQuarter,
    ...getPreviousNQuarters(previousQuarter, 7),
  ]
  const eligibilityCutoff = useMemo(
    () => getCommissionEligibilityCutoff(quarter),
    [quarter],
  )

  const data: MissingCommissionEmployee[] = useMemo(
    () =>
      employees
        .filter((emp) => {
          const latestSalary = emp.salaries[0]
          if (!latestSalary || latestSalary.bonusAmount <= 0) return false

          const startDate = emp.deelEmployee?.startDate
          if (startDate && new Date(startDate) >= eligibilityCutoff)
            return false

          return true
        })
        .map((emp) => {
          const startDate = emp.deelEmployee?.startDate
            ? new Date(emp.deelEmployee.startDate)
            : null
          return {
            id: emp.id,
            email: emp.email,
            benchmark: emp.salaries[0]!.benchmark,
            startDate,
            hasCommissionForQuarter: emp.commissionBonuses.some(
              (cb) => cb.quarter === quarter,
            ),
            quarterBreakdown: calculateQuarterBreakdown(startDate, quarter),
          }
        }),
    [employees, quarter, eligibilityCutoff],
  )

  const columns: Array<ColumnDef<MissingCommissionEmployee>> = useMemo(
    () => [
      {
        accessorKey: 'email',
        header: 'Email',
        filterFn: (
          row: Row<MissingCommissionEmployee>,
          _: string,
          filterValue: string,
        ) => customFilterFns.containsText(row.original.email, _, filterValue),
        cell: ({ row }) => (
          <Link
            to="/employee/$employeeId"
            params={{ employeeId: row.original.id }}
            className="text-blue-600 hover:underline"
          >
            {row.original.email}
          </Link>
        ),
      },
      {
        accessorKey: 'benchmark',
        header: 'Role',
        filterFn: (
          row: Row<MissingCommissionEmployee>,
          _: string,
          filterValue: string,
        ) =>
          customFilterFns.containsText(row.original.benchmark, _, filterValue),
        cell: ({ row }) => <div>{row.original.benchmark}</div>,
      },
      {
        accessorKey: 'startDate',
        header: 'Start Date',
        enableColumnFilter: false,
        cell: ({ row }) =>
          row.original.startDate ? (
            <div>
              {row.original.startDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}{' '}
              <span className="text-muted-foreground">
                ({dayjs(row.original.startDate).fromNow()})
              </span>
            </div>
          ) : (
            <span>-</span>
          ),
      },
      {
        accessorKey: 'quarterBreakdown',
        header: 'Quarter Breakdown',
        enableColumnFilter: false,
        cell: ({ row }) => {
          const breakdown = row.original.quarterBreakdown
          return (
            <div className="space-y-0.5 text-xs">
              {breakdown.notEmployedMonths > 0 && (
                <div className="text-muted-foreground">
                  {breakdown.notEmployedMonths} not employed
                </div>
              )}
              {breakdown.rampUpMonths > 0 && (
                <div className="text-blue-600">
                  {breakdown.rampUpMonths} ramp-up (100% OTE)
                </div>
              )}
              {breakdown.postRampUpMonths > 0 && (
                <div className="text-green-600">
                  {breakdown.postRampUpMonths} post ramp-up
                </div>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'hasCommissionForQuarter',
        header: 'Status',
        enableColumnFilter: false,
        cell: ({ row }) =>
          row.original.hasCommissionForQuarter ? null : (
            <div className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span>Missing</span>
            </div>
          ),
      },
    ],
    [quarter],
  )

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (row) => row.id,
    filterFns: {
      fuzzy: () => true,
    },
  })

  return (
    <div className="flex w-full justify-center px-4 pb-4">
      <div className="max-w-full flex-grow 2xl:max-w-[80%]">
        <div className="flex items-center gap-4 py-4">
          <TableFilters table={table} />
          <Select value={quarter} onValueChange={setQuarter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {quarters.map((q) => (
                <SelectItem key={q} value={q}>
                  {q}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
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
                    All eligible employees have a commission payout for{' '}
                    {quarter}! 🎉
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
