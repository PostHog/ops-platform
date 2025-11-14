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
import { Checkbox } from '@/components/ui/checkbox'
import { AnyFieldApi, useForm } from '@tanstack/react-form'
import { createToast } from 'vercel-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { type Priority, type Prisma } from '@prisma/client'
import OrgChartPanel from './OrgChartPanel'
import prisma from '@/db'
import { useMemo, useState } from 'react'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { createAuthenticatedFn } from '@/lib/auth-middleware'
import { Pencil } from 'lucide-react'

type DeelEmployee = Prisma.DeelEmployeeGetPayload<{
  include: {
    employee: true
  }
}>

type ProposedHire = Prisma.ProposedHireGetPayload<{
  include: {
    manager: {
      include: {
        deelEmployee: true
      }
    }
    talentPartners: {
      include: {
        deelEmployee: true
      }
    }
  }
}>

const addProposedHire = createAuthenticatedFn({
  method: 'POST',
})
  .inputValidator(
    (d: {
      title: string
      managerId: string
      talentPartnerIds: string[]
      priority: Priority
      hiringProfile: string
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

const updateProposedHire = createAuthenticatedFn({
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
    }) => d,
  )
  .handler(async ({ data }) => {
    return await prisma.proposedHire.update({
      where: { id: data.id },
      data: {
        title: data.title,
        managerId: data.managerId,
        priority: data.priority,
        hiringProfile: data.hiringProfile,
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

const deleteProposedHire = createAuthenticatedFn({
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
          quantity: 1,
        }
      : {
          title: '',
          managerId: null as string | null,
          talentPartnerIds: [] as string[],
          priority: 'medium' as Priority,
          hiringProfile: '',
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
            },
          })
        : await addProposedHire({
            data: {
              title: value.title,
              managerId: value.managerId,
              talentPartnerIds: value.talentPartnerIds,
              priority: value.priority,
              hiringProfile: value.hiringProfile,
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
            <Button variant="outline" className="w-full">
              {editingExisting ? 'Edit proposed hire' : 'Add proposed hire'}
            </Button>
          ) : (
            <Button variant="ghost" className="h-8 w-8 p-0">
              <Pencil />
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
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
          <div className="grid gap-4">
            <form.Field
              name="title"
              children={(field) => (
                <div className="grid gap-3 col-span-2">
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
              name="managerId"
              children={(field) => (
                <div className="grid gap-3 col-span-2">
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
              name="talentPartnerIds"
              children={(field) => (
                <div className="grid gap-3 col-span-2">
                  <Label htmlFor={field.name}>Talent Partners</Label>
                  <div className="border rounded-md p-3 max-h-[200px] overflow-y-auto">
                    {talentTeamEmployees.length === 0 ? (
                      <div className="text-sm text-gray-500">
                        No talent team employees found.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {talentTeamEmployees.map((employee) => {
                          const employeeId = employee.employee?.id
                          if (!employeeId) return null
                          const isChecked =
                            field.state.value.includes(employeeId)
                          return (
                            <div
                              key={employeeId}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`talent-partner-${employeeId}`}
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  const currentIds = field.state.value
                                  if (checked) {
                                    field.handleChange([
                                      ...currentIds,
                                      employeeId,
                                    ])
                                  } else {
                                    field.handleChange(
                                      currentIds.filter(
                                        (id) => id !== employeeId,
                                      ),
                                    )
                                  }
                                }}
                              />
                              <Label
                                htmlFor={`talent-partner-${employeeId}`}
                                className="text-sm font-normal cursor-pointer"
                              >
                                {employee.name}
                              </Label>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <FieldInfo field={field} />
                </div>
              )}
            />
            <form.Field
              name="priority"
              children={(field) => (
                <div className="grid gap-3 col-span-2">
                  <Label htmlFor={field.name}>Priority</Label>
                  <Select
                    value={field.state.value.toString()}
                    onValueChange={(value) =>
                      field.handleChange(value as Priority)
                    }
                  >
                    <SelectTrigger className="w-full h-6 text-xs">
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
              name="hiringProfile"
              children={(field) => (
                <div className="grid gap-3 col-span-2">
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
                  <div className="grid gap-3 col-span-2">
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
