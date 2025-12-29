import { useMemo } from 'react'
import type { Edge } from '@xyflow/react'
import { OrgChartNode } from '@/routes/org-chart'
import Dagre from '@dagrejs/dagre'

function createLeafContainer(
  managerId: string,
  children: Array<OrgChartNode>,
  selectedNode: string | null,
) {
  return {
    id: `leaf-container-${managerId}`,
    position: { x: 0, y: 0 },
    type: 'leafContainerNode',
    data: {
      children: children.map((e) => ({
        ...e.data,
        nodeType: e.type,
        selectedNode: selectedNode ? `employee-${selectedNode}` : null,
      })),
    },
  }
}

// Build a map of direct children for each node from the original edges
function buildChildrenMap(edges: Edge[]): Map<string, string[]> {
  const childrenMap = new Map<string, string[]>()
  for (const edge of edges) {
    if (!childrenMap.has(edge.source)) {
      childrenMap.set(edge.source, [])
    }
    childrenMap.get(edge.source)!.push(edge.target)
  }
  return childrenMap
}

// Recursively collect all descendant node IDs (nested reports)
function getAllDescendants(
  nodeId: string,
  childrenMap: Map<string, string[]>,
): Set<string> {
  const descendants = new Set<string>()
  const directChildren = childrenMap.get(nodeId) || []

  for (const childId of directChildren) {
    descendants.add(childId)
    // Recursively get all descendants of this child
    const childDescendants = getAllDescendants(childId, childrenMap)
    for (const descendantId of childDescendants) {
      descendants.add(descendantId)
    }
  }

  return descendants
}

function filterCollapsedChildren(
  dagre: Dagre.graphlib.Graph,
  node: OrgChartNode,
  allNodes: OrgChartNode[],
  childrenMap: Map<string, string[]>,
) {
  // 🚨 The current types for some of dagre's methods are incorrect. In future
  // versions of dagre this should be fixed, but for now we need to cast the return
  // value to keep TypeScript happy.
  const children = dagre.successors(node.id) as unknown as string[] | undefined

  // Calculate childrenCount based on all nested descendants (not just direct children)
  const allDescendantIds = getAllDescendants(node.id, childrenMap)
  let active = 0
  let pending = 0
  let planned = 0
  let performanceIssues = 0

  for (const descendantId of allDescendantIds) {
    const descendantNode = allNodes.find((n) => n.id === descendantId)
    if (!descendantNode) continue

    // Skip team nodes - only count employee nodes (actual employees and proposed hires)
    if (descendantNode.type === 'teamNode') continue

    // Check if it's a proposed hire (has hiringPriority)
    if (
      'hiringPriority' in descendantNode.data &&
      descendantNode.data.hiringPriority
    ) {
      planned++
    } else if (descendantNode.data.name) {
      // It's a real employee - check if start date is in the future
      if (descendantNode.data.startDate) {
        const startDate = new Date(descendantNode.data.startDate)
        const now = new Date()
        if (startDate > now) {
          pending++
        } else {
          active++
        }
      } else {
        // No start date means they're already active
        active++
      }

      // Count performance issues
      if (descendantNode.data.hasActivePerformanceProgram) {
        performanceIssues++
      }
    }
  }

  // Update this node's props so it knows if it has children and can be expanded
  // or not.
  node.data.childrenCount = {
    active,
    pending,
    planned,
    performanceIssues,
  }

  // If the node is collpased (ie it is not expanded) then we want to remove all
  // of its children from the graph *and* any of their children.
  if (!node.data.expanded) {
    const childrenToRemove = [...(children || [])]
    while (childrenToRemove.length) {
      const child = childrenToRemove.pop()!

      childrenToRemove.push(...(dagre.successors(child) as unknown as string[]))
      dagre.removeNode(child)
    }
  }
}

// Create leaf containers for employees without direct reports
function createLeafContainers(
  dagre: Dagre.graphlib.Graph,
  nodes: OrgChartNode[],
  edges: Edge[],
  selectedNode: string | null,
): Record<string, OrgChartNode> {
  const leafContainers: Record<string, OrgChartNode> = {}
  const childrenMap = buildChildrenMap(edges)

  // Find all expanded nodes and create leaf containers for their leaf children
  for (const node of nodes) {
    // Skip root node and nodes that aren't expanded
    if (node.id === 'root-node' || !node.data.expanded) continue

    // Get direct children from dagre (these are visible children)
    const visibleChildren = dagre.successors(node.id) as unknown as
      | string[]
      | undefined

    if (!visibleChildren || visibleChildren.length === 0) continue

    // Find leaf children (those with no direct reports OR not expanded)
    const leafChildren: Array<OrgChartNode> = visibleChildren
      .map((childId) => {
        const foundNode = nodes.find((n) => n.id === childId)
        if (!foundNode) return null

        // Check if this child has any direct reports in the original structure
        const hasDirectReports =
          childrenMap.has(childId) && childrenMap.get(childId)!.length > 0

        // A node is a leaf if:
        // 1. It has no direct reports (true leaf in tree structure), OR
        // 2. It's not expanded (collapsed, so we treat it as a leaf visually)
        const isLeaf = !hasDirectReports || !foundNode.data.expanded

        return isLeaf ? foundNode : null
      })
      .filter((n): n is OrgChartNode => n !== null)

    // Only create container if there are leaf children to group
    if (leafChildren.length > 0) {
      const container = createLeafContainer(node.id, leafChildren, selectedNode)
      leafContainers[container.id] = container as unknown as OrgChartNode

      // Remove leaf nodes from dagre since they'll be in the container
      for (const leafNode of leafChildren) {
        dagre.removeNode(leafNode.id)
      }

      // Add container to dagre with appropriate dimensions
      dagre.setNode(container.id, {
        width: (leafChildren.length >= 2 ? 448 : 232) * 1.4,
        height: Math.ceil(leafChildren.length / 2) * 116 + 18,
        data: container.data,
      })

      // Remove edges from parent to individual leaf children
      for (const leafNode of leafChildren) {
        if (dagre.hasEdge(node.id, leafNode.id)) {
          dagre.removeEdge(node.id, leafNode.id)
        }
      }

      // Add edge from parent to container
      dagre.setEdge(node.id, container.id)
    }
  }

  return leafContainers
}

function useExpandCollapse(
  nodes: OrgChartNode[],
  edges: Edge[],
  selectedNode: string | null,
): { nodes: OrgChartNode[]; edges: Edge[] } {
  return useMemo(() => {
    // 1. Create a new instance of `Dagre.graphlib.Graph` and set some default
    // properties.
    const dagre = new Dagre.graphlib.Graph()
      .setDefaultEdgeLabel(() => ({}))
      .setGraph({ rankdir: 'TB' })

    // 2. Add each node and edge to the dagre graph.
    for (const node of nodes) {
      dagre.setNode(node.id, {
        width: 200,
        height: 100,
        data: node.data,
      })
    }

    for (const edge of edges) {
      dagre.setEdge(edge.source, edge.target)
    }

    // Build children map before filtering
    const childrenMap = buildChildrenMap(edges)

    // 3. Iterate over the nodes *again* to determine which ones should be hidden
    // based on expand/collapse state. Hidden nodes are removed from the dagre
    // graph entirely.
    for (const node of nodes) {
      filterCollapsedChildren(dagre, node, nodes, childrenMap)
    }

    // 4. Create leaf containers for employees without direct reports
    const leafContainers = createLeafContainers(
      dagre,
      nodes,
      edges,
      selectedNode,
    )

    // 5. Run the dagre layouting algorithm.
    Dagre.layout(dagre)

    // 6. Build edges from dagre graph (includes container edges we added)
    const dagreEdges = dagre.edges().map((edge) => {
      const edgeId = `${edge.v}-${edge.w}`
      // Find original edge if it exists to preserve type
      const originalEdge = edges.find(
        (e) => e.source === edge.v && e.target === edge.w,
      )
      return {
        id: edgeId,
        source: edge.v,
        target: edge.w,
        type: originalEdge?.type || 'smoothstep',
      }
    })

    return {
      // 7. Return a new array of layouted nodes. This will not include any nodes
      // that were removed from the dagre graph in step 3 or step 4.
      //
      // 💡 `Array.flatMap` can act as a *filter map*. If we want to remove an
      // element from the array, we can return an empty array in this iteration.
      // Otherwise, we can map the element like normal and wrap it in a singleton
      // array.
      nodes: [...nodes, ...Object.values(leafContainers)].flatMap((node) => {
        // This node might have been filtered out by `filterCollapsedChildren` if
        // any of its ancestors were collpased, or if it's in a leaf container.
        if (!dagre.hasNode(node.id)) return []

        const { x, y } = dagre.node(node.id)

        const position = { x, y }
        // 🚨 `filterCollapsedChildren` *mutates* the data object of a node. React
        // will not know the data has changed unless we create a new object here.
        const data = {
          ...node.data,
          selectedNode: selectedNode ? `employee-${selectedNode}` : null,
        }

        return [{ ...node, position, data }]
      }),
      edges: dagreEdges,
    }
  }, [nodes, edges, selectedNode])
}

export default useExpandCollapse
