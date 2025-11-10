import React from 'react'
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
} from '@tanstack/react-table'
import { ArrowUpDown, ArrowUp, ArrowDown, Pencil } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { Filter } from '.'
import { getDeelEmployeesAndProposedHires } from './org-chart'
import AddProposedHirePanel from '@/components/AddProposedHirePanel'

type ProposedHire = Prisma.ProposedHireGetPayload<{
  include: {
    manager: {
      include: {
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
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  )
  const [editingProposedHireId, setEditingProposedHireId] = React.useState<
    string | undefined
  >(undefined)
  const [sorting, setSorting] = React.useState<SortingState>([
    {
      id: 'priority',
      desc: false,
    },
  ])

  const { data, isLoading } = useQuery({
    queryKey: ['proposedHires'],
    queryFn: () => getDeelEmployeesAndProposedHires(),
  })
  const proposedHires = data?.proposedHires || []
  const employees = data?.employees || []

  const proposedHire = proposedHires.find(
    (proposedHire) => proposedHire.id === editingProposedHireId,
  )

  const columns: Array<ColumnDef<ProposedHire>> = [
    {
      accessorKey: 'title',
      header: 'Title',
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
    },
    {
      accessorKey: 'hiringProfile',
      header: 'Hiring Profile',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        return (
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => setEditingProposedHireId(row.original.id)}
          >
            <Pencil />
          </Button>
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
    <div className="flex justify-center">
      <div className="max-w-[80%] flex-grow">
        <div className="flex justify-between py-4">
          <div></div>
          <div className="flex items-center space-x-2">
            <AddProposedHirePanel
              employees={employees}
              proposedHire={proposedHire}
              onClose={() => setEditingProposedHireId(undefined)}
              openWhenIdChanges={true}
            />
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
