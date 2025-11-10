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

type DeelEmployee = Prisma.DeelEmployeeGetPayload<{
  include: {
    employee: true
  }
}>

const OrgChartPanel = ({
  employees,
  selectedNode,
  setSelectedNode,
  idValue = 'id',
}: {
  employees: Array<DeelEmployee>
  selectedNode: string | null
  setSelectedNode: (node: string | null) => void
  idValue?: 'id' | 'employeeId'
}) => {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
                    value={`${employee.id} - ${employee.name} - ${employee.employee?.id}`}
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
                        idValue === 'id'
                          ? selectedNode === employee.id
                          : selectedNode === employee.employee?.id
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
  )
}

export default OrgChartPanel
