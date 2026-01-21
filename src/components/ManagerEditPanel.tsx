import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createOrgChartFn } from '@/lib/auth-middleware'
import { Prisma } from '@prisma/client'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useEffect, useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn, getFullName } from '@/lib/utils'
import { createToast } from 'vercel-toast'
import prisma from '@/db'
import { useRouter } from '@tanstack/react-router'
import { createAuditLogEntry } from '@/lib/audit-log'
import { AuditLogHistoryDialog } from './AuditLogHistoryDialog'

const updateDeelManager = createOrgChartFn({
  method: 'POST',
})
  .inputValidator((d: { id: string; managerId: string }) => d)
  .handler(async ({ data: { id, managerId }, context }) => {
    // Get current manager and employee details
    const currentEmployee = await prisma.deelEmployee.findUnique({
      where: { id },
      include: {
        employee: { select: { email: true } },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            workEmail: true,
          },
        },
      },
    })

    // Get new manager details
    const newManager = await prisma.deelEmployee.findUnique({
      where: { id: managerId },
      select: { firstName: true, lastName: true },
    })

    const response = await fetch(
      `https://api.letsdeel.com/rest/v2/hris/worker_relations/profile/${id}/parent`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${process.env.DEEL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            hris_relationship_type_id: '9f5b0541-43cf-489b-a6e3-075c9bc49916', // manager type id
            id: managerId,
          },
        }),
      },
    )

    if (response.status !== 204) {
      throw Error(
        `Error from Deel API: ${response.status}: ${JSON.stringify(await response.json())}`,
      )
    }

    // Update in database
    const updatedEmployee = await prisma.deelEmployee.update({
      where: { id },
      data: { managerId },
      include: {
        employee: { select: { email: true } },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            workEmail: true,
          },
        },
      },
    })

    // Create audit log entry
    await createAuditLogEntry({
      actorUserId: context.user.id,
      entityType: 'MANAGER',
      entityId: id,
      fieldName: 'managerId',
      oldValue: getFullName(
        currentEmployee?.manager?.firstName,
        currentEmployee?.manager?.lastName,
      ),
      newValue: getFullName(newManager?.firstName, newManager?.lastName),
      metadata: {
        employeeEmail: updatedEmployee.employee?.email,
        oldManagerId: currentEmployee?.managerId,
        newManagerId: managerId,
        newManagerEmail: updatedEmployee.manager?.workEmail,
      },
    })

    return 'OK'
  })

type DeelEmployee = Prisma.DeelEmployeeGetPayload<{
  include: {
    employee: {
      select: {
        id: true
        email: true
      }
    }
    manager: {
      select: {
        id: true
        firstName: true
        lastName: true
      }
    }
  }
}>

export function ManagerEditPanel({
  employees,
  employee,
}: {
  employees: Array<DeelEmployee>
  employee: DeelEmployee
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<string | null>(employee.managerId)
  const router = useRouter()

  const handleSubmit = async () => {
    if (!value) return
    await updateDeelManager({ data: { id: employee.id, managerId: value } })
    setDialogOpen(false)
    router.invalidate()
    createToast('Manager updated successfully.', {
      timeout: 3000,
    })
  }

  useEffect(() => {
    setValue(employee.managerId)
  }, [employee.managerId])

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Edit</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit manager</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-3">
            <Popover modal={true} open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  {value
                    ? (() => {
                        const emp = employees?.find(
                          (employee) => employee.id === value,
                        )
                        return emp
                          ? getFullName(emp.firstName, emp.lastName)
                          : null
                      })()
                    : 'Select manager...'}
                  <ChevronsUpDown className="opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput
                    placeholder="Search manager..."
                    className="h-9"
                  />
                  <CommandList>
                    <CommandEmpty>No manager found.</CommandEmpty>
                    <CommandGroup>
                      {employees?.map((employee) => (
                        <CommandItem
                          key={employee.id}
                          value={`${employee.id} - ${getFullName(employee.firstName, employee.lastName)} - ${employee.workEmail}`}
                          onSelect={(currentValue) => {
                            setValue(
                              currentValue === value
                                ? null
                                : currentValue.split(' - ')[0],
                            )
                            setOpen(false)
                          }}
                        >
                          {getFullName(employee.firstName, employee.lastName)}
                          <Check
                            className={cn(
                              'ml-auto',
                              value === employee.id.split('-')[0]
                                ? 'opacity-100'
                                : 'opacity-0',
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDialogOpen(false)
              setHistoryDialogOpen(true)
            }}
            className="text-xs"
          >
            View history
          </Button>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" onClick={handleSubmit}>
              Save changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
      <AuditLogHistoryDialog
        entityType="MANAGER"
        entityId={employee.id}
        title={`Manager history for ${getFullName(employee.firstName, employee.lastName)}`}
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
      />
    </Dialog>
  )
}
