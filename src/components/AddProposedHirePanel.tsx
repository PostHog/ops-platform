import { Button } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { AnyFieldApi, useForm } from '@tanstack/react-form'
import { createToast } from 'vercel-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { type Department, type Priority, type Prisma } from '@prisma/client'
import { getFullName, getQuarterOptions } from '@/lib/utils'
import OrgChartPanel from './OrgChartPanel'
import prisma from '@/db'
import { useMemo, useState } from 'react'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { createOrgChartFn } from '@/lib/auth-middleware'
import { Check, ChevronsUpDown, Pencil, X } from 'lucide-react'

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

const addProposedHire = createOrgChartFn({
  method: 'POST',
})
  .inputValidator(
    (d: {
      title: string
      managerId: string
      talentPartnerIds: string[]
      priority: Priority
      hiringProfile: string
      department: Department | null
      quarter: string | null
      quantity: number
    }) => d,
  )
  .handler(async ({ data }) => {
    return await prisma.$transaction(async (tx) => {
      return await Promise.all(
        Array.from({ length: data.quantity }, () =>
          tx.proposedHire.create({
            data: {
              title: data.title,
              managerId: data.managerId,
              priority: data.priority,
              hiringProfile: data.hiringProfile,
              department: data.department ?? undefined,
              quarter: data.quarter ?? undefined,
              talentPartners: {
                connect: data.talentPartnerIds.map((id) => ({ id })),
              },
            },
            include: {
              manager: {
                include: { deelEmployee: true },
              },
              talentPartners: {
                include: { deelEmployee: true },
              },
            },
          }),
        ),
      )
    })
  })

export const updateProposedHire = createOrgChartFn({
  method: 'POST',
})
  .inputValidator(
    (d: {
      id: string
      title: string
      managerId: string
      talentPartnerIds: string[]
      priority: Priority
      hiringProfile: string
      department: Department | null
      quarter: string | null
    }) => d,
  )
  .handler(async ({ data }) => {
    return await prisma.proposedHire.update({
      where: { id: data.id },
      data: {
        title: data.title,
        manager: { connect: { id: data.managerId } },
        priority: data.priority,
        hiringProfile: data.hiringProfile,
        department: data.department ?? null,
        quarter: data.quarter ?? null,
        talentPartners: {
          set: data.talentPartnerIds.map((id) => ({ id })),
        },
      },
      include: {
        manager: {
          include: {
            deelEmployee: true,
          },
        },
        talentPartners: {
          include: {
            deelEmployee: true,
          },
        },
      },
    })
  })

export const deleteProposedHire = createOrgChartFn({
  method: 'POST',
})
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    return await prisma.proposedHire.delete({ where: { id: data.id } })
  })

function FieldInfo({ field }: { field: AnyFieldApi }) {
  return (
    <div className="text-sm text-red-600">
      {field.state.meta.isTouched && !field.state.meta.isValid ? (
        <em>{field.state.meta.errors.map((err) => err.message).join(',')}</em>
      ) : null}
      {field.state.meta.isValidating ? 'Validating...' : null}
    </div>
  )
}

function AddProposedHirePanel({
  employees,
  proposedHire,
  onClose,
  buttonType = 'default',
}: {
  employees: Array<DeelEmployee>
  proposedHire?: ProposedHire
  onClose?: () => void
  buttonType?: 'default' | 'icon'
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const editingExisting = !!proposedHire

  const form = useForm({
    defaultValues: editingExisting
      ? {
          title: proposedHire.title,
          managerId: proposedHire.manager.id,
          talentPartnerIds: proposedHire.talentPartners.map((tp) => tp.id),
          priority: proposedHire.priority,
          hiringProfile: proposedHire.hiringProfile,
          department: proposedHire.department as Department | null,
          quarter: proposedHire.quarter as string | null,
          quantity: 1,
        }
      : {
          title: '',
          managerId: null as string | null,
          talentPartnerIds: [] as string[],
          priority: 'medium' as Priority,
          hiringProfile: '',
          department: null as Department | null,
          quarter: null as string | null,
          quantity: 1,
        },
    validators: {
      onSubmit: z.object({
        title: z.string().min(1, 'You must enter a title'),
        managerId: z.string().min(1, 'You must select a manager'),
        talentPartnerIds: z
          .array(z.string())
          .min(1, 'You must select at least one talent partner'),
        priority: z.enum([
          'low',
          'medium',
          'high',
          'pushed_to_next_quarter',
          'filled',
        ]),
        hiringProfile: z.string(),
        department: z.enum(['RD', 'SM', 'GA']).nullable(),
        quarter: z.string().nullable(),
        quantity: z.number().int().min(1, 'Quantity must be at least 1'),
      }),
    },
    onSubmit: async ({ value }) => {
      if (
        !value.managerId ||
        !value.talentPartnerIds ||
        value.talentPartnerIds.length === 0
      )
        return
      editingExisting
        ? await updateProposedHire({
            data: {
              id: proposedHire.id,
              title: value.title,
              managerId: value.managerId,
              talentPartnerIds: value.talentPartnerIds,
              priority: value.priority,
              hiringProfile: value.hiringProfile,
              department: value.department,
              quarter: value.quarter,
            },
          })
        : await addProposedHire({
            data: {
              title: value.title,
              managerId: value.managerId,
              talentPartnerIds: value.talentPartnerIds,
              priority: value.priority,
              hiringProfile: value.hiringProfile,
              department: value.department,
              quarter: value.quarter,
              quantity: value.quantity,
            },
          })
      router.invalidate()
      queryClient.invalidateQueries({ queryKey: ['proposedHires'] })
      setOpen(false)
      createToast(
        editingExisting
          ? 'Successfully updated proposed hire.'
          : `Successfully added ${value.quantity} proposed hire${value.quantity > 1 ? 's' : ''}.`,
        {
          timeout: 3000,
        },
      )
    },
  })

  const handleOpenChange = (open: boolean) => {
    setOpen(open)
    if (!open && onClose) {
      onClose()
    }
  }

  const talentTeamEmployees = useMemo(
    () =>
      employees.filter(
        (employee) =>
          employee.employee?.id &&
          employee.team?.toLowerCase().includes('talent'),
      ),
    [employees],
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <form>
        <DialogTrigger asChild>
          {buttonType === 'default' ? (
            <Button variant="outline" size="sm" className="h-7 text-xs">
              {editingExisting ? 'Edit proposed hire' : 'Add proposed hire'}
            </Button>
          ) : (
            <Button variant="ghost" className="h-8 w-8 p-0">
              <Pencil />
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingExisting ? 'Edit proposed hire' : 'Add proposed hire'}
            </DialogTitle>
            <DialogDescription>
              {editingExisting
                ? 'Edit a proposed hire on the organization chart.'
                : 'Add a proposed hire to the organization chart.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <form.Field
              name="title"
              children={(field) => (
                <div className="col-span-2 grid gap-3">
                  <Label htmlFor={field.name}>Title</Label>
                  <Input
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldInfo field={field} />
                </div>
              )}
            />
            <form.Field
              name="talentPartnerIds"
              children={(field) => (
                <div className="col-span-2 grid gap-3">
                  <Label htmlFor={field.name}>Talent Partners</Label>
                  <Popover modal={true}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="h-auto min-h-9 w-full justify-between font-normal"
                      >
                        {field.state.value.length === 0 ? (
                          <span className="text-muted-foreground">
                            Select talent partners...
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {field.state.value.map((id) => {
                              const emp = talentTeamEmployees.find(
                                (e) => e.employee?.id === id,
                              )
                              if (!emp) return null
                              return (
                                <Badge
                                  key={id}
                                  variant="secondary"
                                  className="gap-1"
                                >
                                  {getFullName(emp.firstName, emp.lastName)}
                                  <button
                                    type="button"
                                    className="ring-offset-background focus:ring-ring rounded-full outline-none focus:ring-2 focus:ring-offset-2"
                                    onPointerDown={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                    }}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      field.handleChange(
                                        field.state.value.filter(
                                          (v) => v !== id,
                                        ),
                                      )
                                    }}
                                  >
                                    <X className="size-3" />
                                  </button>
                                </Badge>
                              )
                            })}
                          </div>
                        )}
                        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Search talent partners..." />
                        <CommandList>
                          <CommandEmpty>
                            No talent team employees found.
                          </CommandEmpty>
                          <CommandGroup>
                            {talentTeamEmployees.map((employee) => {
                              const employeeId = employee.employee?.id
                              if (!employeeId) return null
                              const isSelected =
                                field.state.value.includes(employeeId)
                              return (
                                <CommandItem
                                  key={employeeId}
                                  value={getFullName(
                                    employee.firstName,
                                    employee.lastName,
                                  )}
                                  onSelect={() => {
                                    if (isSelected) {
                                      field.handleChange(
                                        field.state.value.filter(
                                          (id) => id !== employeeId,
                                        ),
                                      )
                                    } else {
                                      field.handleChange([
                                        ...field.state.value,
                                        employeeId,
                                      ])
                                    }
                                  }}
                                >
                                  <Check
                                    className={`size-4 ${isSelected ? 'opacity-100' : 'opacity-0'}`}
                                  />
                                  {getFullName(
                                    employee.firstName,
                                    employee.lastName,
                                  )}
                                </CommandItem>
                              )
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FieldInfo field={field} />
                </div>
              )}
            />
            <form.Field
              name="managerId"
              children={(field) => (
                <div className="grid min-w-0 gap-3">
                  <Label htmlFor={field.name}>Manager</Label>
                  <OrgChartPanel
                    employees={employees}
                    selectedNode={field.state.value}
                    setSelectedNode={(value) => field.handleChange(value)}
                    idValue="employeeId"
                  />
                  <FieldInfo field={field} />
                </div>
              )}
            />
            <form.Field
              name="priority"
              children={(field) => (
                <div className="grid gap-3">
                  <Label htmlFor={field.name}>Priority</Label>
                  <Select
                    value={field.state.value.toString()}
                    onValueChange={(value) =>
                      field.handleChange(value as Priority)
                    }
                  >
                    <SelectTrigger className="h-6 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="pushed_to_next_quarter">
                        Pushed to Next Quarter
                      </SelectItem>
                      <SelectItem value="filled">Filled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldInfo field={field} />
                </div>
              )}
            />
            <form.Field
              name="department"
              children={(field) => (
                <div className="grid gap-3">
                  <Label htmlFor={field.name}>Department</Label>
                  <Select
                    value={field.state.value ?? ''}
                    onValueChange={(value) =>
                      field.handleChange(
                        value === '' ? null : (value as Department),
                      )
                    }
                  >
                    <SelectTrigger className="h-6 w-full text-xs">
                      <SelectValue placeholder="Select department..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RD">R&amp;D</SelectItem>
                      <SelectItem value="SM">S&amp;M</SelectItem>
                      <SelectItem value="GA">G&amp;A</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldInfo field={field} />
                </div>
              )}
            />
            <form.Field
              name="quarter"
              children={(field) => (
                <div className="grid gap-3">
                  <Label htmlFor={field.name}>Quarter</Label>
                  <Select
                    value={field.state.value ?? ''}
                    onValueChange={(value) =>
                      field.handleChange(value === '' ? null : value)
                    }
                  >
                    <SelectTrigger className="h-6 w-full text-xs">
                      <SelectValue placeholder="Select quarter..." />
                    </SelectTrigger>
                    <SelectContent>
                      {getQuarterOptions().map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldInfo field={field} />
                </div>
              )}
            />
            <form.Field
              name="hiringProfile"
              children={(field) => (
                <div className="col-span-2 grid gap-3">
                  <Label htmlFor={field.name}>Hiring Profile</Label>
                  <Input
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldInfo field={field} />
                </div>
              )}
            />
            {!editingExisting && (
              <form.Field
                name="quantity"
                children={(field) => (
                  <div className="grid gap-3">
                    <Label htmlFor={field.name}>Quantity</Label>
                    <Input
                      name={field.name}
                      type="number"
                      min="1"
                      max="50"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) =>
                        field.handleChange(Number(e.target.value))
                      }
                    />
                    <FieldInfo field={field} />
                  </div>
                )}
              />
            )}
          </div>
          <DialogFooter className="flex flex-row !justify-between">
            <div className="flex flex-row gap-2">
              {editingExisting ? (
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await deleteProposedHire({ data: { id: proposedHire.id } })
                    router.invalidate()
                    queryClient.invalidateQueries({
                      queryKey: ['proposedHires'],
                    })
                    setOpen(false)
                    createToast('Successfully deleted proposed hire.', {
                      timeout: 3000,
                    })
                  }}
                  type="button"
                >
                  Delete
                </Button>
              ) : null}
            </div>
            <div className="flex flex-row gap-2">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  form.handleSubmit()
                }}
              >
                {editingExisting
                  ? 'Save changes'
                  : form.state.values.quantity > 1
                    ? 'Add proposed hires'
                    : 'Add proposed hire'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  )
}

export default AddProposedHirePanel
