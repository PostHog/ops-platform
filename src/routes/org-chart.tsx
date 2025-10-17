import { createFileRoute } from '@tanstack/react-router'
import { ReactFlow, Handle, Position, Background, useReactFlow, ReactFlowProvider, Edge, Node, getOutgoers, getIncomers, BackgroundVariant, Controls } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useLayoutEffect, useState, memo, useMemo, useEffect } from 'react'
import ELK from 'elkjs/lib/elk.bundled.js'

import '@xyflow/react/dist/style.css'
import { createServerFn } from '@tanstack/react-start'

type DeelEmployee = {
    id: string
    name: string
    title: string
    team: string
    manager: string
}

const getDeelEmployees = createServerFn({
    method: 'GET',
})
    .handler(async () => {
        let cursor = 1
        let allUsers: DeelEmployee[] = []
        let hasMore = true

        while (hasMore) {
            const response = await fetch(`https://api.letsdeel.com/scim/v2/Users?startIndex=${cursor}&count=100`, {
                headers: {
                    'Authorization': `Bearer ${process.env.DEEL_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            })
            if (response.status !== 200) {
                throw new Error(`Failed to fetch employees: ${response.statusText}`)
            }
            const data = await response.json()
            allUsers = [
                ...allUsers,
                ...data.Resources
                    .filter((employee: any) => employee.active && employee['urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'].customFields.full_time_headcount === 'Full-Time')
                    .map((employee: any) => ({
                        id: employee.id,
                        name: employee.name.givenName + " " + employee.name.familyName,
                        title: employee.title,
                        team: employee["urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"].department,
                        manager: employee["urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"].manager.value,
                    }))]
            hasMore = data.totalResults > 100
            cursor += 100
        }

        return allUsers
    })


export const Route = createFileRoute('/org-chart')({
    component: () => <ReactFlowProvider><OrgChart /></ReactFlowProvider>,
    loader: async () => await getDeelEmployees(),
})

function getDescendantsCount(node: Node, nodes: Node[], edges: Edge[]): number {
    const outgoers = getOutgoers(node, nodes, edges)
        .filter((node, index, array) => array.findIndex(n => n.id === node.id) === index)
    return (
        outgoers.length +
        outgoers.reduce((acc, child) => acc + getDescendantsCount(child, nodes, edges), 0)
    )
}

function shouldNodeHide(node: Node, nodes: Node[], edges: Edge[]): boolean {
    const parents = getIncomers(node, nodes, edges)

    if (parents.length === 0) {
        return false
    }

    for (const parent of parents) {
        if (parent.data.showingChildren === false) {
            return true
        }
    }

    return parents.some((parent) => shouldNodeHide(parent, nodes, edges))
}

function shouldEdgeHide(edge: Edge, nodes: Node[], edges: Edge[]): boolean {
    const sourceNode = nodes.find(node => node.id === edge.source)
    const targetNode = nodes.find(node => node.id === edge.target)

    return (
        (!!sourceNode && shouldNodeHide(sourceNode, nodes, edges)) ||
        (!!targetNode && shouldNodeHide(targetNode, nodes, edges))
    )
}

const getLayoutedElements = (nodes: Node[], edges: Edge[]): Promise<{ nodes: Node[], edges: Edge[] }> => {
    const graph = {
        id: 'root',
        layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': 'DOWN',
            "elk.edgeRouting": "POLYLINE",
            'elk.layered.spacing.nodeNodeBetweenLayers': '50',
            "elk.spacing.nodeNode": "50",
            "elk.spacing.edgeNode": "50",
        },
        children: nodes.map((node) => ({
            ...node,
            width: 250,
            height: 100,
        })),
        edges: edges.map(edge => ({
            id: edge.id,
            sources: [edge.source],
            targets: [edge.target],
            type: edge.type,
        })),
    }

    const elk = new ELK()

    return elk.layout(graph).then((layoutedGraph) => ({
        nodes: layoutedGraph.children!.map((node) => ({
            ...node,
            position: { x: node.x!, y: node.y! },
            sourcePosition: Position.Bottom,
            targetPosition: Position.Top,
        })),
        edges: layoutedGraph.edges!.map(edge => ({
            id: edge.id,
            source: edge.sources![0],
            target: edge.targets![0],
            type: 'smoothstep',
        })),
    }))
}

export default function OrgChart() {
    const [allNodes, setAllNodes] = useState<Node[]>([])
    const [allEdges, setAllEdges] = useState<Edge[]>([])
    const [layoutKey, setLayoutKey] = useState(0)
    const { fitView } = useReactFlow()
    const employees: DeelEmployee[] = Route.useLoaderData()

    const teamNodes = [...new Set(employees.map(employee => employee.team))]
        .map((teamName) => ({
            id: `team-${teamName}`,
            position: { x: 0, y: 0 },
            type: 'teamNode',
            data: {
                name: teamName,
                descendantsCount: 0, // Will be calculated later
                showingChildren: true,
            },
        }))

    const employeeNodes = employees
        .map((employee) => ({
            id: `employee-${employee.id}`,
            position: { x: 0, y: 0 },
            type: 'employeeNode',
            data: {
                name: employee.name,
                title: employee.title,
                team: employee.team,
                manager: employee.manager,
                descendantsCount: 0, // Will be calculated later
                showingChildren: true,
            },
        }))

    const getInitialNodes = useCallback(() => [
        ...teamNodes,
        ...employeeNodes
    ], [])

    function createSetShowingChildren(
        setNodes: (updater: (nodes: Node[]) => Node[]) => void,
        updateVisibility: () => void,
        nodeId: string
    ) {
        return (showingChildren: boolean) => {
            setNodes(nodes =>
                nodes.map(node =>
                    node.id === nodeId
                        ? {
                            ...node,
                            data: {
                                ...node.data,
                                showingChildren,
                            }
                        }
                        : node
                )
            )
            updateVisibility()
        }
    }

    function enhanceNodesWithDescendantsCount(
        nodes: Node[],
        edges: Edge[],
        setNodes: (updater: (nodes: Node[]) => Node[]) => void,
        updateVisibility: () => void
    ): Node[] {
        return nodes.map(node => ({
            ...node,
            data: {
                ...node.data,
                descendantsCount: getDescendantsCount(node, nodes, edges),
                setShowingChildren: createSetShowingChildren(setNodes, updateVisibility, node.id),
            }
        }))
    }

    const getTopLevelManager = (employee: typeof employees[number]): typeof employees[number] | undefined => {
        let manager = employees.find(e => e.id === employee.manager)
        if (manager && manager.team !== 'Blitzscale' && manager.manager) {
            manager = getTopLevelManager(manager)
        }
        return manager
    }

    const blitzscaleEdges = employees.map((employee) => {
        const topLevelManager = getTopLevelManager(employee)
        if (!topLevelManager || employee.team === 'Blitzscale') return null
        return {
            id: employee.team,
            source: `employee-${topLevelManager?.id}`,
            target: `team-${employee.team}`,
        }
    })
        .filter((edge) => edge !== null)
        .filter((edge, index, array) => array.findIndex((e) => e?.id === edge?.id) === index)

    const teamEdges = employees.map((employee) => ({
        id: `team-${employee.team}-${employee.name}`,
        source: `team-${employee.team}`,
        target: `employee-${employee.id}`,
    }))

    const getInitialEdges = useCallback(() => [
        ...blitzscaleEdges,
        ...teamEdges
    ].filter((edge, index, array) =>
        array.findIndex(e => e.id === edge.id) === index
    ), [])

    const setNodesWithEnhancement = (updater: (nodes: Node[]) => Node[]) => {
        setAllNodes(updater)
    }

    const updateNodeVisibility = useCallback(() => {
        setAllNodes(current => [...current])
        setLayoutKey(prev => prev + 1)
    }, [])

    const onLayout = ({ nodes, edges }: { nodes: Node[], edges: Edge[] }) => {
        const visibleNodes = nodes.filter(node => !shouldNodeHide(node, allNodes, allEdges))
        const hiddenNodes = nodes.filter(node => shouldNodeHide(node, allNodes, allEdges))
        const visibleEdges = edges.filter(edge => !shouldEdgeHide(edge, allNodes, allEdges))
        const hiddenEdges = edges.filter(edge => shouldEdgeHide(edge, allNodes, allEdges))

        getLayoutedElements(visibleNodes, visibleEdges).then(
            ({ nodes: layoutedNodes, edges: layoutedEdges }) => {
                setAllNodes([...layoutedNodes, ...hiddenNodes])
                setAllEdges([...layoutedEdges, ...hiddenEdges])
                fitView()
            },
        )
    }

    useLayoutEffect(() => {
        const nodes = enhanceNodesWithDescendantsCount(getInitialNodes(), getInitialEdges(), setNodesWithEnhancement, updateNodeVisibility)
        const edges = getInitialEdges()

        onLayout({ nodes, edges })
    }, [])

    useEffect(() => {
        if (allNodes.length > 0) {
            onLayout({
                nodes: allNodes,
                edges: allEdges
            })
        }
    }, [layoutKey])

    const nodeTypes = useMemo(
        () => ({
            employeeNode: EmployeeNode,
            teamNode: TeamNode,
        }),
        [],
    )

    const visibleNodes = allNodes.filter(node => !shouldNodeHide(node, allNodes, allEdges))
    const visibleEdges = allEdges.filter(edge => !shouldEdgeHide(edge, allNodes, allEdges))

    return (
        <div className="h-full w-full">
            <ReactFlow
                nodes={visibleNodes}
                edges={visibleEdges}
                nodeTypes={nodeTypes}
                fitView
            >
                <Background gap={36} variant={BackgroundVariant.Dots} />

                <Controls showInteractive={false} />
            </ReactFlow>
        </div>
    )
}

const NodeHandles = () => {
    return (
        <>
            <Handle type="target" position={Position.Top} isConnectable={false} className="opacity-0" />
            <Handle type="source" position={Position.Bottom} isConnectable={false} className="opacity-0" />
        </>
    )
}

const EmployeeNode = memo(function EmployeeNode({ data }: { data: { name: string, title: string, team: string, row?: number, totalRows?: number, descendantsCount?: number, showingChildren: boolean, setShowingChildren?: (showingChildren: boolean) => void } }) {
    return (
        <div className="h-full max-h-full transition-all hover:translate-y-[-2px]">
            <div className="w-full h-full flex justify-center items-center px-4 py-3 shadow-md rounded-md bg-white border-2 border-stone-400 min-w-[200px]">
                <div className="flex items-center max-w-[80%]">
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate">{data.name}</div>
                        <div className="text-gray-500 text-xs truncate">{data.title}</div>
                        <div className="text-gray-400 text-xs truncate">{data.team}</div>
                        {data.descendantsCount !== undefined && data.descendantsCount > 0 && (
                            <div className="flex items-center gap-2 mt-1">
                                <div className="text-blue-600 text-xs font-medium">{data.descendantsCount} {data.descendantsCount === 1 ? 'descendant' : 'descendants'}</div>
                                <button
                                    onClick={() => data.setShowingChildren?.(!data.showingChildren)}
                                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                >
                                    {data.showingChildren ? 'Hide' : 'Show'}
                                </button>
                            </div>
                        )}
                        {data.totalRows && data.totalRows > 1 && (
                            <div className="text-gray-300 text-xs">Row {data.row! + 1} of {data.totalRows}</div>
                        )}
                    </div>
                </div>

                <NodeHandles />
            </div>
        </div>
    )
})

const TeamNode = memo(function TeamNode({ data: { name, descendantsCount, showingChildren, setShowingChildren } }: { data: { name: string, descendantsCount: number, showingChildren: boolean, setShowingChildren?: (showingChildren: boolean) => void } }) {
    return (
        <div className="h-full max-h-full transition-all hover:translate-y-[-2px]">
            <div className="w-full h-full flex justify-center items-center px-6 py-4 shadow-lg rounded-lg bg-blue-50 border-2 border-blue-300 min-w-[200px]">
                <div className="flex items-center justify-center">
                    <div className="ml-4 flex-1 min-w-0">
                        <div className="text-lg font-bold text-blue-800 truncate">{name}</div>
                        {descendantsCount > 0 && (
                            <div className="flex items-center gap-2">
                                <div className="text-blue-700 text-sm font-medium">{descendantsCount} {descendantsCount === 1 ? 'member' : 'members'}</div>
                                <button
                                    onClick={() => setShowingChildren?.(!showingChildren)}
                                    className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded transition-colors"
                                >
                                    {showingChildren ? 'Hide' : 'Show'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <NodeHandles />
            </div>
        </div>
    )
})