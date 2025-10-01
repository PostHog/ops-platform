import React from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  flexRender,
  getCoreRowModel,
  VisibilityState,
  useReactTable,
  ColumnFiltersState,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import { ChevronDown, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createServerFn } from '@tanstack/react-start'
import prisma from '@/db'
import { Prisma } from "@prisma/client";

export const Route = createFileRoute("/")({
  component: App,
  loader: async () => await getEmployees(),
})

type Employee = Prisma.EmployeeGetPayload<{
  include: {
    salaries: {
      orderBy: {
        timestamp: 'desc'
      }
    }
  }
}>

export const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const getEmployees = createServerFn({
  method: 'GET',
}).handler(async () => {
  return await prisma.employee.findMany({
    include: {
      salaries: {
        orderBy: {
          timestamp: 'desc',
        },
      }
    },
    orderBy: {
      name: 'asc',
    }
  })
})

function App() {
  const router = useRouter()
  const employees: Employee[] = Route.useLoaderData()
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  const columns: ColumnDef<Employee>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div>{row.original.name}</div>
      ),
    },
    {
      accessorKey: "lastChangeTimestamp",
      header: "Last Change (date)",
      cell: ({ row }) => {
        const date = new Date(row.original.salaries?.[0]?.timestamp)
        return <div>{months[date.getMonth()]} {date.getFullYear()}</div>
      },
    },
    {
      accessorKey: "level",
      header: "Level",
      cell: ({ row }) => <div>{row.original.salaries[0].level}</div>,
    },
    {
      accessorKey: "step",
      header: "Step",
      cell: ({ row }) => <div>{row.original.salaries[0].step}</div>,
    },
    {
      accessorKey: "totalSalary",
      header: "Total Salary",
      cell: ({ row }) => <div>{row.original.salaries[0].totalSalary}</div>,
    },
    {
      accessorKey: "changePercentage",
      header: "Last Change (%)",
      cell: ({ row }) => <div>{row.original.salaries[0].changePercentage * 100}%</div>,
    },
    {
      accessorKey: "changeAmount",
      header: "Last Change ($)",
      cell: ({ row }) => <div>{row.original.salaries[0].changeAmount}</div>,
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => <div>{row.original.priority}</div>,
    },
    {
      accessorKey: "reviewer",
      header: "Reviewer",
      cell: ({ row }) => <div>{row.original.reviewer}</div>,
    },
    {
      accessorKey: "notes",
      header: "Notes",
      cell: ({ row }) => <div>{row.original.salaries[0].notes}</div>,
    },
    {
      accessorKey: "reviewd",
      header: "Reviewd",
      cell: ({ row }) => <div>{row.original.reviewd ? "Yes" : "No"}</div>,
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const employee = row.original

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
                onClick={() => router.navigate({ to: '/employee/$employeeId', params: { employeeId: employee.id } })}
              >
                Edit person
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: employees,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    filterFns: {
      fuzzy: () => true,
    },
  })

  return (
    <div className="w-screen flex justify-center">
      <div className="max-w-[80%] flex-grow">
        <div className="flex items-center py-4">
          <Input
            placeholder="Filter names..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("name")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                Columns <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
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
                            header.getContext()
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
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
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
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="text-muted-foreground flex-1 text-sm">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}