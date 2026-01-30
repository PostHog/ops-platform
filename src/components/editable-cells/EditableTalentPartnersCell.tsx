import { useState, useEffect, useRef } from 'react'
import { ChevronsUpDown } from 'lucide-react'
import { cn, getFullName } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
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

  const handleToggle = (employeeId: string, checked: boolean) => {
    if (checked) {
      setLocalIds([...localIds, employeeId])
    } else {
      setLocalIds(localIds.filter((id) => id !== employeeId))
    }
  }

  const displayValue =
    localIds.length > 0
      ? employees
          .filter((e) => e.employee?.id && localIds.includes(e.employee.id))
          .map((e) => getFullName(e.firstName, e.lastName))
          .join(', ')
      : 'None'

  return (
    <Popover modal={true} open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          disabled={isSaving}
          className={cn(
            'h-auto w-full justify-between px-2 py-1 text-left text-xs font-normal hover:bg-gray-50',
            isSaving && 'opacity-50',
          )}
        >
          <span className="truncate">{displayValue}</span>
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <div className="max-h-[200px] overflow-y-auto p-3">
          {employees.length === 0 ? (
            <div className="text-sm text-gray-500">
              No talent team employees found.
            </div>
          ) : (
            <div className="space-y-2">
              {employees.map((employee) => {
                const employeeId = employee.employee?.id
                if (!employeeId) return null
                const isChecked = localIds.includes(employeeId)
                return (
                  <div key={employeeId} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tp-${employeeId}`}
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        handleToggle(employeeId, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`tp-${employeeId}`}
                      className="cursor-pointer text-sm font-normal"
                    >
                      {getFullName(employee.firstName, employee.lastName)}
                    </Label>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
