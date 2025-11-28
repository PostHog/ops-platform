import { createFileRoute } from '@tanstack/react-router'
import type { Edge, Node } from '@xyflow/react'
import {
  Background,
  BackgroundVariant,
  Controls,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  getIncomers,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useEffect, useState } from 'react'

import type { Prisma } from '@prisma/client'
import EmployeePanel from '@/components/EmployeePanel'
import prisma from '@/db'
import { nodeTypes } from '@/lib/org-chart/nodes'
import useExpandCollapse from '@/lib/org-chart/useExpandCollapse'
import OrgChartPanel from '@/components/OrgChartPanel'
import AddProposedHirePanel from '@/components/AddProposedHirePanel'
import { createOrgChartFn } from '@/lib/auth-middleware'
import { useLocalStorage } from 'usehooks-ts'

export type OrgChartMode = 'manager' | 'team'

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

type ProposedHire = Prisma.ProposedHireGetPayload<{
  include: {
    manager: {
      select: {
        id: true
        email: true
        deelEmployee: true
      }
    }
    talentPartners: {
      select: {
        id: true
        email: true
        deelEmployee: true
      }
    }
  }
}>

type ProposedHireFields = {
  hiringPriority?: 'low' | 'medium' | 'high'
  hiringProfile?: string
}

export type OrgChartNode = Node<
  {
    id: string
    name: string
    title?: string
    team?: string
    manager?: string
    managerTeam?: string
    startDate?: Date
    expanded: boolean
    childrenCount?: {
      active: number
      pending: number
      planned: number
    }
    toggleExpanded: () => void
    handleClick?: (id: string) => void
    selectedNode: string | null
  } & ProposedHireFields
>

export const getDeelEmployeesAndProposedHires = createOrgChartFn({
  method: 'GET',
}).handler(async () => {
  const employees = await prisma.deelEmployee.findMany({
    include: {
      employee: {
        select: {
          id: true,
          email: true,
        },
      },
      manager: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  const proposedHires = await prisma.proposedHire.findMany({
    include: {
      manager: {
        select: {
          id: true,
          email: true,
          deelEmployee: true,
        },
      },
      talentPartners: {
        select: {
          id: true,
          email: true,
          deelEmployee: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  return { employees, proposedHires }
})

export const Route = createFileRoute('/org-chart')({
  component: () => (
    <ReactFlowProvider>
      <OrgChart />
    </ReactFlowProvider>
  ),
  loader: async () => await getDeelEmployeesAndProposedHires(),
})

const getInitialNodes = (
  employees: Array<DeelEmployee>,
  proposedHires: Array<ProposedHire>,
  viewMode: OrgChartMode,
): Array<OrgChartNode> => {
  const blitzscaleNode = {
    id: 'root-node',
    position: { x: 0, y: 0 },
    type: 'teamNode',
    data: {
      name: 'PostHog',
    },
  }

  const employeeNodes = employees.map((employee) => ({
    id: `employee-${employee.id}`,
    position: { x: 0, y: 0 },
    type: 'employeeNode',
    data: {
      name: employee.name,
      title: employee.title,
      team: employee.team,
      manager: employee.managerId,
      startDate: employee.startDate,
    },
  }))

  const seenTeams = new Set<string>()
  const teamNodes = employees
    .filter(({ team }) => !['', 'Blitzscale'].includes(team))
    .map((employee) => {
      if (seenTeams.has(employee.team)) return null
      seenTeams.add(employee.team)
      const teamLead = findTeamLead(employees, employee)
      return {
        id: `team-${employee.team}`,
        position: { x: 0, y: 0 },
        type: 'teamNode',
        data: {
          name: employee.team,
          ...(teamLead ? { manager: teamLead.managerId } : {}),
        },
      }
    })
    .filter(Boolean) as OrgChartNode[]

  const proposedHireNodes = proposedHires
    .filter(
      ({ manager, priority }) =>
        manager.deelEmployee && ['low', 'medium', 'high'].includes(priority),
    )
    .map(({ id, title, manager, priority, hiringProfile }) => ({
      id: `employee-${id}`,
      position: { x: 0, y: 0 },
      type: 'employeeNode',
      data: {
        name: '',
        title: title,
        team: manager.deelEmployee!.team,
        manager: manager.deelEmployee!.id,
        hiringPriority: priority,
        hiringProfile,
      },
    }))

  return [
    blitzscaleNode,
    ...(viewMode === 'team' ? teamNodes : []),
    ...employeeNodes,
    ...proposedHireNodes,
  ].map((node) => ({
    ...node,
    data: {
      id: node.id,
      ...node.data,
      expanded: ['root-node'].includes(node.id),
      toggleExpanded: () => {},
      selectedNode: null,
    },
  }))
}

const findTeamLead = (
  employees: Array<DeelEmployee>,
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

const getInitialEdges = (
  employees: Array<DeelEmployee>,
  proposedHires: Array<ProposedHire>,
  viewMode: OrgChartMode,
): Array<Edge> => {
  const blitzscaleEdges = employees
    .filter((employee) =>
      viewMode === 'manager'
        ? employee.title === 'Cofounder'
        : employee.team === 'Blitzscale',
    )
    .map((employee) => ({
      id: `root-edges-${employee.id}`,
      source: 'root-node',
      target: `employee-${employee.id}`,
    }))

  const edges =
    viewMode === 'manager'
      ? employees
          .filter((employee) => employee.managerId)
          .map((employee) => ({
            id: `employee-${employee.managerId}-${employee.id}`,
            source: `employee-${employee.managerId}`,
            target: `employee-${employee.id}`,
          }))
      : ([
          ...employees
            .filter(
              (employee) => employee.team && employee.team !== 'Blitzscale',
            )
            .map((employee) => ({
              id: `employee-team-${employee.team}-${employee.id}`,
              source: `team-${employee.team}`,
              target: `employee-${employee.id}`,
            })),
          ...new Set(
            employees
              .filter(
                (employee) => employee.team && employee.team !== 'Blitzscale',
              )
              .map((employee) => {
                const teamLead = findTeamLead(employees, employee)

                if (!teamLead || !teamLead.managerId) {
                  return null
                }

                return {
                  id: `manager-team-edge-${teamLead.managerId}-${teamLead.team}`,
                  source: `employee-${teamLead.managerId}`,
                  target: `team-${teamLead.team}`,
                }
              })
              .filter(Boolean),
          ),
        ] as Edge[])

  const proposedHireEdges = proposedHires
    .filter(
      ({ manager, priority }) =>
        manager.deelEmployee && ['low', 'medium', 'high'].includes(priority),
    )
    .map(({ id, manager }) =>
      viewMode === 'manager'
        ? {
            id: `proposedHire-${manager.deelEmployee!.id}-${id}`,
            source: `employee-${manager.deelEmployee!.id}`,
            target: `employee-${id}`,
          }
        : {
            id: `proposedHire-${manager.deelEmployee!.team}-${id}`,
            source: `team-${manager.deelEmployee!.team}`,
            target: `employee-${id}`,
          },
    )

  return [...blitzscaleEdges, ...edges, ...proposedHireEdges].map((edge) => ({
    ...edge,
    type: 'smoothstep',
  }))
}

export default function OrgChart() {
  const { employees, proposedHires } = Route.useLoaderData()
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [viewMode, setViewMode] = useLocalStorage<OrgChartMode>(
    'org-chart.viewMode',
    'manager',
  )

  const [nodes, setNodes] = useState<Array<OrgChartNode>>(
    getInitialNodes(employees, proposedHires, viewMode).map((node) => ({
      ...node,
      data: {
        ...node.data,
        toggleExpanded: () => toggleExpanded(node),
        handleClick: (id: string) =>
          setSelectedNode(id.replace('employee-', '')),
      },
    })),
  )
  const [edges, setEdges] = useState<Array<Edge>>(
    getInitialEdges(employees, proposedHires, viewMode),
  )
  const { fitView } = useReactFlow()

  useEffect(() => {
    setEdges(getInitialEdges(employees, proposedHires, viewMode))
    setNodes(
      getInitialNodes(employees, proposedHires, viewMode).map((node) => ({
        ...node,
        data: {
          ...node.data,
          toggleExpanded: () => toggleExpanded(node),
          handleClick: (id: string) =>
            setSelectedNode(id.replace('employee-', '')),
        },
      })),
    )
    fitView()
  }, [viewMode])

  const { nodes: visibleNodes, edges: visibleEdges } = useExpandCollapse(
    nodes,
    edges,
    selectedNode,
  )

  // expand all parent nodes of a selected node (for search)
  const focusNode = (id: string) => {
    const nodeId = `employee-${id}`
    const currentNode = nodes.find((n) => n.id === nodeId)
    if (!currentNode) return

    const initialNodeExpanded =
      currentNode.data.expanded ||
      currentNode.data.title === 'Cofounder' ||
      !currentNode.data.manager

    // Collect all parent node IDs using React Flow's getIncomers
    const parentIds = new Set<string>()
    const collectParents = (node: OrgChartNode) => {
      // Special case: Cofounder nodes connect to root-node
      if (node.data.title === 'Cofounder') {
        parentIds.add('root-node')
        return
      }

      const incomers = getIncomers(node, nodes, edges)
      for (const parent of incomers) {
        if (!parentIds.has(parent.id)) {
          parentIds.add(parent.id)
          collectParents(parent as OrgChartNode)
        }
      }
    }

    collectParents(currentNode)

    if (parentIds.size > 0) {
      setNodes((nds) =>
        nds.map((n) =>
          parentIds.has(n.id) && !n.data.expanded
            ? { ...n, data: { ...n.data, expanded: true } }
            : n,
        ),
      )
    }

    if (viewMode === 'manager') {
      fitView({
        nodes: [
          initialNodeExpanded
            ? {
                id: nodeId,
              }
            : {
                id: `leaf-container-employee-${currentNode.data.manager}`,
              },
        ],
        duration: 300,
      })
    } else {
      if (currentNode.data.team === 'Blitzscale') {
        fitView({ nodes: [{ id: currentNode.id }], duration: 300 })
        return
      }
      fitView({
        nodes: [
          initialNodeExpanded
            ? {
                id: nodeId,
              }
            : {
                id: `leaf-container-team-${currentNode.data.team}`,
              },
        ],
        duration: 300,
      })
    }
  }

  useEffect(() => {
    if (!selectedNode) return
    focusNode(selectedNode)
  }, [selectedNode])

  const toggleExpanded = useCallback(
    (node: OrgChartNode) => {
      let expanded = false
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === node.id) {
            expanded = !n.data.expanded
            return {
              ...n,
              data: { ...n.data, expanded: expanded },
            }
          }

          return n
        }),
      )

      if (node.id === 'root-node') {
        fitView({ duration: 300 })
      } else if (viewMode === 'manager') {
        fitView({
          nodes: [
            {
              id:
                node.data.title === 'Cofounder' && !expanded
                  ? node.id
                  : expanded
                    ? `leaf-container-${node.id}`
                    : `leaf-container-employee-${node.data.manager}`,
            },
          ],
          duration: 300,
        })
      } else {
        fitView({
          nodes: [
            {
              id:
                node.data.team === 'Blitzscale' && !expanded
                  ? node.id
                  : expanded
                    ? `leaf-container-${node.id}`
                    : node.type === 'employeeNode'
                      ? `leaf-container-team-${node.data.team}`
                      : `leaf-container-employee-${node.data.manager}`,
            },
          ],
          duration: 300,
        })
      }
    },
    [fitView, viewMode],
  )

  // Update proposed hire nodes when proposedHires changes
  useEffect(() => {
    const proposedHireMap = new Map(
      proposedHires
        .filter(
          ({ manager, priority }) =>
            manager.deelEmployee &&
            ['low', 'medium', 'high'].includes(priority),
        )
        .map((ph) => [`employee-${ph.id}`, ph]),
    )
    const proposedHireIds = new Set(proposedHireMap.keys())

    setNodes((currentNodes) => {
      const updatedNodes = currentNodes
        // Remove proposed hires that no longer exist, update ones that do
        .filter((node) => {
          const isProposedHire = 'hiringPriority' in node.data
          return !isProposedHire || proposedHireIds.has(node.id)
        })
        .map((node) => {
          const proposedHire = proposedHireMap.get(node.id)
          if (proposedHire) {
            return {
              ...node,
              data: {
                ...node.data,
                title: proposedHire.title,
                manager: proposedHire.manager.deelEmployee!.id,
                hiringPriority: proposedHire.priority as
                  | 'low'
                  | 'medium'
                  | 'high',
                hiringProfile: proposedHire.hiringProfile,
              },
            }
          }
          return node
        })

      // Add new proposed hire nodes
      const existingIds = new Set(updatedNodes.map((n) => n.id))
      proposedHires
        .filter(
          ({ manager, priority }) =>
            manager.deelEmployee &&
            ['low', 'medium', 'high'].includes(priority),
        )
        .forEach(({ id, title, manager, priority, hiringProfile }) => {
          const nodeId = `employee-${id}`
          if (!existingIds.has(nodeId)) {
            const newNode: OrgChartNode = {
              id: nodeId,
              position: { x: 0, y: 0 },
              type: 'employeeNode',
              data: {
                id: nodeId,
                name: '',
                title,
                team: '',
                manager: manager.deelEmployee!.id,
                managerTeam: manager.deelEmployee!.team,
                hiringPriority: priority as 'low' | 'medium' | 'high',
                hiringProfile,
                expanded: false,
                toggleExpanded: () => toggleExpanded(newNode),
                handleClick: (id: string) =>
                  setSelectedNode(id.replace('employee-', '')),
                selectedNode: null,
              },
            }
            updatedNodes.push(newNode)
          }
        })

      return updatedNodes
    })

    setEdges((currentEdges) => {
      const employeeEdges = currentEdges.filter(
        (edge) => !edge.id.startsWith('proposedHire-'),
      )
      const newProposedHireEdges = proposedHires
        .filter(
          ({ manager, priority }) =>
            manager.deelEmployee &&
            ['low', 'medium', 'high'].includes(priority),
        )
        .map(({ id, manager }) =>
          viewMode === 'manager'
            ? {
                id: `proposedHire-${manager.deelEmployee!.id}-${id}`,
                source: `employee-${manager.deelEmployee!.id}`,
                target: `employee-${id}`,
              }
            : {
                id: `proposedHire-${manager.deelEmployee!.team}-${id}`,
                source: `team-${manager.deelEmployee!.team}`,
                target: `employee-${id}`,
              },
        )
      return [...employeeEdges, ...newProposedHireEdges]
    })
  }, [proposedHires])

  // Ensure employee nodes stay in sync with latest team/manager info
  useEffect(() => {
    const employeeMap = new Map(
      employees.map((employee) => [`employee-${employee.id}`, employee]),
    )

    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        const employee = employeeMap.get(node.id)
        if (!employee) return node

        const hasTeamChange = node.data.team !== employee.team
        const hasManagerChange = node.data.manager !== employee.managerId

        if (!hasTeamChange && !hasManagerChange) {
          return node
        }

        return {
          ...node,
          data: {
            ...node.data,
            team: employee.team,
            manager: employee.managerId ?? undefined,
          },
        }
      }),
    )

    setEdges(getInitialEdges(employees, proposedHires, viewMode))
  }, [employees])

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={visibleNodes}
        edges={visibleEdges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        edgesFocusable={false}
        edgesReconnectable={false}
        onPaneClick={() => setSelectedNode(null)}
        fitView
      >
        <Background gap={36} variant={BackgroundVariant.Dots} />

        <Controls showInteractive={false} />

        <Panel position="top-left">
          <OrgChartPanel
            employees={employees}
            selectedNode={selectedNode}
            setSelectedNode={setSelectedNode}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </Panel>

        <Panel position="top-right">
          <AddProposedHirePanel employees={employees} />
        </Panel>

        <EmployeePanel
          selectedNode={selectedNode}
          employees={employees}
          proposedHires={proposedHires}
        />
      </ReactFlow>
    </div>
  )
}
