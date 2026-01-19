import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import {
  ChevronsLeftRight,
  ChevronsRightLeft,
  Search,
  Check,
} from 'lucide-react'
import { ManagerHierarchyTree } from '@/components/ManagerHierarchyTree'
import { getFullName } from '@/lib/utils'
import { getDeelEmployeesAndProposedHires } from './org-chart'
import type { HierarchyNode } from '@/lib/types'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/org-tree')({
  component: OrgTree,
  loader: async () => await getDeelEmployeesAndProposedHires(),
})

function OrgTree() {
  const { employees, proposedHires } = Route.useLoaderData()

  const [expandAll, setExpandAll] = useState<boolean | null>(null)
  const [expandAllCounter, setExpandAllCounter] = useState(0)
  const [viewMode, setViewMode] = useLocalStorage<'manager' | 'team'>(
    'org-tree.viewMode',
    'manager',
  )
  const [searchOpen, setSearchOpen] = useState(false)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  )

  // Build hierarchy tree from flat list
  const managerHierarchy = useMemo(() => {
    if (!employees) return null

    const managerMap = new Map<string, Array<(typeof employees)[0]>>()
    for (const emp of employees) {
      if (emp.managerId) {
        const reports = managerMap.get(emp.managerId) || []
        reports.push(emp)
        managerMap.set(emp.managerId, reports)
      }
    }

    // Map proposed hires by manager
    const proposedHiresByManager = new Map<string, typeof proposedHires>()
    proposedHires
      .filter(
        ({ manager, priority }) =>
          manager.deelEmployee && ['low', 'medium', 'high'].includes(priority),
      )
      .forEach((ph) => {
        const managerId = ph.manager.deelEmployee!.id
        if (!proposedHiresByManager.has(managerId)) {
          proposedHiresByManager.set(managerId, [])
        }
        proposedHiresByManager.get(managerId)!.push(ph)
      })

    const buildTree = (
      employee: (typeof employees)[0],
      visited = new Set<string>(),
    ): HierarchyNode => {
      if (visited.has(employee.id)) {
        return {
          id: employee.id,
          name: getFullName(employee.firstName, employee.lastName),
          title: employee.title,
          team: employee.team,
          employeeId: employee.employee?.id,
          workEmail: employee.workEmail,
          startDate: employee.startDate,
          hasActivePerformanceProgram:
            employee.employee?.performancePrograms &&
            employee.employee.performancePrograms.length > 0,
          children: [],
        }
      }

      visited.add(employee.id)
      const directReports = (managerMap.get(employee.id) || []).sort((a, b) =>
        getFullName(a.firstName, a.lastName).localeCompare(
          getFullName(b.firstName, b.lastName),
        ),
      )

      // Add proposed hires for this manager
      const managerProposedHires = (
        proposedHiresByManager.get(employee.id) || []
      ).map((ph) => ({
        id: `employee-${ph.id}`,
        name: '',
        title: ph.title || '',
        team: ph.manager.deelEmployee!.team || undefined,
        employeeId: undefined,
        workEmail: undefined,
        startDate: null,
        hiringPriority: ph.priority as 'low' | 'medium' | 'high',
        children: [],
      }))

      const reportNodes = directReports.map((child) =>
        buildTree(child, visited),
      )
      const allChildren = [...reportNodes, ...managerProposedHires].sort(
        (a, b) => {
          // Sort: employees first (by name), then proposed hires (by title)
          if (a.name && !b.name) return -1
          if (!a.name && b.name) return 1
          if (a.name && b.name) return a.name.localeCompare(b.name)
          return (a.title || '').localeCompare(b.title || '')
        },
      )

      return {
        id: employee.id,
        name: getFullName(employee.firstName, employee.lastName),
        title: employee.title,
        team: employee.team,
        employeeId: employee.employee?.id,
        workEmail: employee.workEmail,
        startDate: employee.startDate,
        hasActivePerformanceProgram:
          employee.employee?.performancePrograms &&
          employee.employee.performancePrograms.length > 0,
        children: allChildren,
      }
    }

    // Find top-level managers (Cofounders or employees without managers)
    const topLevelManagers = employees.filter(
      (e) => e.title === 'Cofounder' || !e.managerId,
    )

    if (topLevelManagers.length === 0) {
      // Fallback: if no top-level managers found, return first employee as root
      if (employees.length > 0) {
        return buildTree(employees[0])
      }
      return null
    }

    // Return array of top-level managers (sorted by name)
    const trees = topLevelManagers
      .sort((a, b) =>
        getFullName(a.firstName, a.lastName).localeCompare(
          getFullName(b.firstName, b.lastName),
        ),
      )
      .map((manager) => buildTree(manager))

    // Return single node or array of nodes
    return trees.length === 1 ? trees[0] : trees
  }, [employees, proposedHires])

  // Flatten hierarchy to get all employees for search
  const allHierarchyEmployees = useMemo(() => {
    if (!managerHierarchy) return []
    const flatten = (node: HierarchyNode): Array<HierarchyNode> => {
      return [node, ...node.children.flatMap(flatten)]
    }
    const nodes = Array.isArray(managerHierarchy)
      ? managerHierarchy
      : [managerHierarchy]
    return nodes.flatMap(flatten).filter((n) => n.employeeId)
  }, [managerHierarchy])

  return (
    <div className="mx-auto h-full w-full max-w-7xl p-4">
      <div className="mb-2 flex items-center justify-between">
        <Select
          value={viewMode}
          onValueChange={(value) => setViewMode(value as 'manager' | 'team')}
        >
          <SelectTrigger className="h-8 w-[140px] bg-white text-sm font-semibold text-gray-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>View modes</SelectLabel>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="team">Team</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <TooltipProvider>
          <div className="flex items-center gap-1">
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      <Search className="h-3.5 w-3.5" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Search employee</p>
                </TooltipContent>
              </Tooltip>
              <PopoverContent className="w-[300px] p-0">
                <Command>
                  <CommandInput
                    placeholder="Search employee..."
                    className="h-9"
                  />
                  <CommandList>
                    <CommandEmpty>No employee found.</CommandEmpty>
                    <CommandGroup>
                      {allHierarchyEmployees
                        .filter((node) => node.employeeId)
                        .map((node) => (
                          <CommandItem
                            key={node.id}
                            value={`${node.id} - ${node.name} - ${node.employeeId} - ${node.workEmail || ''}`}
                            onSelect={(currentValue) => {
                              const selectedId = currentValue.split(' - ')[2]
                              if (selectedId) {
                                setSelectedEmployeeId(selectedId)
                              }
                              setSearchOpen(false)
                            }}
                          >
                            {node.name}
                            <Check
                              className={cn(
                                'ml-auto',
                                selectedEmployeeId === node.employeeId
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setExpandAll(true)
                    setExpandAllCounter((prev) => prev + 1)
                  }}
                  className="h-6 w-6 p-0"
                >
                  <ChevronsLeftRight className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Expand All</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setExpandAll(false)
                    setExpandAllCounter((prev) => prev + 1)
                  }}
                  className="h-6 w-6 p-0"
                >
                  <ChevronsRightLeft className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Collapse All</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
      <div className="h-[calc(100vh-2.5rem-4rem)] overflow-hidden rounded-lg border bg-white">
        <ManagerHierarchyTree
          hierarchy={managerHierarchy}
          currentEmployeeId={selectedEmployeeId || ''}
          expandAll={expandAll}
          expandAllCounter={expandAllCounter}
          deelEmployees={employees}
          proposedHires={proposedHires}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          disableNavigation={true}
          onNodeClick={(employeeId: string) =>
            setSelectedEmployeeId(employeeId)
          }
        />
      </div>
    </div>
  )
}
