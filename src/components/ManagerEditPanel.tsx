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
import { cn } from '@/lib/utils'
import { createToast } from 'vercel-toast'
import prisma from '@/db'
import { useRouter } from '@tanstack/react-router'

const updateDeelManager = createOrgChartFn({
  method: 'POST',
})
  .inputValidator((d: { id: string; managerId: string }) => d)
  .handler(async ({ data: { id, managerId } }) => {
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

    await prisma.deelEmployee.update({
      where: { id },
      data: { managerId },
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
        name: true
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
                    ? employees?.find((employee) => employee.id === value)?.name
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
                          value={`${employee.id} - ${employee.name} - ${employee.workEmail}`}
                          onSelect={(currentValue) => {
                            setValue(
                              currentValue === value
                                ? null
                                : currentValue.split(' - ')[0],
                            )
                            setOpen(false)
                          }}
                        >
                          {employee.name}
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
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="submit" onClick={handleSubmit}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
