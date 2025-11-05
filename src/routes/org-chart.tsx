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
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useEffect, useState } from 'react'

import { createServerFn } from '@tanstack/react-start'
import type { Prisma } from '@prisma/client'
import EmployeePanel from '@/components/EmployeePanel'
import prisma from '@/db'
import { nodeTypes } from '@/lib/org-chart/nodes'
import useExpandCollapse from '@/lib/org-chart/useExpandCollapse'
import OrgChartPanel from '@/components/OrgChartPanel'

type DeelEmployee = Prisma.DeelEmployeeGetPayload<{
  include: {
    employee: true
  }
}>

export type OrgChartNode = Node<{
  id: string
  name: string
  title?: string
  team?: string
  manager?: string
  startDate?: Date
  expanded: boolean
  childrenCount?: number
  toggleExpanded: () => void
  handleClick?: (id: string) => void
  selectedNode: string | null
}>

export const getDeelEmployees = createServerFn({
  method: 'GET',
}).handler(async () => {
  return await prisma.deelEmployee.findMany({
    include: {
      employee: true,
    },
  })
})

export const Route = createFileRoute('/org-chart')({
  component: () => (
    <ReactFlowProvider>
      <OrgChart />
    </ReactFlowProvider>
  ),
  loader: async () => await getDeelEmployees(),
})

const getInitialNodes = (
  employees: Array<DeelEmployee>,
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

  return [blitzscaleNode, ...employeeNodes].map((node) => ({
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

const getInitialEdges = (employees: Array<DeelEmployee>): Array<Edge> => {
  const blitzscaleEdges = employees
    .filter((employee) => employee.title === 'Cofounder')
    .map((employee) => ({
      id: `root-edges-${employee.id}`,
      source: 'root-node',
      target: `employee-${employee.id}`,
    }))

  const edges = employees
    .filter((employee) => employee.managerId)
    .map((employee) => ({
      id: `employee-${employee.managerId}-${employee.id}`,
      source: `employee-${employee.managerId}`,
      target: `employee-${employee.id}`,
    }))

  return [...blitzscaleEdges, ...edges].map((edge) => ({
    ...edge,
    type: 'smoothstep',
  }))
}

export default function OrgChart() {
  const employees: Array<DeelEmployee> = Route.useLoaderData()
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [nodes, setNodes] = useState<Array<OrgChartNode>>(
    getInitialNodes(employees).map((node) => ({
      ...node,
      data: {
        ...node.data,
        toggleExpanded: () => toggleExpanded(node),
        handleClick: (id) => setSelectedNode(id.replace('employee-', '')),
      },
    })),
  )
  const [edges] = useState<Array<Edge>>(getInitialEdges(employees))
  const { fitView } = useReactFlow()

  const { nodes: visibleNodes, edges: visibleEdges } = useExpandCollapse(
    nodes,
    edges,
    selectedNode,
  )

  // expand all parent nodes of a selected node (for search)
  useEffect(() => {
    if (!selectedNode) return

    const parentIds = new Set<string>()
    let currentNode = nodes.find((n) => n.id === `employee-${selectedNode}`)
    const directParentId = currentNode?.data.manager
    const initialNodeExpanded =
      currentNode?.data.expanded || currentNode?.data.title === 'Cofounder'

    while (currentNode) {
      if (currentNode.data.title === 'Cofounder') {
        parentIds.add('root-node')
        break
      }
      if (!currentNode.data.manager) break
      const parentId = `employee-${currentNode.data.manager}`
      parentIds.add(parentId)
      currentNode = nodes.find((n) => n.id === parentId)
    }

    if (parentIds.size > 0) {
      setNodes((nds) =>
        nds.map((n) =>
          parentIds.has(n.id) && !n.data.expanded
            ? { ...n, data: { ...n.data, expanded: true } }
            : n,
        ),
      )
    }

    fitView({
      nodes: [
        initialNodeExpanded
          ? {
              id: `employee-${selectedNode}`,
            }
          : {
              id: `leaf-container-employee-${directParentId}`,
            },
      ],
      duration: 300,
    })
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

      fitView({
        nodes: [
          {
            id:
              expanded || node.data.title === 'Cofounder'
                ? node.id
                : `leaf-container-employee-${node.data.manager}`,
          },
        ],
        duration: 300,
      })
    },
    [fitView],
  )

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={visibleNodes}
        edges={visibleEdges}
        nodeTypes={nodeTypes}
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
          />
        </Panel>

        <EmployeePanel employeeId={selectedNode} employees={employees} />
      </ReactFlow>
    </div>
  )
}
