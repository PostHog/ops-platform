import { useState, useEffect, useRef, useMemo } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { useRouter } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import type { HierarchyNode } from '@/lib/types'
import type { Prisma } from '@prisma/client'

export type ViewMode = 'manager' | 'team'

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

type ManagerHierarchyTreeProps = {
  hierarchy: HierarchyNode | HierarchyNode[] | null
  currentEmployeeId: string
  expandAll?: boolean | null
  onExpandAllChange?: (expand: boolean | null) => void
  onNodeExpand?: (nodeId: string, expand: boolean) => void
  deelEmployees?: DeelEmployee[]
  viewMode?: ViewMode
  onViewModeChange?: (mode: ViewMode) => void
}

function TreeNode({
  node,
  level = 0,
  currentEmployeeId,
  expandAll,
  containerRef,
  onNodeExpand,
  isTeamNode = false,
}: {
  node: HierarchyNode
  level: number
  currentEmployeeId: string
  expandAll: boolean | null
  containerRef?: React.RefObject<HTMLDivElement | null>
  onNodeExpand?: (nodeId: string, expand: boolean) => void
  isTeamNode?: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const nodeRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const hasChildren = node.children.length > 0
  const isCurrentEmployee = node.employeeId === currentEmployeeId

  // Check if any child is the current employee
  const hasCurrentEmployeeAsChild = (n: HierarchyNode): boolean => {
    if (n.employeeId === currentEmployeeId) return true
    return n.children.some((child) => hasCurrentEmployeeAsChild(child))
  }

  useEffect(() => {
    if (expandAll !== null) {
      setIsExpanded(expandAll)
    }
  }, [expandAll])

  // Expand if current employee is a descendant (to make it visible)
  useEffect(() => {
    if (hasCurrentEmployeeAsChild(node)) {
      setIsExpanded(true)
    }
  }, [currentEmployeeId, node])

  // Scroll to current employee when it changes
  useEffect(() => {
    if (isCurrentEmployee && nodeRef.current && containerRef?.current) {
      // Use setTimeout to ensure DOM has updated after expansion
      setTimeout(() => {
        const nodeElement = nodeRef.current
        if (nodeElement) {
          nodeElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          })
        }
      }, 100)
    }
  }, [isCurrentEmployee, containerRef])

  const handleClick = (e: React.MouseEvent) => {
    if (hasChildren) {
      e.stopPropagation()
      setIsExpanded(!isExpanded)
    }
    // Only navigate if it's an employee node (not a team node)
    if (
      !isTeamNode &&
      node.employeeId &&
      node.employeeId !== currentEmployeeId
    ) {
      router.navigate({
        to: '/employee/$employeeId',
        params: { employeeId: node.employeeId },
      })
    }
  }

  return (
    <div ref={nodeRef}>
      <div
        className={cn(
          'flex cursor-pointer items-center gap-1 rounded px-2 py-1.5 text-sm hover:bg-gray-100',
          isCurrentEmployee && 'bg-blue-50 font-semibold',
          isTeamNode && 'font-medium text-gray-700',
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="h-3 w-3 flex-shrink-0 text-gray-500" />
          ) : (
            <ChevronRight className="h-3 w-3 flex-shrink-0 text-gray-500" />
          )
        ) : (
          <div className="h-3 w-3 flex-shrink-0" />
        )}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate">{node.name}</span>
          {!isTeamNode && node.team && (
            <span className="flex-shrink-0 truncate text-xs text-gray-500">
              {node.team}
            </span>
          )}
        </div>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              currentEmployeeId={currentEmployeeId}
              expandAll={expandAll}
              containerRef={containerRef}
              onNodeExpand={onNodeExpand}
              isTeamNode={child.id.startsWith('team-')}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Helper function to find team lead (similar to org-chart)
const findTeamLead = (
  employees: DeelEmployee[],
  employee: DeelEmployee,
): DeelEmployee | null => {
  if (!employee.team || !employee.managerId) {
    return null
  }

  let currentEmployee: DeelEmployee = employee
  const originalTeam = employee.team

  while (currentEmployee.managerId) {
    const manager = employees.find((e) => e.id === currentEmployee.managerId)

    if (!manager) {
      return null
    }

    if (manager.team === originalTeam) {
      currentEmployee = manager
    } else {
      return currentEmployee
    }
  }

  return null
}

// Helper to create employee node
const createEmployeeNode = (emp: DeelEmployee): HierarchyNode => ({
  id: emp.id,
  name: emp.name,
  title: emp.title || '',
  team: emp.team || undefined,
  employeeId: emp.employee?.id,
  workEmail: emp.workEmail,
  children: [],
})

// Transform manager hierarchy to team hierarchy
const buildTeamHierarchy = (employees: DeelEmployee[]): HierarchyNode[] => {
  const blitzscaleEmployees = employees.filter((e) => e.team === 'Blitzscale')
  const employeesWithTeams = employees.filter(
    (e) => e.team && e.team !== '' && e.team !== 'Blitzscale',
  )

  // Group employees by team
  const teamMap = new Map<string, DeelEmployee[]>()
  employeesWithTeams.forEach((emp) => {
    const team = emp.team!
    if (!teamMap.has(team)) teamMap.set(team, [])
    teamMap.get(team)!.push(emp)
  })

  const addedEmployeeIds = new Set<string>()
  const managerToTeamsMap = new Map<string, string[]>()

  // Map teams to their managers via team leads
  const seenTeams = new Set<string>()
  for (const employee of employeesWithTeams) {
    const team = employee.team!
    if (seenTeams.has(team)) continue
    seenTeams.add(team)

    const teamEmployees = teamMap.get(team) || []
    const teamLead = teamEmployees
      .map((e) => findTeamLead(employees, e))
      .find((lead) => lead !== null)

    if (teamLead?.managerId) {
      const managerId = teamLead.managerId
      if (!managerToTeamsMap.has(managerId)) {
        managerToTeamsMap.set(managerId, [])
      }
      managerToTeamsMap.get(managerId)!.push(team)
    }
  }

  // Build team node with employees
  const buildTeamNode = (
    teamName: string,
    visited: Set<string>,
  ): HierarchyNode => {
    const teamEmployees = teamMap.get(teamName) || []
    const employeeNodes: HierarchyNode[] = []

    for (const emp of teamEmployees) {
      if (addedEmployeeIds.has(emp.id)) continue
      addedEmployeeIds.add(emp.id)

      const empManagedTeams = managerToTeamsMap.get(emp.id) || []
      if (empManagedTeams.length > 0) {
        const empNode = buildEmployeeNode(emp.id, visited)
        if (empNode) employeeNodes.push(empNode)
      } else {
        employeeNodes.push(createEmployeeNode(emp))
      }
    }

    return {
      id: `team-${teamName}`,
      name: teamName,
      title: '',
      team: teamName,
      employeeId: undefined,
      workEmail: undefined,
      children: employeeNodes.sort((a, b) => a.name.localeCompare(b.name)),
    }
  }

  // Recursively build employee node with teams and nested employees
  const buildEmployeeNode = (
    employeeId: string,
    visited: Set<string>,
  ): HierarchyNode | null => {
    if (visited.has(employeeId)) return null
    visited.add(employeeId)

    const employee = employees.find((e) => e.id === employeeId)
    if (!employee) return null

    const managedTeams = managerToTeamsMap.get(employeeId) || []
    const teamNodes = managedTeams
      .sort()
      .map((teamName) => buildTeamNode(teamName, visited))

    // Direct reports (excluding Blitzscale and those already added)
    const directReports = employees
      .filter(
        (e) =>
          e.managerId === employeeId &&
          !addedEmployeeIds.has(e.id) &&
          e.team !== 'Blitzscale' &&
          (!e.team || e.team === ''),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((emp) => {
        addedEmployeeIds.add(emp.id)
        return buildEmployeeNode(emp.id, visited) || createEmployeeNode(emp)
      })

    return {
      ...createEmployeeNode(employee),
      children: [...teamNodes, ...directReports],
    }
  }

  // Build Blitzscale employee nodes (all at top level)
  const blitzscaleNodes = blitzscaleEmployees
    .sort((a, b) => {
      if (a.title === 'Cofounder' && b.title !== 'Cofounder') return -1
      if (a.title !== 'Cofounder' && b.title === 'Cofounder') return 1
      return a.name.localeCompare(b.name)
    })
    .map((emp) => {
      addedEmployeeIds.add(emp.id)
      return buildEmployeeNode(emp.id, new Set()) || createEmployeeNode(emp)
    })

  // Find top-level teams (teams without managers)
  const allManagedTeams = new Set(Array.from(managerToTeamsMap.values()).flat())
  const topLevelTeams = Array.from(teamMap.keys())
    .filter((teamName) => !allManagedTeams.has(teamName))
    .map((teamName) => buildTeamNode(teamName, new Set()))
    .sort((a, b) => a.name.localeCompare(b.name))

  return [...blitzscaleNodes, ...topLevelTeams]
}

export function ManagerHierarchyTree({
  hierarchy,
  currentEmployeeId,
  expandAll = null,
  deelEmployees,
  viewMode = 'manager',
}: ManagerHierarchyTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Transform hierarchy based on view mode
  const displayHierarchy = useMemo(() => {
    if (viewMode === 'team' && deelEmployees) {
      return buildTeamHierarchy(deelEmployees)
    }
    return hierarchy
  }, [viewMode, hierarchy, deelEmployees])

  if (!displayHierarchy) {
    return (
      <div className="p-4 text-sm text-gray-500">
        No hierarchy data available
      </div>
    )
  }

  const nodes = Array.isArray(displayHierarchy)
    ? displayHierarchy
    : [displayHierarchy]

  return (
    <div ref={containerRef} className="h-full overflow-y-auto pr-1">
      <div className="p-2">
        {nodes.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            level={0}
            currentEmployeeId={currentEmployeeId}
            expandAll={expandAll}
            containerRef={containerRef}
            isTeamNode={node.id.startsWith('team-')}
          />
        ))}
      </div>
    </div>
  )
}
