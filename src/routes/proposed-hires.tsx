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
import { ArrowUpDown, ArrowUp, ArrowDown, Trash2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Prisma, Priority } from '@prisma/client'
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { customFilterFns } from './employees'
import { getFullName } from '@/lib/utils'
import { getDeelEmployeesAndProposedHires } from './org-chart'
import AddProposedHirePanel, {
  updateProposedHire,
  deleteProposedHire,
} from '@/components/AddProposedHirePanel'
import { useLocalStorage } from 'usehooks-ts'
import { PriorityBadge } from '@/components/PriorityBadge'
import { TableFilters } from '@/components/TableFilters'
import { EditableTextCell } from '@/components/editable-cells/EditableTextCell'
import { EditableManagerCell } from '@/components/editable-cells/EditableManagerCell'
import { EditableTalentPartnersCell } from '@/components/editable-cells/EditableTalentPartnersCell'
import { createToast } from 'vercel-toast'
import { useMemo, useState } from 'react'

type DeelEmployee = Prisma.DeelEmployeeGetPayload<{
  include: {
    employee: {
      select: {
        id: true
        email: true
      }
    }
  }
}>

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

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    filterVariant?: 'text' | 'range' | 'select' | 'dateRange'
    filterOptions?: Array<{ label: string; value: string | number | boolean }>
    filterLabel?: string
  }
  interface TableMeta<TData extends RowData> {
    employees?: DeelEmployee[]
    talentTeamEmployees?: DeelEmployee[]
    handleUpdate?: (
      proposedHire: ProposedHire,
      field: string,
      value: string | string[],
    ) => Promise<void>
  }
}

export const Route = createFileRoute('/proposed-hires')({
  component: RouteComponent,
})

function handleSortToggle(column: Column<ProposedHire, unknown>) {
  const sortState = column.getIsSorted()
  if (!sortState) {
    column.toggleSorting(false)
  } else if (sortState === 'asc') {
    column.toggleSorting(true)
  } else {
    column.clearSorting()
  }
}

function DeleteButton({
  proposedHire,
  onDelete,
}: {
  proposedHire: ProposedHire
  onDelete: (id: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete(proposedHire.id)
      setOpen(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete proposed hire?</DialogTitle>
          <DialogDescription>
            This will permanently delete the proposed hire &quot;{proposedHire.title}&quot;.
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RouteComponent() {
  const queryClient = useQueryClient()
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

  const talentTeamEmployees = useMemo(
    () =>
      employees.filter(
        (employee) =>
          employee.employee?.id &&
          employee.team?.toLowerCase().includes('talent'),
      ),
    [employees],
  )

  const handleUpdate = async (
    proposedHire: ProposedHire,
    field: string,
    value: string | string[],
  ) => {
    try {
      const result = await updateProposedHire({
        data: {
          id: proposedHire.id,
          title: field === 'title' ? (value as string) : proposedHire.title,
          managerId:
            field === 'managerId'
              ? (value as string)
              : proposedHire.manager?.id || '',
          talentPartnerIds:
            field === 'talentPartnerIds'
              ? (value as string[])
              : proposedHire.talentPartners.map((tp) => tp.id),
          priority:
            field === 'priority' ? (value as Priority) : proposedHire.priority,
          hiringProfile:
            field === 'hiringProfile'
              ? (value as string)
              : proposedHire.hiringProfile,
        },
      })
      // Update the cache in place without refetching to prevent row jumping
      queryClient.setQueryData(
        ['proposedHires'],
        (oldData: typeof data | undefined) => {
          if (!oldData) return oldData
          return {
            ...oldData,
            proposedHires: oldData.proposedHires.map((ph: ProposedHire) =>
              ph.id === proposedHire.id ? result : ph,
            ),
          }
        },
      )
      createToast('Updated successfully', { timeout: 3000 })
    } catch (error) {
      createToast(error instanceof Error ? error.message : 'Failed to update', {
        timeout: 3000,
      })
      throw error
    }
  }

  const handleDeleteProposedHire = async (id: string) => {
    await deleteProposedHire({ data: { id } })
    queryClient.setQueryData(
      ['proposedHires'],
      (oldData: typeof data | undefined) => {
        if (!oldData) return oldData
        return {
          ...oldData,
          proposedHires: oldData.proposedHires.filter(
            (ph: ProposedHire) => ph.id !== id,
          ),
        }
      },
    )
    createToast('Successfully deleted proposed hire.', { timeout: 3000 })
  }

  const columns: Array<ColumnDef<ProposedHire>> = [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row, table }) => (
        <EditableTextCell
          value={row.original.title}
          onSave={(value) =>
            table.options.meta?.handleUpdate?.(row.original, 'title', value) ??
            Promise.resolve()
          }
          placeholder="Enter title..."
        />
      ),
    },
    {
      accessorKey: 'talentPartners',
      header: 'Talent Partners',
      filterFn: (row: Row<ProposedHire>, _: string, filterValue: string) =>
        row.original.talentPartners.some((tp) =>
          customFilterFns.containsText(
            getFullName(tp.deelEmployee?.firstName, tp.deelEmployee?.lastName),
            _,
            filterValue,
          ),
        ),
      cell: ({ row, table }) => (
        <EditableTalentPartnersCell
          selectedIds={row.original.talentPartners.map((tp) => tp.id)}
          employees={table.options.meta?.talentTeamEmployees || []}
          onSave={(ids) =>
            table.options.meta?.handleUpdate?.(
              row.original,
              'talentPartnerIds',
              ids,
            ) ?? Promise.resolve()
          }
        />
      ),
    },
    {
      accessorKey: 'manager.deelEmployee.firstName',
      header: 'Manager',
      cell: ({ row, table }) => (
        <EditableManagerCell
          selectedId={row.original.manager?.id || null}
          employees={table.options.meta?.employees || []}
          displayValue={getFullName(
            row.original.manager?.deelEmployee?.firstName,
            row.original.manager?.deelEmployee?.lastName,
          )}
          onSave={(managerId) =>
            table.options.meta?.handleUpdate?.(
              row.original,
              'managerId',
              managerId,
            ) ?? Promise.resolve()
          }
        />
      ),
    },
    {
      accessorKey: 'manager.deelEmployee.team',
      header: 'Team',
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => {
        const handlePriorityChange = async (value: string) => {
          await handleUpdate(row.original, 'priority', value)
        }

        return (
          <Select
            value={row.original.priority}
            onValueChange={handlePriorityChange}
          >
            <SelectTrigger className="h-auto w-auto border-0 p-0 shadow-none hover:bg-transparent focus:ring-0">
              <SelectValue>
                <PriorityBadge priority={row.original.priority} />
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">
                <PriorityBadge priority="high" />
              </SelectItem>
              <SelectItem value="medium">
                <PriorityBadge priority="medium" />
              </SelectItem>
              <SelectItem value="low">
                <PriorityBadge priority="low" />
              </SelectItem>
              <SelectItem value="filled">
                <PriorityBadge priority="filled" />
              </SelectItem>
              <SelectItem value="pushed_to_next_quarter">
                <PriorityBadge priority="pushed_to_next_quarter" />
              </SelectItem>
            </SelectContent>
          </Select>
        )
      },
      meta: {
        filterVariant: 'select',
        filterOptions: [
          { label: 'High', value: 'high' },
          { label: 'Medium', value: 'medium' },
          { label: 'Low', value: 'low' },
          { label: 'Filled', value: 'filled' },
          { label: 'Pushed to next quarter', value: 'pushed_to_next_quarter' },
        ],
      },
      filterFn: (row: Row<ProposedHire>, _: string, filterValue: string[]) => {
        return filterValue.includes(row.original.priority)
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
      cell: ({ row, table }) => (
        <EditableTextCell
          value={row.original.hiringProfile || ''}
          onSave={(value) =>
            table.options.meta?.handleUpdate?.(
              row.original,
              'hiringProfile',
              value,
            ) ?? Promise.resolve()
          }
          multiline
          placeholder="Enter hiring profile..."
          className="min-w-[200px]"
        />
      ),
    },
    {
      id: 'actions',
      header: '',
      enableColumnFilter: false,
      enableSorting: false,
      cell: ({ row }) => (
        <DeleteButton
          proposedHire={row.original}
          onDelete={handleDeleteProposedHire}
        />
      ),
    },
  ]

  const table = useReactTable({
    data: proposedHires || [],
    columns,
    getRowId: (row) => row.id,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    autoResetAll: false,
    state: {
      columnFilters,
      sorting,
    },
    filterFns: {},
    meta: {
      employees,
      talentTeamEmployees,
      handleUpdate,
    },
  })

  return (
    <div className="flex justify-center px-4 pb-4">
      <div className="max-w-full flex-grow 2xl:max-w-[80%]">
        <div className="flex justify-between py-4">
          <div>
            <TableFilters table={table} />
          </div>
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
