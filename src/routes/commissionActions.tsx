import { createFileRoute } from '@tanstack/react-router'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useServerFn } from '@tanstack/react-start'
import { useMemo, useState } from 'react'
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
import { createAdminFn } from '@/lib/auth-middleware'
import { TableFilters } from '@/components/TableFilters'
import { fetchDeelEmployee } from './syncDeelEmployees'
import { createToast } from 'vercel-toast'

const getQuarterEndDate = (quarter: string): string => {
  // Format: "2025-Q4"
  const [year, quarterNum] = quarter.split('-Q')
  const yearNum = parseInt(year, 10)
  const qNum = parseInt(quarterNum, 10)

  const quarterEnds: [number, number][] = [
    [3, 31], // Q1 - March
    [6, 30], // Q2 - June
    [9, 30], // Q3 - September
    [12, 31], // Q4 - December
  ]

  if (qNum < 1 || qNum > 4) {
    throw new Error(`Invalid quarter: ${quarter}`)
  }

  const [month, day] = quarterEnds[qNum - 1]
  return `${yearNum}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const generateDeelCSV = (rows: Array<Record<string, string>>): string => {
  if (rows.length === 0) {
    return ''
  }

  const headers = Object.keys(rows[0])
  const csvRows = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header] || ''
          // Escape commas, quotes, and newlines in values
          if (
            value.includes(',') ||
            value.includes('"') ||
            value.includes('\n')
          ) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        })
        .join(','),
    ),
  ]

  return csvRows.join('\n')
}

type CommissionBonus = Prisma.CommissionBonusGetPayload<{
  include: {
    employee: {
      include: {
        deelEmployee: true
      }
    }
  }
}>

const getCommissionBonuses = createAdminFn({
  method: 'GET',
}).handler(async () => {
  return await prisma.commissionBonus.findMany({
    where: {
      createdAt: {
        gte: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
      },
    },
    include: {
      employee: {
        include: {
          deelEmployee: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
})

const exportCommissionBonusesForDeel = createAdminFn({
  method: 'POST',
}).handler(async () => {
  const bonuses = await prisma.commissionBonus.findMany({
    where: {
      synced: false,
      communicated: true,
      createdAt: {
        gte: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
      },
    },
    include: {
      employee: {
        include: {
          deelEmployee: true,
        },
      },
    },
  })

  const errors: string[] = []
  const csvRows: Array<Record<string, string>> = []

  for (const bonus of bonuses) {
    try {
      if (!bonus.employee.deelEmployee) {
        throw new Error(`No deel employee found`)
      }

      const deelEmployee = await fetchDeelEmployee(
        bonus.employee.deelEmployee.id,
      )

      const activeEmployment = deelEmployee.employments?.find(
        (x: any) => x.hiring_status === 'active',
      )

      if (!activeEmployment) {
        throw new Error(`No active employment found`)
      }

      const contractId = activeEmployment.id
      const quarterEndDate = getQuarterEndDate(bonus.quarter)
      const employeeName =
        bonus.employee.deelEmployee.name || bonus.employee.email

      csvRows.push({
        oid: contractId,
        name: employeeName,
        email: bonus.employee.email,
        adjustmentCategoryName: 'Commission',
        amount: bonus.calculatedAmountLocal.toFixed(2),
        vendorName: '',
        title: `${bonus.quarter} Commission Bonus`,
        description: `${bonus.quarter} Commission Bonus - ${((bonus.attainment / bonus.quota) * 100).toFixed(2)}% attainment`,
        dateOfExpense: quarterEndDate,
        countryOfExpense: '',
        receiptFile: '',
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      errors.push(
        `Error processing bonus ${bonus.id} (${bonus.employee.email}): ${errorMessage}`,
      )
    }
  }

  if (errors.length > 0) {
    console.log(errors)
  }

  if (csvRows.length === 0) {
    return { csv: '', errors }
  }

  const csv = generateDeelCSV(csvRows)

  return { csv, errors }
})

export const Route = createFileRoute('/commissionActions')({
  component: App,
  loader: async () => await getCommissionBonuses(),
})

function App() {
  const bonuses: Array<CommissionBonus> = Route.useLoaderData()
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [isExportingDeel, setIsExportingDeel] = useState(false)
  const exportCommissionBonusesForDeelFn = useServerFn(
    exportCommissionBonusesForDeel,
  )

  const columns: Array<ColumnDef<CommissionBonus>> = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        filterFn: (row: Row<CommissionBonus>, _: string, filterValue: string) =>
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
        accessorKey: 'quarter',
        header: 'Quarter',
        filterFn: (row: Row<CommissionBonus>, _: string, filterValue: string) =>
          customFilterFns.containsText(row.original.quarter, _, filterValue),
        cell: ({ row }) => <div>{row.original.quarter}</div>,
      },
      {
        accessorKey: 'quota',
        header: 'Quota',
        meta: {
          filterVariant: 'range',
        },
        cell: ({ row }) => (
          <div>
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: row.original.localCurrency,
            }).format(row.original.quota)}
          </div>
        ),
      },
      {
        accessorKey: 'attainment',
        header: 'Attainment',
        meta: {
          filterVariant: 'range',
        },
        cell: ({ row }) => (
          <div>
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: row.original.localCurrency,
            }).format(row.original.attainment)}
          </div>
        ),
      },
      {
        id: 'attainmentPercentage',
        header: 'Attainment %',
        cell: ({ row }) => {
          const percentage =
            (row.original.attainment / row.original.quota) * 100
          return <div>{percentage.toFixed(2)}%</div>
        },
      },
      {
        accessorKey: 'calculatedAmountLocal',
        header: 'Bonus Amount (local)',
        meta: {
          filterVariant: 'range',
        },
        cell: ({ row }) => (
          <div>
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: row.original.localCurrency,
            }).format(row.original.calculatedAmountLocal)}
          </div>
        ),
      },
      {
        accessorKey: 'localCurrency',
        header: 'Currency',
        cell: ({ row }) => <div>{row.original.localCurrency}</div>,
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
          row: Row<CommissionBonus>,
          _: string,
          filterValue: boolean[],
        ) => {
          return filterValue.includes(row.original.communicated)
        },
        cell: ({ row }) => (
          <div>
            <span>{row.original.communicated ? 'Yes' : 'No'}</span>
          </div>
        ),
      },
    ],
    [],
  )

  const handleExportAsCSV = () => {
    const csvConfig = mkConfig({
      useKeysAsHeaders: true,
      filename: `commission bonuses ${months[new Date().getMonth()]} ${new Date().getFullYear()}`,
    })

    const csv = generateCsv(csvConfig)(
      table.getFilteredRowModel().rows.map((row) => {
        const bonus = row.original
        const attainmentPercentage = (bonus.attainment / bonus.quota) * 100
        return {
          name: bonus.employee.deelEmployee?.name || bonus.employee.email,
          quarter: bonus.quarter,
          quota: bonus.quota,
          attainment: bonus.attainment,
          attainmentPercentage: `${attainmentPercentage.toFixed(2)}%`,
          bonusAmount: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: bonus.localCurrency,
          }).format(bonus.calculatedAmountLocal),
          currency: bonus.localCurrency,
          communicated: bonus.communicated ? 'Yes' : 'No',
        }
      }),
    )

    download(csvConfig)(csv)
  }

  const handleExportForDeel = async () => {
    setIsExportingDeel(true)
    try {
      const result = await exportCommissionBonusesForDeelFn()
      if (result.csv) {
        const blob = new Blob([result.csv], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `commission-bonuses-deel-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        createToast(
          'No bonuses to export. Make sure there are bonuses that are communicated but not synced.',
        )
      }
      if (result.errors && result.errors.length > 0) {
        console.error('Errors during export:', result.errors)
        alert(
          `Export completed with ${result.errors.length} errors. Check console for details.`,
        )
      }
    } catch (error) {
      console.error('Error exporting for Deel:', error)
      alert('Failed to export CSV for Deel import')
    } finally {
      setIsExportingDeel(false)
    }
  }

  const table = useReactTable({
    data: bonuses,
    columns,
    onColumnFiltersChange: setColumnFilters,
    state: {
      columnFilters,
    },
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
        <div className="flex justify-between py-4">
          <div>
            <TableFilters table={table} />
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="ml-auto"
              onClick={handleExportAsCSV}
            >
              Export visible as CSV
            </Button>
            <Button
              variant="outline"
              onClick={handleExportForDeel}
              disabled={isExportingDeel}
            >
              {isExportingDeel ? 'Exporting...' : 'Export all for Deel Import'}
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
