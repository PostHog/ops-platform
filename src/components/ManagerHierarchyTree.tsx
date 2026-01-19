import { useEffect, useRef, useMemo } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Clock,
  CalendarClock,
  AlertTriangle,
} from 'lucide-react'
import { useRouter } from '@tanstack/react-router'
import { useLocalStorage } from 'usehooks-ts'
import { cn, getFullName } from '@/lib/utils'
import type { HierarchyNode } from '@/lib/types'
import type { Prisma } from '@prisma/client'

export type ViewMode = 'manager' | 'team'

type DeelEmployee = Prisma.DeelEmployeeGetPayload<{
  include: {
    employee: {
      select: {
        id: true
        email: true
        performancePrograms: {
          where: {
            status: 'ACTIVE'
          }
          select: {
            id: true
          }
        }
      }
    }
  }
}>

type ProposedHire = Prisma.ProposedHireGetPayload<{
  include: {
    manager: {
      select: {
        id: true
        email: true
        deelEmployee: true
      }
    }
  }
}>

type ManagerHierarchyTreeProps = {
  hierarchy: HierarchyNode | HierarchyNode[] | null
  currentEmployeeId: string
  expandAll?: boolean | null
  expandAllCounter?: number
  onExpandAllChange?: (expand: boolean | null) => void
  onNodeExpand?: (nodeId: string, expand: boolean) => void
  deelEmployees?: DeelEmployee[]
  proposedHires?: ProposedHire[]
  viewMode?: ViewMode
  onViewModeChange?: (mode: ViewMode) => void
  disableNavigation?: boolean
  onNodeClick?: (employeeId: string) => void
}

function TreeNode({
  node,
  level = 0,
  currentEmployeeId,
  expandAll,
  expandAllCounter,
  containerRef,
  onNodeExpand,
  isTeamNode = false,
  proposedHiresMap,
  disableNavigation = false,
  onNodeClick,
}: {
  node: HierarchyNode
  level: number
  currentEmployeeId: string
  expandAll: boolean | null
  expandAllCounter?: number
  containerRef?: React.RefObject<HTMLDivElement | null>
  onNodeExpand?: (nodeId: string, expand: boolean) => void
  isTeamNode?: boolean
  proposedHiresMap?: Map<string, ProposedHire>
  disableNavigation?: boolean
  onNodeClick?: (employeeId: string) => void
}) {
  const [isExpanded, setIsExpanded] = useLocalStorage<boolean>(
    `manager-tree.expanded.${node.id}`,
    true,
  )
  const nodeRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const hasChildren = node.children.length > 0
  const isCurrentEmployee = node.employeeId === currentEmployeeId
  const isProposedHire =
    node.hiringPriority ||
    (proposedHiresMap && proposedHiresMap.has(node.id)) ||
    (!node.name && node.title && !node.employeeId)

  // Check if employee is a future starter
  const isFutureStarter =
    !isProposedHire &&
    node.name &&
    node.startDate &&
    new Date(node.startDate) > new Date()

  // Check if any child is the current employee
  const hasCurrentEmployeeAsChild = (n: HierarchyNode): boolean => {
    if (n.employeeId === currentEmployeeId) return true
    return n.children.some((child) => hasCurrentEmployeeAsChild(child))
  }

  useEffect(() => {
    if (expandAll !== null) {
      setIsExpanded(expandAll)
    }
  }, [expandAll, expandAllCounter, setIsExpanded])

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

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasChildren) {
      setIsExpanded(!isExpanded)
    }
  }

  const handleEmployeeClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    // If navigation is disabled but we have a callback, call it
    if (
      disableNavigation &&
      onNodeClick &&
      !isTeamNode &&
      node.employeeId &&
      node.employeeId !== currentEmployeeId
    ) {
      onNodeClick(node.employeeId)
      return
    }
    // Only navigate if it's an employee node (not a team node) and navigation is not disabled
    if (
      !disableNavigation &&
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

  const canNavigate =
    !disableNavigation &&
    !isTeamNode &&
    node.employeeId &&
    node.employeeId !== currentEmployeeId

  const canClick =
    (canNavigate || (disableNavigation && onNodeClick)) &&
    !isTeamNode &&
    node.employeeId &&
    node.employeeId !== currentEmployeeId

  return (
    <div ref={nodeRef}>
      <div
        className={cn(
          'flex items-center gap-1 rounded text-sm',
          !isTeamNode && canClick && 'hover:bg-gray-100',
          isCurrentEmployee && 'bg-blue-50 font-semibold',
          isTeamNode && 'font-medium text-gray-700',
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={handleExpandClick}
            className="flex h-8 w-6 flex-shrink-0 cursor-pointer items-center justify-center rounded px-2 py-1.5 hover:bg-gray-200"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-gray-500" />
            ) : (
              <ChevronRight className="h-3 w-3 text-gray-500" />
            )}
          </button>
        ) : (
          <div className="h-8 w-6 flex-shrink-0" />
        )}
        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col gap-1 py-1.5 pr-2',
            canClick && 'cursor-pointer',
          )}
          onClick={handleEmployeeClick}
        >
          <div className="flex items-center gap-2">
            {isProposedHire ? (
              <span className="truncate text-xs text-gray-500 italic">
                {node.title}
              </span>
            ) : (
              <span className="truncate">{node.name}</span>
            )}
            {!isTeamNode && !isProposedHire && node.team && (
              <span className="flex-shrink-0 truncate text-xs text-gray-500">
                {node.team}
              </span>
            )}
          </div>
          {isProposedHire && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-violet-600">
                Proposed hire
                {node.hiringPriority
                  ? ` (${node.hiringPriority})`
                  : proposedHiresMap?.get(node.id)?.priority
                    ? ` (${proposedHiresMap.get(node.id)!.priority})`
                    : ''}
              </span>
            </div>
          )}
          {isFutureStarter && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-amber-600" />
              <span className="text-xs font-medium text-amber-600">
                Starts{' '}
                {new Date(node.startDate!).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}
          {node.hasActivePerformanceProgram && (
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-orange-600" />
              <span className="text-xs font-medium text-orange-600">
                Performance Program
              </span>
            </div>
          )}
          {node.childrenCount &&
          (node.childrenCount.active > 0 ||
            node.childrenCount.pending > 0 ||
            node.childrenCount.planned > 0 ||
            node.childrenCount.performanceIssues > 0) ? (
            <div className="flex items-center gap-2 text-xs text-blue-600">
              {node.childrenCount.active > 0 ? (
                <span className="font-medium">
                  {node.childrenCount.active}{' '}
                  {isTeamNode
                    ? node.childrenCount.active === 1
                      ? 'member'
                      : 'members'
                    : node.childrenCount.active === 1
                      ? 'report'
                      : 'reports'}
                </span>
              ) : null}
              <div className="flex items-center gap-2">
                {node.childrenCount.pending > 0 ? (
                  <div className="flex items-center gap-1">
                    <span>{node.childrenCount.pending}</span>
                    <Clock className="h-3 w-3" />
                  </div>
                ) : null}
                {node.childrenCount.planned > 0 ? (
                  <div className="flex items-center gap-1">
                    <span>{node.childrenCount.planned}</span>
                    <CalendarClock className="h-3 w-3" />
                  </div>
                ) : null}
                {node.childrenCount.performanceIssues > 0 ? (
                  <div className="flex items-center gap-1 text-orange-600">
                    <span>{node.childrenCount.performanceIssues}</span>
                    <AlertTriangle className="h-3 w-3" />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
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
              expandAllCounter={expandAllCounter}
              containerRef={containerRef}
              onNodeExpand={onNodeExpand}
              isTeamNode={child.id.startsWith('team-')}
              proposedHiresMap={proposedHiresMap}
              disableNavigation={disableNavigation}
              onNodeClick={onNodeClick}
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
  name: getFullName(emp.firstName, emp.lastName),
  title: emp.title || '',
  team: emp.team || undefined,
  employeeId: emp.employee?.id,
  workEmail: emp.workEmail,
  startDate: emp.startDate,
  hasActivePerformanceProgram:
    emp.employee?.performancePrograms &&
    emp.employee.performancePrograms.length > 0,
  children: [],
})

// Helper to create proposed hire node
const createProposedHireNode = (ph: ProposedHire): HierarchyNode => ({
  id: `employee-${ph.id}`,
  name: '',
  title: ph.title || '',
  team: ph.manager.deelEmployee!.team || undefined,
  employeeId: undefined,
  workEmail: undefined,
  startDate: null,
  hiringPriority: ph.priority as 'low' | 'medium' | 'high',
  children: [],
})

// Helper to filter and map proposed hires by manager
const mapProposedHiresByManager = (
  proposedHires: ProposedHire[],
): Map<string, ProposedHire[]> => {
  const map = new Map<string, ProposedHire[]>()
  proposedHires
    .filter(
      ({ manager, priority }) =>
        manager.deelEmployee && ['low', 'medium', 'high'].includes(priority),
    )
    .forEach((ph) => {
      const managerId = ph.manager.deelEmployee!.id
      if (!map.has(managerId)) map.set(managerId, [])
      map.get(managerId)!.push(ph)
    })
  return map
}

// Helper to create proposed hires map for count calculations
const createProposedHiresMap = (
  proposedHires: ProposedHire[],
): Map<string, ProposedHire> => {
  const map = new Map<string, ProposedHire>()
  proposedHires
    .filter(
      ({ manager, priority }) =>
        manager.deelEmployee && ['low', 'medium', 'high'].includes(priority),
    )
    .forEach((ph) => map.set(`employee-${ph.id}`, ph))
  return map
}

// Helper to sort hierarchy nodes: employees first (by name), then proposed hires (by title)
const sortHierarchyNodes = (a: HierarchyNode, b: HierarchyNode): number => {
  // Sort: employees first (by name), then proposed hires (by title)
  if (a.name && !b.name) return -1
  if (!a.name && b.name) return 1
  if (a.name && b.name) return a.name.localeCompare(b.name)
  return (a.title || '').localeCompare(b.title || '')
}

// Calculate childrenCount for a node (all descendants, excluding the node itself)
const calculateChildrenCount = (
  node: HierarchyNode,
  proposedHiresMap: Map<string, ProposedHire>,
): {
  active: number
  pending: number
  planned: number
  performanceIssues: number
} => {
  let active = 0
  let pending = 0
  let planned = 0
  let performanceIssues = 0

  const countDescendants = (n: HierarchyNode) => {
    // Skip team nodes - only count employee nodes
    if (n.id.startsWith('team-')) {
      n.children.forEach(countDescendants)
      return
    }

    // Check if it's a proposed hire
    const proposedHire = proposedHiresMap.get(n.id)
    if (
      proposedHire &&
      ['low', 'medium', 'high'].includes(proposedHire.priority)
    ) {
      planned++
    } else if (n.name) {
      // It's a real employee - check start date
      if (n.startDate) {
        const startDate = new Date(n.startDate)
        const now = new Date()
        if (startDate > now) {
          pending++
        } else {
          active++
        }
      } else {
        // No start date means already active
        active++
      }

      // Count performance issues
      if (n.hasActivePerformanceProgram) {
        performanceIssues++
      }
    }

    // Recursively count children
    n.children.forEach(countDescendants)
  }

  // Only count children, not the node itself
  node.children.forEach(countDescendants)
  return { active, pending, planned, performanceIssues }
}

// Transform manager hierarchy to team hierarchy
const buildTeamHierarchy = (
  employees: DeelEmployee[],
  proposedHires: ProposedHire[] = [],
): HierarchyNode[] => {
  const proposedHiresByManager = mapProposedHiresByManager(proposedHires)
  const proposedHiresMap = createProposedHiresMap(proposedHires)
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
  const addedProposedHireIds = new Set<string>()
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

    // Add proposed hires for this team (based on their manager's team)
    const teamProposedHires = Array.from(proposedHiresByManager.values())
      .flat()
      .filter(
        (ph) =>
          ph.manager.deelEmployee?.team === teamName &&
          !addedProposedHireIds.has(ph.id),
      )
      .map((ph) => {
        addedProposedHireIds.add(ph.id)
        return createProposedHireNode(ph)
      })
    employeeNodes.push(...teamProposedHires)

    const teamNode: HierarchyNode = {
      id: `team-${teamName}`,
      name: teamName,
      title: '',
      team: teamName,
      employeeId: undefined,
      workEmail: undefined,
      startDate: null,
      children: employeeNodes.sort(sortHierarchyNodes),
    }

    // Calculate childrenCount
    teamNode.childrenCount = calculateChildrenCount(teamNode, proposedHiresMap)
    return teamNode
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
      .sort((a, b) =>
        getFullName(a.firstName, a.lastName).localeCompare(
          getFullName(b.firstName, b.lastName),
        ),
      )
      .map((emp) => {
        addedEmployeeIds.add(emp.id)
        return buildEmployeeNode(emp.id, visited) || createEmployeeNode(emp)
      })

    // In team view, proposed hires appear in teams, not under managers
    // However, for Blitzscale employees (who don't have team nodes),
    // we need to add their proposed hires as direct children
    const managerProposedHires: HierarchyNode[] = []
    if (employee.team === 'Blitzscale') {
      const blitzscaleProposedHires = (
        proposedHiresByManager.get(employeeId) || []
      )
        .filter((ph) => !addedProposedHireIds.has(ph.id))
        .map((ph) => {
          addedProposedHireIds.add(ph.id)
          return createProposedHireNode(ph)
        })
      managerProposedHires.push(...blitzscaleProposedHires)
    }

    const employeeNode: HierarchyNode = {
      ...createEmployeeNode(employee),
      children: [...teamNodes, ...directReports, ...managerProposedHires].sort(
        sortHierarchyNodes,
      ),
    }

    // Calculate childrenCount
    employeeNode.childrenCount = calculateChildrenCount(
      employeeNode,
      proposedHiresMap,
    )
    return employeeNode
  }

  // Build Blitzscale employee nodes (all at top level)
  const blitzscaleNodes = blitzscaleEmployees
    .sort((a, b) => {
      if (a.title === 'Cofounder' && b.title !== 'Cofounder') return -1
      if (a.title !== 'Cofounder' && b.title === 'Cofounder') return 1
      return getFullName(a.firstName, a.lastName).localeCompare(
        getFullName(b.firstName, b.lastName),
      )
    })
    .map((emp) => {
      addedEmployeeIds.add(emp.id)
      const node =
        buildEmployeeNode(emp.id, new Set()) || createEmployeeNode(emp)
      // Ensure childrenCount is calculated
      if (!node.childrenCount) {
        node.childrenCount = calculateChildrenCount(node, proposedHiresMap)
      }
      return node
    })

  // Find top-level teams (teams without managers)
  const allManagedTeams = new Set(Array.from(managerToTeamsMap.values()).flat())
  const topLevelTeams = Array.from(teamMap.keys())
    .filter((teamName) => !allManagedTeams.has(teamName))
    .map((teamName) => buildTeamNode(teamName, new Set()))
    .sort((a, b) => a.name.localeCompare(b.name))

  return [...blitzscaleNodes, ...topLevelTeams]
}

// Calculate childrenCount for all nodes in manager hierarchy
const calculateManagerHierarchyCounts = (
  node: HierarchyNode,
  proposedHiresMap: Map<string, ProposedHire>,
): void => {
  node.childrenCount = calculateChildrenCount(node, proposedHiresMap)
  node.children.forEach((child) =>
    calculateManagerHierarchyCounts(child, proposedHiresMap),
  )
}

export function ManagerHierarchyTree({
  hierarchy,
  currentEmployeeId,
  expandAll = null,
  expandAllCounter = 0,
  deelEmployees,
  proposedHires = [],
  viewMode = 'manager',
  disableNavigation = false,
  onNodeClick,
}: ManagerHierarchyTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Create proposed hires map for count calculations
  const proposedHiresMap = useMemo(
    () => createProposedHiresMap(proposedHires),
    [proposedHires],
  )

  // Transform hierarchy based on view mode
  const displayHierarchy = useMemo(() => {
    if (viewMode === 'team' && deelEmployees) {
      return buildTeamHierarchy(deelEmployees, proposedHires)
    }
    // Calculate counts for manager hierarchy
    if (hierarchy) {
      const nodes = Array.isArray(hierarchy) ? hierarchy : [hierarchy]
      nodes.forEach((node) =>
        calculateManagerHierarchyCounts(node, proposedHiresMap),
      )
    }
    return hierarchy
  }, [viewMode, hierarchy, deelEmployees, proposedHires, proposedHiresMap])

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
            expandAllCounter={expandAllCounter}
            containerRef={containerRef}
            isTeamNode={node.id.startsWith('team-')}
            proposedHiresMap={proposedHiresMap}
            disableNavigation={disableNavigation}
            onNodeClick={onNodeClick}
          />
        ))}
      </div>
    </div>
  )
}
