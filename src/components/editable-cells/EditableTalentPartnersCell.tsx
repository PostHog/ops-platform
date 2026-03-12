import { useState, useEffect, useRef } from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { cn, getFullName } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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

interface EditableTalentPartnersCellProps {
  selectedIds: string[]
  employees: Array<DeelEmployee>
  onSave: (ids: string[]) => Promise<void>
}

export function EditableTalentPartnersCell({
  selectedIds,
  employees,
  onSave,
}: EditableTalentPartnersCellProps) {
  const [open, setOpen] = useState(false)
  const [localIds, setLocalIds] = useState<string[]>(selectedIds)
  const [isSaving, setIsSaving] = useState(false)
  const initialIdsRef = useRef<string[]>(selectedIds)

  useEffect(() => {
    setLocalIds(selectedIds)
    initialIdsRef.current = selectedIds
  }, [selectedIds])

  const handleOpenChange = async (newOpen: boolean) => {
    if (!newOpen && open) {
      const hasChanged =
        localIds.length !== initialIdsRef.current.length ||
        !localIds.every((id) => initialIdsRef.current.includes(id))

      if (hasChanged) {
        setIsSaving(true)
        try {
          await onSave(localIds)
        } catch {
          setLocalIds(initialIdsRef.current)
        } finally {
          setIsSaving(false)
        }
      }
    }
    setOpen(newOpen)
  }

  const handleToggle = (employeeId: string) => {
    if (localIds.includes(employeeId)) {
      setLocalIds(localIds.filter((id) => id !== employeeId))
    } else {
      setLocalIds([...localIds, employeeId])
    }
  }

  const handleRemove = (employeeId: string) => {
    setLocalIds(localIds.filter((id) => id !== employeeId))
  }

  return (
    <Popover modal={true} open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          disabled={isSaving}
          className={cn(
            'h-auto w-full justify-between px-1 py-0.5 text-left text-xs font-normal hover:bg-gray-50',
            isSaving && 'opacity-50',
          )}
        >
          {localIds.length === 0 ? (
            <span className="text-muted-foreground">None</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {localIds.map((id) => {
                const emp = employees.find((e) => e.employee?.id === id)
                if (!emp) return null
                return (
                  <Badge key={id} variant="secondary" className="gap-1 text-xs">
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
                        handleRemove(id)
                      }}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                )
              })}
            </div>
          )}
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput placeholder="Search talent partners..." />
          <CommandList>
            <CommandEmpty>No talent team employees found.</CommandEmpty>
            <CommandGroup>
              {employees.map((employee) => {
                const employeeId = employee.employee?.id
                if (!employeeId) return null
                const isSelected = localIds.includes(employeeId)
                return (
                  <CommandItem
                    key={employeeId}
                    value={getFullName(employee.firstName, employee.lastName)}
                    onSelect={() => handleToggle(employeeId)}
                  >
                    <Check
                      className={`size-4 ${isSelected ? 'opacity-100' : 'opacity-0'}`}
                    />
                    {getFullName(employee.firstName, employee.lastName)}
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
