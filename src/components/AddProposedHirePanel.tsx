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
import { AnyFieldApi, useForm } from '@tanstack/react-form'
import { createToast } from 'vercel-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { type DeelEmployee, type Priority, type Prisma } from '@prisma/client'
import OrgChartPanel from './OrgChartPanel'
import prisma from '@/db'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useRouter } from '@tanstack/react-router'
import { createAuthenticatedFn } from '@/lib/auth-middleware'

type ProposedHire = Prisma.ProposedHireGetPayload<{}> & {
  manager: DeelEmployee
}

const addProposedHire = createAuthenticatedFn({
  method: 'POST',
})
  .inputValidator(
    (d: {
      title: string
      managerEmail: string
      priority: Priority
      hiringProfile: string
    }) => d,
  )
  .handler(async ({ data }) => {
    return await prisma.proposedHire.create({
      data: {
        title: data.title,
        managerEmail: data.managerEmail,
        priority: data.priority,
        hiringProfile: data.hiringProfile,
      },
    })
  })

const updateProposedHire = createAuthenticatedFn({
  method: 'POST',
})
  .inputValidator(
    (d: {
      id: string
      title: string
      managerEmail: string
      priority: Priority
      hiringProfile: string
    }) => d,
  )
  .handler(async ({ data }) => {
    return await prisma.proposedHire.update({
      where: { id: data.id },
      data: {
        title: data.title,
        managerEmail: data.managerEmail,
        priority: data.priority,
        hiringProfile: data.hiringProfile,
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
  openWhenIdChanges = false,
}: {
  employees: Array<DeelEmployee>
  proposedHire?: ProposedHire
  onClose?: () => void
  openWhenIdChanges?: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const editingExisting = !!proposedHire

  const form = useForm({
    defaultValues: editingExisting
      ? {
          title: proposedHire.title,
          managerEmail: proposedHire.manager.workEmail,
          priority: proposedHire.priority,
          hiringProfile: proposedHire.hiringProfile,
        }
      : {
          title: '',
          managerEmail: null as string | null,
          priority: 'medium' as Priority,
          hiringProfile: '',
        },
    validators: {
      onSubmit: z.object({
        title: z.string().min(1, 'You must enter a title'),
        managerEmail: z.string().min(1, 'You must select a manager'),
        priority: z.enum(['low', 'medium', 'high']),
        hiringProfile: z.string(),
      }),
    },
    onSubmit: async ({ value }) => {
      if (!value.managerEmail) return
      editingExisting
        ? await updateProposedHire({
            data: {
              id: proposedHire.id,
              title: value.title,
              managerEmail: value.managerEmail,
              priority: value.priority,
              hiringProfile: value.hiringProfile,
            },
          })
        : await addProposedHire({
            data: {
              title: value.title,
              managerEmail: value.managerEmail,
              priority: value.priority,
              hiringProfile: value.hiringProfile,
            },
          })
      router.invalidate()
      setOpen(false)
      createToast('Successfully added proposed hire.', {
        timeout: 3000,
      })
    },
  })

  useEffect(() => {
    if (proposedHire?.id) {
      if (openWhenIdChanges) setOpen(true)
      form.reset({
        title: proposedHire.title,
        managerEmail: proposedHire.manager.workEmail,
        priority: proposedHire.priority,
        hiringProfile: proposedHire.hiringProfile,
      })
    } else {
      form.reset({
        title: '',
        managerEmail: null as string | null,
        priority: 'medium' as Priority,
        hiringProfile: '',
      })
    }
  }, [proposedHire?.id])

  const handleOpenChange = (open: boolean) => {
    setOpen(open)
    if (!open && onClose) {
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <form>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            {editingExisting ? 'Edit proposed hire' : 'Add proposed hire'}
          </Button>
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
              name="managerEmail"
              children={(field) => (
                <div className="grid gap-3 col-span-2">
                  <Label htmlFor={field.name}>Manager</Label>
                  <OrgChartPanel
                    employees={employees}
                    selectedNode={field.state.value}
                    setSelectedNode={(value) => field.handleChange(value)}
                    idValue="email"
                  />
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
          </div>
          <DialogFooter className="flex flex-row !justify-between">
            <div className="flex flex-row gap-2">
              {editingExisting ? (
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await deleteProposedHire({ data: { id: proposedHire.id } })
                    router.invalidate()
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
                {editingExisting ? 'Save changes' : 'Add proposed hire'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  )
}

export default AddProposedHirePanel
