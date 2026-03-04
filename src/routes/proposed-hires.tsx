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
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Department, Prisma, Priority } from '@prisma/client'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useMemo, useState } from 'react'

const UNASSIGNED_TALENT_PARTNER_FILTER = '__unassigned__'
const NO_TEAM_FILTER = '__no_team__'

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
        deelEmployee: {
          include: {
            topLevelManager: true
          }
        }
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
          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete proposed hire?</DialogTitle>
          <DialogDescription>
            This will permanently delete the proposed hire &quot;
            {proposedHire.title}&quot;. This action cannot be undone.
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
  const [showStats, setShowStats] = useLocalStorage<boolean>(
    'proposed-hires.showStats',
    false,
  )

  const { data, isLoading } = useQuery({
    queryKey: ['proposedHires'],
    queryFn: () => getDeelEmployeesAndProposedHires(),
  })
  const proposedHires = data?.proposedHires || []
  const employees = data?.employees || []

  const openProposedHires = useMemo(() => {
    const openPriorities = new Set<Priority>(['high', 'medium', 'low'])
    return proposedHires.filter((ph) => openPriorities.has(ph.priority))
  }, [proposedHires])

  const openCountsByPriority = useMemo(() => {
    return openProposedHires.reduce(
      (acc, ph) => {
        if (ph.priority === 'high') acc.high += 1
        if (ph.priority === 'medium') acc.medium += 1
        if (ph.priority === 'low') acc.low += 1
        return acc
      },
      { high: 0, medium: 0, low: 0 },
    )
  }, [openProposedHires])

  const openHiresByTalentPartner = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>()
    for (const ph of openProposedHires) {
      if (!ph.talentPartners.length) {
        counts.set(UNASSIGNED_TALENT_PARTNER_FILTER, {
          label: '(Unassigned)',
          count: (counts.get(UNASSIGNED_TALENT_PARTNER_FILTER)?.count ?? 0) + 1,
        })
        continue
      }
      for (const tp of ph.talentPartners) {
        const name =
          getFullName(tp.deelEmployee?.firstName, tp.deelEmployee?.lastName) ||
          tp.email
        const key = tp.id
        const existing = counts.get(key)
        counts.set(key, {
          label: name,
          count: (existing?.count ?? 0) + 1,
        })
      }
    }
    return Array.from(counts.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
  }, [openProposedHires])

  const openHiresByTeam = useMemo(() => {
    const counts = new Map<string, number>()
    for (const ph of openProposedHires) {
      const team = ph.manager?.deelEmployee?.team || NO_TEAM_FILTER
      counts.set(team, (counts.get(team) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([team, count]) => ({
        team,
        label: team === NO_TEAM_FILTER ? '(No team)' : team,
        count,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
  }, [openProposedHires])

  const talentTeamEmployees = useMemo(
    () =>
      employees.filter(
        (employee) =>
          employee.employee?.id &&
          employee.team?.toLowerCase().includes('talent'),
      ),
    [employees],
  )

  const blitzscaleManagerOptions = useMemo(() => {
    const employeeById = new Map(employees.map((e) => [e.id, e]))
    const options: Array<{ label: string; value: string }> = []
    const seen = new Set<string>()
    for (const emp of employees) {
      const tlmId = emp.topLevelManagerId
      if (tlmId && !seen.has(tlmId)) {
        seen.add(tlmId)
        const tlm = employeeById.get(tlmId)
        if (tlm) {
          const name = getFullName(tlm.firstName, tlm.lastName)
          if (name) options.push({ label: name, value: tlmId })
        }
      }
    }
    return options.sort((a, b) => a.label.localeCompare(b.label))
  }, [employees])

  const talentPartnerOptions = useMemo(() => {
    return talentTeamEmployees
      .filter((emp) => emp.employee?.id)
      .map((emp) => ({
        label: getFullName(emp.firstName, emp.lastName),
        value: emp.employee!.id,
      }))
      .filter((opt) => opt.label)
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [talentTeamEmployees])

  const titleOptions = useMemo(() => {
    const uniqueTitles = new Set(proposedHires.map((ph) => ph.title))
    return Array.from(uniqueTitles)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .map((title) => ({ label: title, value: title }))
  }, [proposedHires])

  const managerOptions = useMemo(() => {
    const seen = new Map<string, { label: string; value: string }>()
    for (const ph of proposedHires) {
      const managerId = ph.manager?.id
      if (managerId && !seen.has(managerId)) {
        const name = getFullName(
          ph.manager?.deelEmployee?.firstName,
          ph.manager?.deelEmployee?.lastName,
        )
        if (name) {
          seen.set(managerId, { label: name, value: managerId })
        }
      }
    }
    return Array.from(seen.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    )
  }, [proposedHires])

  const teamOptions = useMemo(() => {
    const uniqueTeams = new Set(
      proposedHires
        .map((ph) => ph.manager?.deelEmployee?.team)
        .filter(Boolean) as string[],
    )
    return Array.from(uniqueTeams)
      .sort((a, b) => a.localeCompare(b))
      .map((team) => ({ label: team, value: team }))
  }, [proposedHires])

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
          department:
            field === 'department'
              ? ((value as string) || null) as Department | null
              : proposedHire.department,
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
      meta: {
        filterVariant: 'select',
        filterOptions: titleOptions,
      },
      filterFn: (row: Row<ProposedHire>, _: string, filterValue: string[]) =>
        filterValue.includes(row.original.title),
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
      meta: {
        filterVariant: 'select',
        filterOptions: talentPartnerOptions,
      },
      filterFn: (row: Row<ProposedHire>, _: string, filterValue: string[]) =>
        (filterValue.includes(UNASSIGNED_TALENT_PARTNER_FILTER) &&
          row.original.talentPartners.length === 0) ||
        row.original.talentPartners.some((tp) => filterValue.includes(tp.id)),
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
      meta: {
        filterVariant: 'select',
        filterOptions: managerOptions,
      },
      filterFn: (row: Row<ProposedHire>, _: string, filterValue: string[]) => {
        const managerId = row.original.manager?.id
        if (!managerId) return false
        return filterValue.includes(managerId)
      },
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
      header: () => (
        <span className="flex items-center gap-1">
          Team
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="text-muted-foreground h-3.5 w-3.5" />
              </TooltipTrigger>
              <TooltipContent>
                This field is derived from the assigned manager
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </span>
      ),
      meta: {
        filterVariant: 'select',
        filterLabel: 'Team',
        filterOptions: teamOptions,
      },
      filterFn: (row: Row<ProposedHire>, _: string, filterValue: string[]) => {
        const team = row.original.manager?.deelEmployee?.team
        if (!team) return filterValue.includes(NO_TEAM_FILTER)
        return filterValue.includes(team)
      },
    },
    {
      id: 'blitzscaleManager',
      accessorFn: (row) =>
        getFullName(
          row.manager?.deelEmployee?.topLevelManager?.firstName,
          row.manager?.deelEmployee?.topLevelManager?.lastName,
        ),
      header: () => (
        <span className="flex items-center gap-1">
          Blitzscale Manager
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="text-muted-foreground h-3.5 w-3.5" />
              </TooltipTrigger>
              <TooltipContent>
                This field is derived from the assigned manager
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </span>
      ),
      meta: {
        filterVariant: 'select',
        filterLabel: 'Blitzscale Manager',
        filterOptions: blitzscaleManagerOptions,
      },
      filterFn: (row: Row<ProposedHire>, _: string, filterValue: string[]) => {
        const tlmId = row.original.manager?.deelEmployee?.topLevelManagerId
        if (!tlmId) return false
        return filterValue.includes(tlmId)
      },
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
              <SelectItem value="high" className="py-1 text-xs">
                <PriorityBadge priority="high" />
              </SelectItem>
              <SelectItem value="medium" className="py-1 text-xs">
                <PriorityBadge priority="medium" />
              </SelectItem>
              <SelectItem value="low" className="py-1 text-xs">
                <PriorityBadge priority="low" />
              </SelectItem>
              <SelectItem value="filled" className="py-1 text-xs">
                <PriorityBadge priority="filled" />
              </SelectItem>
              <SelectItem
                value="pushed_to_next_quarter"
                className="py-1 text-xs"
              >
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
      accessorKey: 'department',
      header: 'Department',
      meta: {
        filterVariant: 'select',
        filterOptions: [
          { label: 'R&D', value: 'RD' },
          { label: 'S&M', value: 'SM' },
          { label: 'G&A', value: 'GA' },
        ],
      },
      filterFn: (row: Row<ProposedHire>, _: string, filterValue: string[]) =>
        filterValue.includes(row.original.department ?? ''),
      cell: ({ row, table }) => {
        const DEPARTMENT_LABELS: Record<Department, string> = {
          RD: 'R&D',
          SM: 'S&M',
          GA: 'G&A',
        }
        return (
          <Select
            value={row.original.department ?? ''}
            onValueChange={(value) =>
              table.options.meta?.handleUpdate?.(
                row.original,
                'department',
                value,
              )
            }
          >
            <SelectTrigger className="h-auto w-auto border-0 p-0 shadow-none hover:bg-transparent focus:ring-0">
              <SelectValue placeholder="—">
                {row.original.department
                  ? DEPARTMENT_LABELS[row.original.department]
                  : '—'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RD">R&amp;D</SelectItem>
              <SelectItem value="SM">S&amp;M</SelectItem>
              <SelectItem value="GA">G&amp;A</SelectItem>
            </SelectContent>
          </Select>
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

  const getFilterValues = (id: string): string[] => {
    const current = columnFilters.find((f) => f.id === id)?.value
    if (!current) return []
    return Array.isArray(current) ? (current as string[]) : []
  }

  const toggleExclusiveFilterValue = (id: string, value: string) => {
    const currentValues = getFilterValues(id)
    const isActive = currentValues.length === 1 && currentValues[0] === value
    const next = columnFilters.filter((f) => f.id !== id)
    if (!isActive) next.push({ id, value: [value] })
    setColumnFilters(next)
  }

  const clearFilter = (id: string) => {
    setColumnFilters(columnFilters.filter((f) => f.id !== id))
  }

  return (
    <div className="flex justify-center px-4 pb-4">
      <div className="max-w-full flex-grow 2xl:max-w-[80%]">
        <div className="rounded-md border p-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-medium">Stats</div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-6 px-1.5 text-xs"
              onClick={() => setShowStats((v) => !v)}
            >
              {showStats ? (
                <>
                  Hide <ChevronUp className="ml-1 h-3 w-3" />
                </>
              ) : (
                <>
                  Show <ChevronDown className="ml-1 h-3 w-3" />
                </>
              )}
            </Button>
          </div>
          {showStats ? (
            <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-3">
              <div className="rounded-md border p-2">
                <div className="text-muted-foreground mb-1 text-[11px] tracking-wide uppercase">
                  Open Roles By Priority
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['high', 'medium', 'low'] as const).map((priority) => {
                    const isActive =
                      getFilterValues('priority').length === 1 &&
                      getFilterValues('priority')[0] === priority
                    return (
                      <button
                        type="button"
                        key={priority}
                        onClick={() =>
                          toggleExclusiveFilterValue('priority', priority)
                        }
                        aria-pressed={isActive}
                        className={`hover:bg-muted flex cursor-pointer items-center gap-2 rounded-sm px-1 py-0.5 ${isActive ? 'bg-muted ring-border ring-1' : ''}`}
                      >
                        <PriorityBadge priority={priority} />
                        <span className="font-medium">
                          {openCountsByPriority[priority]}
                        </span>
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => clearFilter('priority')}
                    className="text-muted-foreground hover:bg-muted flex cursor-pointer items-center gap-2 rounded-sm px-1 py-0.5"
                  >
                    <span>Total</span>
                    <span className="text-foreground font-medium">
                      {openProposedHires.length}
                    </span>
                  </button>
                </div>
              </div>

              <div className="rounded-md border p-2">
                <div className="text-muted-foreground mb-1 text-[11px] tracking-wide uppercase">
                  Open Hires By Talent Partner
                </div>
                <div className="max-h-48 space-y-0.5 overflow-auto pr-1">
                  {openHiresByTalentPartner.length ? (
                    openHiresByTalentPartner.map((tp) => {
                      const isActive =
                        getFilterValues('talentPartners').length === 1 &&
                        getFilterValues('talentPartners')[0] === tp.id
                      return (
                        <button
                          type="button"
                          key={tp.id}
                          onClick={() =>
                            toggleExclusiveFilterValue('talentPartners', tp.id)
                          }
                          aria-pressed={isActive}
                          className={`hover:bg-muted flex w-full cursor-pointer items-center justify-between gap-3 rounded-sm px-1 py-0.5 text-left ${isActive ? 'bg-muted ring-border ring-1' : ''}`}
                        >
                          <div className="truncate">{tp.label}</div>
                          <div className="font-medium tabular-nums">
                            {tp.count}
                          </div>
                        </button>
                      )
                    })
                  ) : (
                    <div className="text-muted-foreground">No open hires.</div>
                  )}
                </div>
              </div>

              <div className="rounded-md border p-2">
                <div className="text-muted-foreground mb-1 text-[11px] tracking-wide uppercase">
                  Open Hires By Team
                </div>
                <div className="max-h-48 space-y-0.5 overflow-auto pr-1">
                  {openHiresByTeam.length ? (
                    openHiresByTeam.map((team) => {
                      const isActive =
                        getFilterValues('manager.deelEmployee.team').length ===
                          1 &&
                        getFilterValues('manager.deelEmployee.team')[0] ===
                          team.team
                      return (
                        <button
                          type="button"
                          key={team.team}
                          onClick={() =>
                            toggleExclusiveFilterValue(
                              'manager.deelEmployee.team',
                              team.team,
                            )
                          }
                          aria-pressed={isActive}
                          className={`hover:bg-muted flex w-full cursor-pointer items-center justify-between gap-3 rounded-sm px-1 py-0.5 text-left ${isActive ? 'bg-muted ring-border ring-1' : ''}`}
                        >
                          <div className="truncate">{team.label}</div>
                          <div className="font-medium tabular-nums">
                            {team.count}
                          </div>
                        </button>
                      )
                    })
                  ) : (
                    <div className="text-muted-foreground">No open hires.</div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between py-2">
          <TableFilters table={table} />
          <AddProposedHirePanel employees={employees} />
        </div>
        <div className="rounded-md border">
          <Table className="text-xs">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const sortState = header.column.getIsSorted()
                    return (
                      <TableHead key={header.id} className="h-8 px-1">
                        {header.isPlaceholder ? null : (
                          <>
                            <div
                              {...{
                                className: header.column.getCanSort()
                                  ? 'cursor-pointer select-none flex items-center gap-1 hover:text-gray-700'
                                  : 'flex items-center gap-1',
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
                                  <ArrowUp className="h-3 w-3" />
                                ) : sortState === 'desc' ? (
                                  <ArrowDown className="h-3 w-3" />
                                ) : (
                                  <ArrowUpDown className="h-3 w-3 opacity-50" />
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
                      <TableCell key={cell.id} className="px-1 py-0.5">
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
