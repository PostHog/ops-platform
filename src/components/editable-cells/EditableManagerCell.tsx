import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn, getFullName } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
import type { Prisma } from '@prisma/client'

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

interface EditableManagerCellProps {
  selectedId: string | null
  employees: Array<DeelEmployee>
  displayValue: string
  onSave: (managerId: string) => Promise<void>
}

export function EditableManagerCell({
  selectedId,
  employees,
  displayValue,
  onSave,
}: EditableManagerCellProps) {
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSelect = async (employeeId: string) => {
    if (employeeId === selectedId) {
      setOpen(false)
      return
    }

    setOpen(false)
    setIsSaving(true)
    try {
      await onSave(employeeId)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Popover modal={true} open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          disabled={isSaving}
          className={cn(
            'h-auto w-full justify-between px-2 py-1 text-xs font-normal hover:bg-gray-50',
            isSaving && 'opacity-50',
          )}
        >
          {displayValue || 'Select manager...'}
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput placeholder="Search employee..." className="h-9" />
          <CommandList>
            <CommandEmpty>No employee found.</CommandEmpty>
            <CommandGroup>
              {employees
                .filter((employee) => employee.employee?.id)
                .map((employee) => {
                  const employeeId = employee.employee!.id
                  return (
                    <CommandItem
                      key={employee.id}
                      value={`${employee.id} - ${getFullName(employee.firstName, employee.lastName)} - ${employeeId} - ${employee.workEmail}`}
                      onSelect={() => handleSelect(employeeId)}
                    >
                      {getFullName(employee.firstName, employee.lastName)}
                      <Check
                        className={cn(
                          'ml-auto h-4 w-4',
                          selectedId === employeeId
                            ? 'opacity-100'
                            : 'opacity-0',
                        )}
                      />
                    </CommandItem>
                  )
                })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
