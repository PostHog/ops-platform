import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table'
import type { OnboardingStatus, Prisma } from '@prisma/client'
import { useState, useEffect, useCallback, Fragment } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Plus,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Upload,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { OnboardingTaskPanel } from '@/components/OnboardingTaskPanel'
import { OnboardingImportPanel } from '@/components/OnboardingImportPanel'
import { createAdminFn, createOrgChartFn } from '@/lib/auth-middleware'
import { getQuarterOptions, getCurrentQuarter, getFullName } from '@/lib/utils'
import {
  getPhase,
  formatDate,
  STATUS_CONFIG,
  STATUS_OPTIONS,
} from '@/lib/onboarding-utils'
import {
  generateOnboardingTasks,
  syncTasksToStatus,
  recalculateTaskDueDates,
} from '@/lib/onboarding-task-generation'
import { createToast } from 'vercel-toast'
import prisma from '@/db'

// ─── Feature flags ───────────────────────────────────────────────────────────
// Flip to true when ready to show the Tasks column and task panel
const SHOW_TASKS = false

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
})

// ─── Types ────────────────────────────────────────────────────────────────────

type OnboardingRecord = Prisma.OnboardingRecordGetPayload<{
  include: {
    manager: { include: { deelEmployee: true } }
    tasks: { select: { id: true; completed: true; dueDate: true } }
  }
}>

// ─── Server functions ─────────────────────────────────────────────────────────

const getOnboardingRecords = createOrgChartFn({
  method: 'GET',
}).handler(async () => {
  return await prisma.onboardingRecord.findMany({
    include: {
      manager: { include: { deelEmployee: true } },
      tasks: { select: { id: true, completed: true, dueDate: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
})

const getManagersForPicker = createOrgChartFn({
  method: 'GET',
}).handler(async () => {
  return await prisma.deelEmployee.findMany({
    where: { directReports: { some: {} } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      title: true,
      team: true,
      employee: { select: { id: true } },
    },
    orderBy: { firstName: 'asc' },
  })
})

const getDeelTeams = createOrgChartFn({
  method: 'GET',
}).handler(async () => {
  const results = await prisma.deelEmployee.findMany({
    select: { team: true },
    distinct: ['team'],
    orderBy: { team: 'asc' },
  })
  return results.map((r) => r.team)
})

const getEmployeesForPicker = createOrgChartFn({
  method: 'GET',
}).handler(async () => {
  return await prisma.deelEmployee.findMany({
    where: { firstName: { not: '' } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      title: true,
      team: true,
    },
    orderBy: { firstName: 'asc' },
    take: 500,
  })
})

const createOnboardingRecord = createAdminFn({
  method: 'POST',
})
  .inputValidator(
    (d: {
      name: string
      role: string
      team: string
      startDate?: string
      location?: string
      quarter?: string
      referral: boolean
      referredBy?: string
      managerId?: string
      contractType?: string
      notes?: string
    }) => d,
  )
  .handler(async ({ data }) => {
    const record = await prisma.onboardingRecord.create({
      data: {
        name: data.name,
        role: data.role,
        team: data.team,
        startDate: data.startDate
          ? new Date(`${data.startDate}T12:00:00`)
          : undefined,
        location: data.location || undefined,
        quarter: data.quarter || undefined,
        referral: data.referral,
        referredBy: data.referredBy || undefined,
        managerId: data.managerId || undefined,
        contractType: data.contractType || undefined,
        notes: data.notes || undefined,
      },
      include: {
        manager: { include: { deelEmployee: true } },
        tasks: { select: { id: true, completed: true, dueDate: true } },
      },
    })

    await generateOnboardingTasks(record.id, 'offer_accepted', {
      role: record.role,
      location: record.location,
      startDate: record.startDate,
    })

    return record
  })

const updateOnboardingStatus = createAdminFn({
  method: 'POST',
})
  .inputValidator((d: { id: string; status: OnboardingStatus }) => d)
  .handler(async ({ data }) => {
    const record = await prisma.onboardingRecord.update({
      where: { id: data.id },
      data: { status: data.status },
    })

    await syncTasksToStatus(record.id, data.status, {
      role: record.role,
      location: record.location,
      startDate: record.startDate,
    })

    return record
  })

const updateOnboardingRecord = createAdminFn({
  method: 'POST',
})
  .inputValidator(
    (d: {
      id: string
      name?: string
      role?: string
      team?: string
      startDate?: string | null
      location?: string | null
      quarter?: string | null
      referral?: boolean
      referredBy?: string | null
      managerId?: string | null
      contractType?: string | null
      laptopStatus?: string | null
      laptopEta?: string | null
      welcomeCallDate?: string | null
      notes?: string | null
    }) => d,
  )
  .handler(async ({ data }) => {
    const { id, ...fields } = data
    const updateData: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined) continue
      if (key === 'startDate') {
        updateData[key] = value ? new Date(`${value}T12:00:00`) : null
      } else if (key === 'laptopEta' || key === 'welcomeCallDate') {
        updateData[key] = value ? new Date(value as string) : null
      } else {
        updateData[key] = value
      }
    }

    const record = await prisma.onboardingRecord.update({
      where: { id },
      data: updateData,
    })

    // Recalculate task due dates when start date changes
    if (fields.startDate !== undefined && record.startDate) {
      await recalculateTaskDueDates(id, record.startDate)
    }

    // Re-sync conditional tasks when role or location changes
    if (fields.role !== undefined || fields.location !== undefined) {
      await syncTasksToStatus(id, record.status, {
        role: record.role,
        location: record.location,
        startDate: record.startDate,
      })
    }

    return record
  })

const deleteOnboardingRecord = createAdminFn({
  method: 'POST',
})
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await prisma.onboardingRecord.delete({ where: { id: data.id } })
    return { success: true }
  })

const getOnboardingTasks = createOrgChartFn({
  method: 'GET',
})
  .inputValidator((d: { recordId: string }) => d)
  .handler(async ({ data }) => {
    return await prisma.onboardingTask.findMany({
      where: { onboardingRecordId: data.recordId },
      orderBy: [{ dueDate: 'asc' }],
    })
  })

const completeOnboardingTask = createAdminFn({
  method: 'POST',
})
  .inputValidator((d: { taskId: string; completed: boolean }) => d)
  .handler(async ({ data, context }) => {
    return await prisma.onboardingTask.update({
      where: { id: data.taskId },
      data: {
        completed: data.completed,
        completedAt: data.completed ? new Date() : null,
        completedByUserId: data.completed ? context.user.id : null,
      },
    })
  })

const importOnboardingRecords = createAdminFn({
  method: 'POST',
})
  .inputValidator(
    (d: {
      items: Array<{
        name: string
        role: string
        team: string
        startDate?: string | null
        location?: string | null
        quarter?: string | null
        referral: boolean
        referredBy?: string | null
        contractType?: string | null
        status?: string | null
        laptopStatus?: string | null
        welcomeCallDate?: string | null
        managerName?: string | null
        notes?: string | null
      }>
    }) => d,
  )
  .handler(async ({ data }) => {
    let created = 0
    let updated = 0
    const errors: string[] = []

    // Batch-resolve all unique manager names upfront
    const uniqueManagerNames = [
      ...new Set(
        data.items
          .map((i) => i.managerName?.trim())
          .filter((n): n is string => !!n),
      ),
    ]
    const managerIdByName = new Map<string, string | null>()
    if (uniqueManagerNames.length > 0) {
      const deelEmployees = await prisma.deelEmployee.findMany({
        select: {
          firstName: true,
          lastName: true,
          employee: { select: { id: true } },
        },
      })
      for (const name of uniqueManagerNames) {
        const parts = name.split(/\s+/)
        const fullMatch =
          parts.length >= 2
            ? deelEmployees.find(
                (d) =>
                  d.employee?.id &&
                  d.firstName.toLowerCase() === parts[0].toLowerCase() &&
                  d.lastName.toLowerCase() ===
                    parts.slice(1).join(' ').toLowerCase(),
              )
            : null
        const firstNameMatch = !fullMatch
          ? deelEmployees.find(
              (d) =>
                d.employee?.id &&
                d.firstName.toLowerCase() === parts[0].toLowerCase(),
            )
          : null
        managerIdByName.set(
          name.toLowerCase(),
          fullMatch?.employee?.id ?? firstNameMatch?.employee?.id ?? null,
        )
      }
    }

    for (const item of data.items) {
      try {
        const managerId = item.managerName
          ? (managerIdByName.get(item.managerName.trim().toLowerCase()) ?? null)
          : null

        // Map status string to enum
        const status = (item.status as OnboardingStatus) ?? 'offer_accepted'

        const recordData = {
          name: item.name.trim(),
          role: item.role,
          team: item.team,
          startDate: item.startDate
            ? new Date(`${item.startDate}T12:00:00`)
            : null,
          location: item.location || null,
          quarter: item.quarter || null,
          referral: item.referral,
          referredBy: item.referral ? item.referredBy || null : null,
          contractType: item.contractType || null,
          status,
          laptopStatus: item.laptopStatus || 'Need to order',
          welcomeCallDate: item.welcomeCallDate
            ? new Date(`${item.welcomeCallDate}T12:00:00`)
            : null,
          managerId,
          notes: item.notes || null,
        }

        // Use a serializable transaction to prevent race conditions on concurrent imports
        const { record, isUpdate, previousStatus, previousStartDate } =
          await prisma.$transaction(async (tx) => {
            const existing = await tx.onboardingRecord.findFirst({
              where: {
                name: { equals: item.name.trim(), mode: 'insensitive' },
              },
            })

            if (existing) {
              const updatedRecord = await tx.onboardingRecord.update({
                where: { id: existing.id },
                data: recordData,
              })
              return {
                record: updatedRecord,
                isUpdate: true,
                previousStatus: existing.status,
                previousStartDate: existing.startDate,
              }
            } else {
              const newRecord = await tx.onboardingRecord.create({
                data: recordData,
              })
              return {
                record: newRecord,
                isUpdate: false,
                previousStatus: null,
                previousStartDate: null,
              }
            }
          })

        if (isUpdate) {
          if (status !== previousStatus) {
            await syncTasksToStatus(record.id, status, {
              role: record.role,
              location: record.location,
              startDate: record.startDate,
            })
          }
          if (
            record.startDate &&
            previousStartDate?.getTime() !== record.startDate.getTime()
          ) {
            await recalculateTaskDueDates(record.id, record.startDate)
          }
          updated++
        } else {
          // Generate tasks for new records
          await generateOnboardingTasks(record.id, 'offer_accepted', {
            role: record.role,
            location: record.location,
            startDate: record.startDate,
          })
          if (
            status === 'contract_signed' ||
            status === 'provisioned' ||
            status === 'started'
          ) {
            await generateOnboardingTasks(record.id, 'contract_signed', {
              role: record.role,
              location: record.location,
              startDate: record.startDate,
            })
          }
          created++
        }
      } catch (error) {
        errors.push(
          `${item.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
      }
    }

    return { created, updated, errors }
  })

// Phase logic, formatDate, STATUS_CONFIG, STATUS_OPTIONS imported from @/lib/onboarding-utils

// ─── Shared sortable header ───────────────────────────────────────────────────

function SortableHeader({
  column,
  label,
}: {
  column: import('@tanstack/react-table').Column<any>
  label: string
}) {
  const sorted = column.getIsSorted()
  return (
    <button
      className="flex items-center gap-1 hover:opacity-70"
      onClick={() => column.toggleSorting(sorted === 'asc')}
    >
      {label}
      {sorted === 'asc' ? (
        <ArrowUp className="h-3 w-3" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  )
}

// ─── Column definitions ──────────────────────────────────────────────────────

const columns: ColumnDef<OnboardingRecord>[] = [
  {
    id: 'expand',
    header: '',
    cell: ({ row }) => (
      <button
        className="flex items-center hover:opacity-70"
        onClick={() => row.toggleExpanded()}
      >
        {row.getIsExpanded() ? (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500" />
        )}
      </button>
    ),
    size: 32,
  },
  {
    id: 'name',
    header: ({ column }) => <SortableHeader column={column} label="Name" />,
    accessorKey: 'name',
    cell: ({ row, getValue }) => (
      <span className={row.getIsExpanded() ? '' : 'font-medium'}>
        {getValue() as string}
      </span>
    ),
  },
  {
    accessorKey: 'startDate',
    header: ({ column }) => (
      <SortableHeader column={column} label="Start Date" />
    ),
    cell: ({ getValue }) => formatDate(getValue() as Date | null),
    sortingFn: 'datetime',
  },
  {
    accessorKey: 'team',
    header: ({ column }) => <SortableHeader column={column} label="Team" />,
    cell: ({ row, getValue }) => (
      <span className={row.getIsExpanded() ? '' : 'text-gray-700'}>
        {getValue() as string}
      </span>
    ),
    filterFn: 'equals',
  },
  {
    accessorKey: 'role',
    header: ({ column }) => <SortableHeader column={column} label="Role" />,
    cell: ({ row, getValue }) => (
      <span className={row.getIsExpanded() ? '' : 'text-gray-700'}>
        {getValue() as string}
      </span>
    ),
  },
  {
    id: 'manager',
    header: 'Manager',
    accessorFn: (row) =>
      row.manager?.deelEmployee
        ? getFullName(
            row.manager.deelEmployee.firstName,
            row.manager.deelEmployee.lastName,
          )
        : '—',
    cell: ({ row, getValue }) => (
      <span className={row.getIsExpanded() ? '' : 'text-gray-700'}>
        {getValue() as string}
      </span>
    ),
  },
  {
    id: 'phase',
    header: ({ column }) => <SortableHeader column={column} label="Phase" />,
    accessorFn: (row) => (row.startDate ? getPhase(row.startDate).label : ''),
    cell: ({ row }) => {
      if (!row.original.startDate)
        return <span className="text-xs text-gray-400">—</span>
      const phase = getPhase(row.original.startDate)
      const expanded = row.getIsExpanded()
      return (
        <span
          className={`inline-flex items-center rounded-full ${expanded ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs'} ${phase.badgeClass}`}
        >
          {phase.label}
        </span>
      )
    },
    filterFn: 'equals',
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.startDate
        ? getPhase(rowA.original.startDate).sortOrder
        : 99
      const b = rowB.original.startDate
        ? getPhase(rowB.original.startDate).sortOrder
        : 99
      return a - b
    },
  },
  {
    id: 'statusFilter',
    accessorKey: 'status',
    enableHiding: true,
    filterFn: 'equals',
  },
]

// ─── Expanded row detail ─────────────────────────────────────────────────────

function ReadOnlyField({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div>
      <span className="text-gray-500">{label}</span>
      <div className="mt-1 rounded-md bg-white px-3 py-1.5 text-sm text-gray-800">
        {value || '—'}
      </div>
    </div>
  )
}

function ExpandedRowDetail({
  record,
  editing,
  onSave,
  onCancel,
}: {
  record: OnboardingRecord
  editing: boolean
  onSave: (id: string, updates: Record<string, unknown>) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState({
    name: record.name,
    role: record.role,
    team: record.team,
    startDate: record.startDate
      ? new Date(record.startDate).toISOString().split('T')[0]
      : '',
    location: record.location ?? '',
    contractType: record.contractType ?? '',
    quarter: record.quarter ?? '',
    referral: record.referral,
    referredBy: record.referredBy ?? '',
    laptopStatus: record.laptopStatus ?? '',
    laptopEta: record.laptopEta
      ? new Date(record.laptopEta).toISOString().split('T')[0]
      : '',
    welcomeCallDate: record.welcomeCallDate
      ? new Date(record.welcomeCallDate).toISOString().split('T')[0]
      : '',
    notes: record.notes ?? '',
  })

  const set =
    (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft((d) => ({ ...d, [field]: e.target.value }))

  if (!editing) {
    return (
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 px-10 py-4 text-sm md:grid-cols-4 [&_button[role=combobox]]:bg-white [&_input]:bg-white">
        <ReadOnlyField label="Contract type" value={record.contractType} />
        <ReadOnlyField label="Location" value={record.location} />
        <ReadOnlyField label="Quarter offered" value={record.quarter} />
        <div>
          <span className="text-gray-500">Referral</span>
          <div className="mt-1 rounded-md bg-white px-3 py-1.5 text-sm text-gray-800">
            {record.referral ? (
              <span className="font-medium text-green-700">
                Yes{record.referredBy ? ` (${record.referredBy})` : ''}
              </span>
            ) : (
              'No'
            )}
          </div>
        </div>
        <div>
          <div className="flex gap-4">
            <div>
              <span className="text-gray-500">Laptop</span>
              <div className="mt-1">
                <Select
                  value={record.laptopStatus ?? ''}
                  onValueChange={(v) =>
                    onSave(record.id, { laptopStatus: v || null })
                  }
                >
                  <SelectTrigger className="h-8 w-36 text-xs">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Need to order" className="text-xs">
                      Need to order
                    </SelectItem>
                    <SelectItem value="Ordered" className="text-xs">
                      Ordered
                    </SelectItem>
                    <SelectItem value="Delivered" className="text-xs">
                      Delivered
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <span className="text-gray-500">Est. delivery</span>
              <div className="mt-1">
                <Input
                  type="date"
                  className="h-8 w-36 text-xs"
                  defaultValue={
                    record.laptopEta
                      ? new Date(record.laptopEta).toISOString().split('T')[0]
                      : ''
                  }
                  onBlur={(e) => {
                    const current = record.laptopEta
                      ? new Date(record.laptopEta).toISOString().split('T')[0]
                      : ''
                    if (e.target.value !== current)
                      onSave(record.id, { laptopEta: e.target.value || null })
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        <div>
          <span className="text-gray-500">Welcome call</span>
          <div className="mt-1">
            <Input
              type="date"
              className="h-8 w-36 text-xs"
              defaultValue={
                record.welcomeCallDate
                  ? new Date(record.welcomeCallDate).toISOString().split('T')[0]
                  : ''
              }
              onBlur={(e) => {
                const current = record.welcomeCallDate
                  ? new Date(record.welcomeCallDate).toISOString().split('T')[0]
                  : ''
                if (e.target.value !== current)
                  onSave(record.id, { welcomeCallDate: e.target.value || null })
              }}
            />
          </div>
        </div>
        {record.notes && (
          <div className="col-span-full">
            <span className="text-gray-500">Notes</span>
            <div className="mt-1 rounded-md bg-white px-3 py-1.5 text-sm text-gray-800">
              {record.notes}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="px-10 py-4 text-sm [&_button[role=combobox]]:bg-white [&_input]:bg-white [&_textarea]:bg-white">
      <div className="grid grid-cols-3 gap-x-6 gap-y-4">
        <div>
          <Label className="text-xs text-gray-500">Name</Label>
          <Input
            className="mt-1 h-9"
            value={draft.name}
            onChange={set('name')}
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500">Role</Label>
          <Input
            className="mt-1 h-9"
            value={draft.role}
            onChange={set('role')}
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500">Team</Label>
          <Input
            className="mt-1 h-9"
            value={draft.team}
            onChange={set('team')}
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500">Start date</Label>
          <Input
            type="date"
            className="mt-1 h-9"
            value={draft.startDate}
            onChange={set('startDate')}
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500">Location</Label>
          <Input
            className="mt-1 h-9"
            value={draft.location}
            onChange={set('location')}
            placeholder="e.g. London, UK (GMT)"
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500">Contract type</Label>
          <Select
            value={draft.contractType}
            onValueChange={(v) => setDraft((d) => ({ ...d, contractType: v }))}
          >
            <SelectTrigger className="mt-1 h-9">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Direct Employee">Direct Employee</SelectItem>
              <SelectItem value="EOR">EOR</SelectItem>
              <SelectItem value="Contractor">Contractor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-gray-500">Quarter offered</Label>
          <Input
            className="mt-1 h-9"
            value={draft.quarter}
            onChange={set('quarter')}
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500">Referral</Label>
          <div className="mt-1 flex items-center gap-2">
            <Select
              value={draft.referral ? 'yes' : 'no'}
              onValueChange={(v) =>
                setDraft((d) => ({
                  ...d,
                  referral: v === 'yes',
                  referredBy: v === 'no' ? '' : d.referredBy,
                }))
              }
            >
              <SelectTrigger className="h-9 w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
              </SelectContent>
            </Select>
            {draft.referral && (
              <Input
                className="h-9 flex-1"
                placeholder="Referred by"
                value={draft.referredBy}
                onChange={set('referredBy')}
              />
            )}
          </div>
        </div>
        <div>
          <Label className="text-xs text-gray-500">Laptop</Label>
          <div className="mt-1 flex items-center gap-2">
            <Select
              value={draft.laptopStatus}
              onValueChange={(v) =>
                setDraft((d) => ({ ...d, laptopStatus: v }))
              }
            >
              <SelectTrigger className="h-9 w-40">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Need to order">Need to order</SelectItem>
                <SelectItem value="Ordered">Ordered</SelectItem>
                <SelectItem value="Delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              className="h-9 flex-1"
              value={draft.laptopEta}
              onChange={set('laptopEta')}
              title="ETA"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-gray-500">Welcome call</Label>
          <Input
            type="date"
            className="mt-1 h-9"
            value={draft.welcomeCallDate}
            onChange={set('welcomeCallDate')}
          />
        </div>
        <div className="col-span-full">
          <Label className="text-xs text-gray-500">Notes</Label>
          <textarea
            className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring mt-1 flex min-h-[60px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            value={draft.notes}
            onChange={set('notes')}
            placeholder="Any additional context…"
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2 border-t pt-3">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => {
            onSave(record.id, {
              name: draft.name,
              role: draft.role,
              team: draft.team,
              startDate: draft.startDate || null,
              location: draft.location || null,
              contractType: draft.contractType || null,
              quarter: draft.quarter || null,
              referral: draft.referral,
              referredBy: draft.referral ? draft.referredBy || null : null,
              laptopStatus: draft.laptopStatus || null,
              laptopEta: draft.laptopEta || null,
              welcomeCallDate: draft.welcomeCallDate || null,
              notes: draft.notes || null,
            })
          }}
        >
          Save changes
        </Button>
      </div>
    </div>
  )
}

// ─── Add hire dialog ──────────────────────────────────────────────────────────

function AddHireDialog({
  onSuccess,
}: {
  onSuccess: (newRecordId?: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [referral, setReferral] = useState(false)
  const [referralSearch, setReferralSearch] = useState('')
  const [managerSearch, setManagerSearch] = useState('')
  const [teamSearch, setTeamSearch] = useState('')

  const { data: managers = [] } = useQuery({
    queryKey: ['managers-picker'],
    queryFn: getManagersForPicker,
    enabled: open,
  })

  const { data: deelTeams = [] } = useQuery({
    queryKey: ['deel-teams'],
    queryFn: getDeelTeams,
    enabled: open,
  })

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['employees-picker'],
    queryFn: getEmployeesForPicker,
    enabled: open && referral,
  })

  const [form, setForm] = useState({
    name: '',
    role: '',
    team: '',
    startDate: '',
    location: '',
    quarter: getCurrentQuarter(),
    referredBy: '',
    managerId: '',
    contractType: '',
    notes: '',
  })

  const set =
    (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.role || !form.team) {
      createToast('Name, role, and team are required', {
        type: 'error',
        timeout: 4000,
      })
      return
    }
    setSaving(true)
    try {
      const newRecord = await createOnboardingRecord({
        data: {
          ...form,
          referral,
          referredBy: referral ? form.referredBy : undefined,
        },
      })
      createToast(`${form.name} added to onboarding`, {
        type: 'success',
        timeout: 3000,
      })
      setOpen(false)
      setForm({
        name: '',
        role: '',
        team: '',
        startDate: '',
        location: '',
        quarter: getCurrentQuarter(),
        referredBy: '',
        managerId: '',
        contractType: '',
        notes: '',
      })
      setReferral(false)
      setReferralSearch('')
      setManagerSearch('')
      setTeamSearch('')
      onSuccess(newRecord?.id)
    } catch {
      createToast('Failed to save — please try again', {
        type: 'error',
        timeout: 4000,
      })
    } finally {
      setSaving(false)
    }
  }

  const quarterOptions = getQuarterOptions()

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 h-4 w-4" />
        Add hire
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add new hire</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Full name *</Label>
                <Input
                  placeholder="e.g. Sofia Reyes"
                  value={form.name}
                  onChange={set('name')}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role *</Label>
                <Input
                  placeholder="e.g. Product Engineer"
                  value={form.role}
                  onChange={set('role')}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Team *</Label>
                <div className="relative">
                  <Input
                    placeholder="Type to search teams…"
                    value={teamSearch || form.team}
                    onChange={(e) => {
                      setTeamSearch(e.target.value)
                      setForm((f) => ({ ...f, team: e.target.value }))
                    }}
                  />
                  {teamSearch && (
                    <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-white shadow-lg">
                      {deelTeams
                        .filter((t) =>
                          t.toLowerCase().includes(teamSearch.toLowerCase()),
                        )
                        .slice(0, 10)
                        .map((t) => (
                          <button
                            key={t}
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                            onClick={() => {
                              setForm((f) => ({ ...f, team: t }))
                              setTeamSearch('')
                            }}
                          >
                            {t}
                          </button>
                        ))}
                      {deelTeams.filter((t) =>
                        t.toLowerCase().includes(teamSearch.toLowerCase()),
                      ).length === 0 && (
                        <p className="px-3 py-2 text-sm text-gray-400">
                          No matches — custom value will be used
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Start date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={set('startDate')}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Location / Timezone</Label>
                <Input
                  placeholder="e.g. London, UK (GMT)"
                  value={form.location}
                  onChange={set('location')}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Quarter offered</Label>
                <Select
                  value={form.quarter}
                  onValueChange={(v) => setForm((f) => ({ ...f, quarter: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select quarter" />
                  </SelectTrigger>
                  <SelectContent>
                    {quarterOptions.map((q) => (
                      <SelectItem key={q.value} value={q.value}>
                        {q.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Manager</Label>
                <div className="relative">
                  <Input
                    placeholder="Type to search managers…"
                    value={
                      managerSearch ||
                      (form.managerId
                        ? getFullName(
                            managers.find(
                              (m) => m.employee?.id === form.managerId,
                            )?.firstName,
                            managers.find(
                              (m) => m.employee?.id === form.managerId,
                            )?.lastName,
                          )
                        : '')
                    }
                    onChange={(e) => {
                      setManagerSearch(e.target.value)
                      if (!e.target.value)
                        setForm((f) => ({ ...f, managerId: '' }))
                    }}
                  />
                  {managerSearch && !form.managerId && (
                    <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-white shadow-lg">
                      {managers
                        .filter((m) => {
                          if (!m.employee?.id) return false
                          const name = getFullName(
                            m.firstName,
                            m.lastName,
                          ).toLowerCase()
                          return name.includes(managerSearch.toLowerCase())
                        })
                        .slice(0, 10)
                        .map((m) => {
                          const name = getFullName(m.firstName, m.lastName)
                          return (
                            <button
                              key={m.id}
                              type="button"
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                              onClick={() => {
                                setForm((f) => ({
                                  ...f,
                                  managerId: m.employee!.id,
                                }))
                                setManagerSearch('')
                              }}
                            >
                              {name} — {m.team}
                            </button>
                          )
                        })}
                      {managers.filter(
                        (m) =>
                          m.employee?.id &&
                          getFullName(m.firstName, m.lastName)
                            .toLowerCase()
                            .includes(managerSearch.toLowerCase()),
                      ).length === 0 && (
                        <p className="px-3 py-2 text-sm text-gray-400">
                          No matches
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Contract type</Label>
                <Select
                  value={form.contractType}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, contractType: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Direct Employee">
                      Direct Employee
                    </SelectItem>
                    <SelectItem value="EOR">EOR</SelectItem>
                    <SelectItem value="Contractor">Contractor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Referral?</Label>
                <Select
                  value={referral ? 'yes' : 'no'}
                  onValueChange={(v) => setReferral(v === 'yes')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {referral && (
              <div className="space-y-1.5">
                <Label>Referred by</Label>
                <div className="relative">
                  <Input
                    placeholder="Type to search employees…"
                    value={referralSearch || form.referredBy}
                    onChange={(e) => {
                      setReferralSearch(e.target.value)
                      if (!e.target.value)
                        setForm((f) => ({ ...f, referredBy: '' }))
                    }}
                  />
                  {referralSearch && !form.referredBy && (
                    <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-white shadow-lg">
                      {allEmployees
                        .filter((e) => {
                          const name = getFullName(
                            e.firstName,
                            e.lastName,
                          ).toLowerCase()
                          return name.includes(referralSearch.toLowerCase())
                        })
                        .slice(0, 10)
                        .map((e) => {
                          const name = getFullName(e.firstName, e.lastName)
                          return (
                            <button
                              key={e.id}
                              type="button"
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                              onClick={() => {
                                setForm((f) => ({ ...f, referredBy: name }))
                                setReferralSearch('')
                              }}
                            >
                              {name} — {e.team}
                            </button>
                          )
                        })}
                      {allEmployees.filter((e) =>
                        getFullName(e.firstName, e.lastName)
                          .toLowerCase()
                          .includes(referralSearch.toLowerCase()),
                      ).length === 0 && (
                        <p className="px-3 py-2 text-sm text-gray-400">
                          No matches
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <textarea
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Any additional context…"
                value={form.notes}
                onChange={set('notes')}
              />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Add hire'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Section table ───────────────────────────────────────────────────────────

type ExpandColors = { bg: string; border: string; text: string; bgHalf: string }

const SECTION_EXPAND_COLORS: Record<string, ExpandColors> = {
  '#006FDC': {
    bg: 'bg-blue-50',
    border: 'border-l-blue-500',
    text: 'text-blue-500',
    bgHalf: 'bg-blue-50/50',
  },
  '#FF4E00': {
    bg: 'bg-orange-50',
    border: 'border-l-orange-500',
    text: 'text-orange-500',
    bgHalf: 'bg-orange-50/50',
  },
  '#F99B00': {
    bg: 'bg-amber-50',
    border: 'border-l-amber-500',
    text: 'text-amber-600',
    bgHalf: 'bg-amber-50/50',
  },
  '#78A700': {
    bg: 'bg-lime-50',
    border: 'border-l-lime-600',
    text: 'text-lime-700',
    bgHalf: 'bg-lime-50/50',
  },
}

function OnboardingSection({
  title,
  color,
  data,
  globalFilter,
  columnFilters,
  highlightedRecordId,
  editingRecordId,
  expandedRecordId,
  onExpandRecord,
  onStatusChange,
  onSaveRecord,
  onCancelEdit,
  onDeleteRecord,
  onEditRecord,
  onOpenTasks,
}: {
  title: string
  color: string
  data: OnboardingRecord[]
  globalFilter: string
  columnFilters: ColumnFiltersState
  highlightedRecordId: string | null
  editingRecordId: string | null
  expandedRecordId: string | null
  onExpandRecord: (id: string | null) => void
  onStatusChange: (id: string, status: OnboardingStatus) => void
  onSaveRecord: (id: string, updates: Record<string, unknown>) => void
  onCancelEdit: () => void
  onDeleteRecord: (id: string, name: string) => void
  onEditRecord: (id: string) => void
  onOpenTasks: (id: string, name: string) => void
}) {
  const ec = SECTION_EXPAND_COLORS[color] ?? SECTION_EXPAND_COLORS['#006FDC']
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'startDate', desc: false },
  ])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnFilters },
    onSortingChange: setSorting,
    initialState: { columnVisibility: { statusFilter: false } },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    globalFilterFn: 'includesString',
  })

  // Sync expanded state from parent
  // eslint-disable-next-line react-hooks/exhaustive-deps -- table is a new object every render; including it causes an infinite loop
  useEffect(() => {
    table.getRowModel().rows.forEach((row) => {
      const shouldExpand = row.original.id === expandedRecordId
      if (row.getIsExpanded() !== shouldExpand) row.toggleExpanded()
    })
  }, [expandedRecordId, data])

  const filteredRowCount = table.getFilteredRowModel().rows.length

  if (data.length === 0) {
    return (
      <div>
        <h2 className="mb-2 text-lg font-semibold" style={{ color }}>
          {title}
          <span className="ml-2 text-sm font-normal text-gray-500">(0)</span>
        </h2>
        <p
          className="text-muted-foreground rounded-md py-6 text-center text-sm"
          style={{ border: `1px solid ${color}33` }}
        >
          No hires in this phase
        </p>
      </div>
    )
  }

  const widths: Record<string, string> = {
    expand: '3%',
    name: '15%',
    startDate: '10%',
    team: '12%',
    role: '15%',
    manager: '13%',
    phase: '10%',
  }

  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold" style={{ color }}>
        {title}
        <span className="ml-2 text-sm font-normal text-gray-500">
          ({filteredRowCount}
          {filteredRowCount !== data.length ? ` of ${data.length}` : ''})
        </span>
      </h2>
      <div className="rounded-md" style={{ border: `1px solid ${color}33` }}>
        <Table style={{ tableLayout: 'fixed' }}>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow
                key={hg.id}
                className="text-base font-bold"
                style={{ backgroundColor: `${color}1A` }}
              >
                {hg.headers.map((h) => (
                  <Fragment key={h.id}>
                    <TableHead style={{ width: widths[h.column.id] }}>
                      {h.isPlaceholder
                        ? null
                        : flexRender(h.column.columnDef.header, h.getContext())}
                    </TableHead>
                    {h.column.id === 'manager' && (
                      <TableHead key="status-header" style={{ width: '13%' }}>
                        Status
                      </TableHead>
                    )}
                    {h.column.id === 'phase' && SHOW_TASKS && (
                      <TableHead key="tasks-header" style={{ width: '5%' }}>
                        Tasks
                      </TableHead>
                    )}
                    {h.column.id === 'phase' && (
                      <TableHead
                        key="actions-header"
                        style={{ width: SHOW_TASKS ? '4%' : '9%' }}
                      ></TableHead>
                    )}
                  </Fragment>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <Fragment key={row.id}>
                <TableRow
                  className={`cursor-pointer !transition-none ${
                    highlightedRecordId === row.original.id &&
                    !row.getIsExpanded()
                      ? `${ec.bg} border-l-4 ${ec.border}`
                      : ''
                  } ${row.getIsExpanded() ? (editingRecordId === row.original.id ? 'border-l-4 border-l-amber-400 bg-amber-50 text-base font-bold text-amber-700 hover:bg-amber-50 [&_td]:bg-amber-50' : `${ec.bg} hover:${ec.bg} border-l-4 ${ec.border} text-base font-bold ${ec.text} [&_td]:${ec.bg}`) : ''}`}
                  onClick={() => {
                    const wasExpanded = row.getIsExpanded()
                    onExpandRecord(wasExpanded ? null : row.original.id)
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <Fragment key={cell.id}>
                      <TableCell>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                      {cell.column.id === 'manager' && (
                        <TableCell
                          key={`${cell.id}-status`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Select
                            value={row.original.status}
                            onValueChange={(v) =>
                              onStatusChange(
                                row.original.id,
                                v as OnboardingStatus,
                              )
                            }
                          >
                            <SelectTrigger
                              className={
                                row.getIsExpanded()
                                  ? 'h-8 w-44 text-sm'
                                  : 'h-7 w-40 text-xs'
                              }
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((s) => (
                                <SelectItem
                                  key={s}
                                  value={s}
                                  className={
                                    row.getIsExpanded() ? 'text-sm' : 'text-xs'
                                  }
                                >
                                  {STATUS_CONFIG[s].label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      )}
                      {cell.column.id === 'phase' && SHOW_TASKS && (
                        <TableCell
                          key={`${cell.id}-tasks`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(() => {
                            const tasks = row.original.tasks
                            const expanded = row.getIsExpanded()
                            if (!tasks || tasks.length === 0)
                              return (
                                <span
                                  className={
                                    expanded
                                      ? 'text-sm text-gray-400'
                                      : 'text-xs text-gray-400'
                                  }
                                >
                                  —
                                </span>
                              )
                            const done = tasks.filter((t) => t.completed).length
                            const total = tasks.length
                            const overdue = tasks.filter(
                              (t) =>
                                !t.completed &&
                                new Date(t.dueDate) < new Date(),
                            ).length
                            const cls =
                              done === total
                                ? 'bg-green-100 text-green-800'
                                : overdue > 0
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                            return (
                              <button
                                className={`inline-flex items-center rounded-full font-medium hover:opacity-80 ${expanded ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs'} ${cls}`}
                                onClick={() =>
                                  onOpenTasks(
                                    row.original.id,
                                    row.original.name,
                                  )
                                }
                              >
                                {done}/{total}
                              </button>
                            )
                          })()}
                        </TableCell>
                      )}
                      {cell.column.id === 'phase' && (
                        <TableCell
                          key={`${cell.id}-actions`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  onExpandRecord(row.original.id)
                                  onEditRecord(row.original.id)
                                }}
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() =>
                                  onDeleteRecord(
                                    row.original.id,
                                    row.original.name,
                                  )
                                }
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </Fragment>
                  ))}
                </TableRow>
                {row.getIsExpanded() && (
                  <TableRow
                    key={`${row.id}-detail`}
                    className={
                      editingRecordId === row.original.id
                        ? 'border-l-4 border-l-amber-400 bg-amber-50 hover:bg-amber-50'
                        : `${ec.bgHalf} hover:${ec.bgHalf} border-l-4 ${ec.border}`
                    }
                  >
                    <TableCell colSpan={columns.length + 3} className="p-0">
                      <ExpandedRowDetail
                        record={row.original}
                        editing={editingRecordId === row.original.id}
                        onSave={onSaveRecord}
                        onCancel={onCancelEdit}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function OnboardingPage() {
  const queryClient = useQueryClient()
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['onboarding-records'],
    queryFn: getOnboardingRecords,
  })

  const [globalFilter, setGlobalFilter] = useState('')
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [taskPanelRecord, setTaskPanelRecord] = useState<{
    id: string
    name: string
  } | null>(null)
  const [highlightedRecordId, setHighlightedRecordId] = useState<string | null>(
    null,
  )
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null)
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => {
    if (!highlightedRecordId) return
    const timer = setTimeout(() => setHighlightedRecordId(null), 5000)
    return () => clearTimeout(timer)
  }, [highlightedRecordId])

  const handleStatusChange = async (id: string, status: OnboardingStatus) => {
    try {
      await updateOnboardingStatus({ data: { id, status } })
      await queryClient.invalidateQueries({ queryKey: ['onboarding-records'] })
    } catch {
      createToast('Failed to update status', { type: 'error', timeout: 4000 })
    }
  }

  const handleSaveRecord = async (
    id: string,
    updates: Record<string, unknown>,
  ) => {
    try {
      await updateOnboardingRecord({ data: { id, ...updates } })
      await queryClient.invalidateQueries({ queryKey: ['onboarding-records'] })
      setEditingRecordId(null)
      createToast('Changes saved', { type: 'success', timeout: 2000 })
    } catch {
      createToast('Failed to save', { type: 'error', timeout: 4000 })
    }
  }

  const handleDeleteRecord = async (id: string, name: string) => {
    if (
      !window.confirm(`Delete ${name}? This will also remove all their tasks.`)
    )
      return
    try {
      await deleteOnboardingRecord({ data: { id } })
      await queryClient.invalidateQueries({ queryKey: ['onboarding-records'] })
      createToast(`${name} removed`, { type: 'success', timeout: 3000 })
    } catch {
      createToast('Failed to delete', { type: 'error', timeout: 4000 })
    }
  }

  const handleExpandRecord = useCallback((id: string | null) => {
    setExpandedRecordId(id)
    if (!id) setEditingRecordId(null)
  }, [])

  const refresh = useCallback(
    (newRecordId?: string) => {
      if (newRecordId) setHighlightedRecordId(newRecordId)
      queryClient.invalidateQueries({ queryKey: ['onboarding-records'] })
    },
    [queryClient],
  )

  // Phase summary counts
  const phaseCounts = records.reduce(
    (acc, record) => {
      if (!record.startDate) return acc
      const phase = getPhase(record.startDate).label
      acc[phase] = (acc[phase] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Onboarding</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Track every hire from offer acceptance through their first 30 days
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          {
            label: 'Pre-start',
            badgeClass: 'bg-[#006FDC]/15 text-[#006FDC] font-semibold',
          },
          {
            label: 'First Day',
            badgeClass: 'bg-[#FF4E00]/15 text-[#FF4E00] font-semibold',
          },
          {
            label: 'First Week',
            badgeClass: 'bg-[#F99B00]/15 text-[#F99B00] font-semibold',
          },
          {
            label: 'First 30 Days',
            badgeClass: 'bg-yellow-100 text-yellow-800 font-semibold',
          },
          {
            label: 'First 60 Days',
            badgeClass: 'bg-orange-100 text-orange-800 font-semibold',
          },
          {
            label: 'First 90 Days',
            badgeClass: 'bg-purple-100 text-purple-800 font-semibold',
          },
        ].map(({ label, badgeClass }) => {
          const count = phaseCounts[label] ?? 0
          if (count === 0) return null
          return (
            <span
              key={label}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ${badgeClass}`}
            >
              {label}
              <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-xs font-semibold">
                {count}
              </span>
            </span>
          )
        })}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search by name, role, team, or manager…"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-72"
          />
          <Select
            value={
              (columnFilters.find((f) => f.id === 'team')?.value as string) ??
              'all'
            }
            onValueChange={(v) => {
              setColumnFilters((prev) => [
                ...prev.filter((f) => f.id !== 'team'),
                ...(v !== 'all' ? [{ id: 'team', value: v }] : []),
              ])
            }}
          >
            <SelectTrigger className="h-9 w-40 text-xs">
              <SelectValue placeholder="All teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All teams
              </SelectItem>
              {[...new Set(records.map((r) => r.team))].sort().map((t) => (
                <SelectItem key={t} value={t} className="text-xs">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={
              (columnFilters.find((f) => f.id === 'phase')?.value as string) ??
              'all'
            }
            onValueChange={(v) => {
              setColumnFilters((prev) => [
                ...prev.filter((f) => f.id !== 'phase'),
                ...(v !== 'all' ? [{ id: 'phase', value: v }] : []),
              ])
            }}
          >
            <SelectTrigger className="h-9 w-40 text-xs">
              <SelectValue placeholder="All phases" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All phases
              </SelectItem>
              <SelectItem value="Pre-start" className="text-xs">
                Pre-start
              </SelectItem>
              <SelectItem value="First Day" className="text-xs">
                First Day
              </SelectItem>
              <SelectItem value="First Week" className="text-xs">
                First Week
              </SelectItem>
              <SelectItem value="First 30 Days" className="text-xs">
                First 30 Days
              </SelectItem>
              <SelectItem value="First 60 Days" className="text-xs">
                First 60 Days
              </SelectItem>
              <SelectItem value="First 90 Days" className="text-xs">
                First 90 Days
              </SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={
              (columnFilters.find((f) => f.id === 'statusFilter')
                ?.value as string) ?? 'all'
            }
            onValueChange={(v) => {
              setColumnFilters((prev) => [
                ...prev.filter((f) => f.id !== 'statusFilter'),
                ...(v !== 'all' ? [{ id: 'statusFilter', value: v }] : []),
              ])
            }}
          >
            <SelectTrigger className="h-9 w-40 text-xs">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All statuses
              </SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  {STATUS_CONFIG[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(globalFilter || columnFilters.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-gray-500 hover:text-gray-700"
              onClick={() => {
                setGlobalFilter('')
                setColumnFilters([])
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setImportOpen(true)}
          >
            <Upload className="mr-1.5 h-4 w-4" />
            Import CSV
          </Button>
          <AddHireDialog onSuccess={refresh} />
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-12 text-center text-sm">
          Loading…
        </div>
      ) : (
        <div className="space-y-8">
          {[
            {
              title: 'Active Onboardings',
              color: '#006FDC',
              data: records.filter((r) => {
                if (!r.startDate) return true
                return getPhase(r.startDate).label === 'Pre-start'
              }),
            },
            {
              title: 'First Day',
              color: '#FF4E00',
              data: records.filter((r) => {
                if (!r.startDate) return false
                return getPhase(r.startDate).label === 'First Day'
              }),
            },
            {
              title: 'First Week',
              color: '#F99B00',
              data: records.filter((r) => {
                if (!r.startDate) return false
                return getPhase(r.startDate).label === 'First Week'
              }),
            },
            {
              title: 'Started',
              color: '#78A700',
              data: records.filter((r) => {
                if (!r.startDate) return false
                const phase = getPhase(r.startDate).label
                return (
                  phase === 'First 30 Days' ||
                  phase === 'First 60 Days' ||
                  phase === 'First 90 Days'
                )
              }),
            },
          ].map((section) => (
            <OnboardingSection
              key={section.title}
              title={section.title}
              color={section.color}
              data={section.data}
              globalFilter={globalFilter}
              columnFilters={columnFilters}
              highlightedRecordId={highlightedRecordId}
              editingRecordId={editingRecordId}
              expandedRecordId={expandedRecordId}
              onExpandRecord={handleExpandRecord}
              onStatusChange={handleStatusChange}
              onSaveRecord={handleSaveRecord}
              onCancelEdit={() => setEditingRecordId(null)}
              onDeleteRecord={handleDeleteRecord}
              onEditRecord={setEditingRecordId}
              onOpenTasks={(id, name) => setTaskPanelRecord({ id, name })}
            />
          ))}
        </div>
      )}

      {SHOW_TASKS && taskPanelRecord && (
        <OnboardingTaskPanel
          open={!!taskPanelRecord}
          onOpenChange={(open) => {
            if (!open) setTaskPanelRecord(null)
          }}
          recordId={taskPanelRecord.id}
          recordName={taskPanelRecord.name}
          getOnboardingTasks={getOnboardingTasks}
          completeOnboardingTask={completeOnboardingTask}
        />
      )}

      <OnboardingImportPanel
        open={importOpen}
        onOpenChange={setImportOpen}
        existingNames={records.map((r) => r.name)}
        importFn={importOnboardingRecords}
        onSuccess={refresh}
      />
    </div>
  )
}
