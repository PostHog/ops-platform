import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
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
import type { OrgChartMode } from '@/routes/org-chart'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from './ui/select'

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

const OrgChartPanel = ({
  employees,
  selectedNode,
  setSelectedNode,
  idValue = 'id',
  viewMode,
  onViewModeChange,
}: {
  employees: Array<DeelEmployee>
  selectedNode: string | null
  setSelectedNode: (node: string | null) => void
  idValue?: 'id' | 'employeeId'
  viewMode?: OrgChartMode
  onViewModeChange?: (mode: OrgChartMode) => void
}) => {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-row gap-4 w-[300px]">
      <Popover modal={true} open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="min-w-[300px] justify-between w-full"
          >
            {selectedNode
              ? employees.find((employee) =>
                  idValue === 'id'
                    ? employee.id === selectedNode
                    : employee.employee?.id === selectedNode,
                )?.name
              : 'Search employee...'}
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0">
          <Command>
            <CommandInput placeholder="Search employee..." className="h-9" />
            <CommandList>
              <CommandEmpty>No employee found.</CommandEmpty>
              <CommandGroup>
                {employees
                  .filter((employee) => employee.employee?.id)
                  .map((employee) => (
                    <CommandItem
                      key={employee.id}
                      value={`${employee.id} - ${employee.name} - ${employee.employee?.id} - ${employee.workEmail}`}
                      onSelect={(currentValue) => {
                        setSelectedNode(
                          (
                            idValue === 'id'
                              ? currentValue.split(' - ')[0] === selectedNode
                              : currentValue.split(' - ')[2] === selectedNode
                          )
                            ? null
                            : idValue === 'id'
                              ? currentValue.split(' - ')[0]
                              : currentValue.split(' - ')[2],
                        )
                        setOpen(false)
                      }}
                    >
                      {employee.name}
                      <Check
                        className={cn(
                          'ml-auto',
                          (
                            idValue === 'id'
                              ? selectedNode === employee.id
                              : selectedNode === employee.employee?.id
                          )
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
      {viewMode ? (
        <Select value={viewMode} onValueChange={onViewModeChange}>
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue placeholder="Select a view mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>View modes</SelectLabel>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="team">Team</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      ) : null}
    </div>
  )
}

export default OrgChartPanel
