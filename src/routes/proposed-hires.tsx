import { createFileRoute } from '@tanstack/react-router'
import {
  ColumnDef,
  Column,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  RowData,
  ColumnFiltersState,
  SortingState,
  Row,
} from '@tanstack/react-table'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import type { Prisma } from '@prisma/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { customFilterFns, Filter } from './employees'
import { getDeelEmployeesAndProposedHires } from './org-chart'
import AddProposedHirePanel from '@/components/AddProposedHirePanel'
import { useLocalStorage } from 'usehooks-ts'
import { PriorityBadge } from '@/components/PriorityBadge'

type ProposedHire = Prisma.ProposedHireGetPayload<{
  include: {
    manager: {
      select: {
        id: true
        email: true
        deelEmployee: true
      }
    }
    talentPartners: {
      select: {
        id: true
        email: true
        deelEmployee: true
      }
    }
  }
}>

export const Route = createFileRoute('/proposed-hires')({
  component: RouteComponent,
})

declare module '@tanstack/react-table' {
  // allows us to define custom properties for our columns
  interface ColumnMeta<TData extends RowData, TValue> {
    filterVariant?: 'text' | 'range' | 'select' | 'dateRange'
    filterOptions?: Array<{ label: string; value: string }>
  }
}

function handleSortToggle(column: Column<any, unknown>) {
  const sortState = column.getIsSorted()
  if (!sortState) {
    column.toggleSorting(false) // asc
  } else if (sortState === 'asc') {
    column.toggleSorting(true) // desc
  } else {
    column.clearSorting() // no sort
  }
}

function RouteComponent() {
  const [columnFilters, setColumnFilters] = useLocalStorage<ColumnFiltersState>(
    'proposed-hires.table.columnFilters',
    [],
  )
  const [sorting, setSorting] = useLocalStorage<SortingState>(
    'proposed-hires.table.sorting',
    [
      {
        id: 'priority',
        desc: false,
      },
    ],
  )

  const { data, isLoading } = useQuery({
    queryKey: ['proposedHires'],
    queryFn: () => getDeelEmployeesAndProposedHires(),
  })
  const proposedHires = data?.proposedHires || []
  const employees = data?.employees || []

  const columns: Array<ColumnDef<ProposedHire>> = [
    {
      accessorKey: 'title',
      header: 'Title',
    },
    {
      accessorKey: 'talentPartners',
      header: 'Talent Partners',
      filterFn: (row: Row<ProposedHire>, _: string, filterValue: string) =>
        row.original.talentPartners.some((tp) =>
          customFilterFns.containsText(
            tp.deelEmployee?.name ?? '',
            _,
            filterValue,
          ),
        ),
      cell: ({ row }) => {
        const partners = row.original.talentPartners
        return (
          <div>
            {partners.length > 0
              ? partners
                  .map((tp) => tp.deelEmployee?.name ?? tp.email)
                  .join(', ')
              : 'None'}
          </div>
        )
      },
    },
    {
      accessorKey: 'manager.deelEmployee.name',
      header: 'Manager',
    },
    {
      accessorKey: 'manager.deelEmployee.team',
      header: 'Team',
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => {
        return <PriorityBadge priority={row.original.priority} />
      },
      sortingFn: (rowA, rowB) => {
        const priorityOrder = [
          'high',
          'medium',
          'low',
          'filled',
          'pushed_to_next_quarter',
        ]
        return (
          priorityOrder.indexOf(rowA.original.priority) -
          priorityOrder.indexOf(rowB.original.priority)
        )
      },
    },
    {
      accessorKey: 'hiringProfile',
      header: 'Hiring Profile',
      cell: ({ row }) => {
        return (
          <div className="min-w-[200px] whitespace-pre-line">
            {row.original.hiringProfile}
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        return (
          <AddProposedHirePanel
            employees={employees}
            proposedHire={row.original}
            buttonType="icon"
          />
        )
      },
    },
  ]

  const table = useReactTable({
    data: proposedHires || [],
    columns,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      columnFilters,
      sorting,
    },
    filterFns: {},
  })

  return (
    <div className="flex justify-center px-4 pb-4">
      <div className="max-w-full flex-grow 2xl:max-w-[80%]">
        <div className="flex justify-between py-4">
          <div></div>
          <div className="flex items-center space-x-2">
            <AddProposedHirePanel employees={employees} />
          </div>
        </div>
        <div className="rounded-md border">
          <Table className="text-xs">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const sortState = header.column.getIsSorted()
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : (
                          <>
                            <div
                              {...{
                                className: header.column.getCanSort()
                                  ? 'cursor-pointer select-none flex items-center gap-2 hover:text-gray-700'
                                  : 'flex items-center gap-2',
                                onClick: header.column.getCanSort()
                                  ? () => handleSortToggle(header.column)
                                  : undefined,
                              }}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                              {header.column.getCanSort() &&
                                (sortState === 'asc' ? (
                                  <ArrowUp className="h-4 w-4" />
                                ) : sortState === 'desc' ? (
                                  <ArrowDown className="h-4 w-4" />
                                ) : (
                                  <ArrowUpDown className="h-4 w-4 opacity-50" />
                                ))}
                            </div>
                            {header.column.getCanFilter() ? (
                              <div>
                                <Filter column={header.column} />
                              </div>
                            ) : null}
                          </>
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
                  <TableRow key={row.id}>
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
                    {isLoading ? 'Loading...' : 'No results.'}
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
