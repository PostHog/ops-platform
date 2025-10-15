import { createFileRoute } from '@tanstack/react-router'
import { ReactFlow, addEdge, Handle, Position, Background, useEdgesState, useNodesState, useReactFlow, ReactFlowProvider, Edge, Node, Connection } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useLayoutEffect } from 'react';
import ELK from 'elkjs/lib/elk.bundled.js';
import employeeData from '../../todos.json';

import '@xyflow/react/dist/style.css';

export const Route = createFileRoute('/org-chart')({
    component: () => <ReactFlowProvider><OrgChart /></ReactFlowProvider>,
})

const employees = employeeData.Resources
    .filter((employee) => employee.active && employee['urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'].customFields.full_time_headcount === 'Full-Time')
    .map((employee) => ({
        id: employee.id,
        name: employee.name.givenName + " " + employee.name.familyName,
        title: employee.title,
        team: employee["urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"].department,
        manager: employee["urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"].manager.value,
    }));

const teamNodes = [...new Set(employees.map(employee => employee.team))]
    .map((teamName) => ({
        id: `team-${teamName}`,
        position: { x: 0, y: 0 },
        type: 'teamNode',
        data: {
            name: teamName,
        },
        targetPosition: Position.Top,
        sourcePosition: Position.Bottom,
    }));

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
        },
        targetPosition: Position.Top,
        sourcePosition: Position.Bottom,
    }));

const initialNodes = [
    ...teamNodes,
    ...employeeNodes
]

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
        id: employee.id + topLevelManager?.id,
        source: `employee-${topLevelManager?.id}`,
        target: `team-${employee.team}`,
        type: 'smoothstep',
    }
}).filter((edge) => edge !== null);

const teamEdges = employees.map((employee) => ({
    id: `team-${employee.team}-${employee.id}`,
    source: `team-${employee.team}`,
    target: `employee-${employee.id}`,
    type: 'smoothstep',
}));

const initialEdges = [
    ...blitzscaleEdges,
    ...teamEdges
];

const elk = new ELK();

// Elk has a *huge* amount of options to configure. To see everything you can
// tweak check out:
//
// - https://www.eclipse.org/elk/reference/algorithms.html
// - https://www.eclipse.org/elk/reference/options.html
const elkOptions = {
    'elk.algorithm': 'layered',
    'elk.layered.spacing.nodeNodeBetweenLayers': '100',
    'elk.spacing.nodeNode': '80',
};

const getLayoutedElements = (nodes: Node[], edges: Edge[], options: Record<string, any> = {}): Promise<{nodes: Node[], edges: Edge[]}> => {
    const isHorizontal = options?.['elk.direction'] === 'RIGHT';
    const graph = {
        id: 'root',
        layoutOptions: options,
        children: nodes.map((node) => ({
            ...node,
            targetPosition: isHorizontal ? 'left' : 'top',
            sourcePosition: isHorizontal ? 'right' : 'bottom',
            width: node.type === 'teamNode' ? 250 : 150,
            height: node.type === 'teamNode' ? 80 : 50,
        })),
        edges: edges.map(edge => ({
            id: edge.id,
            sources: [edge.source],
            targets: [edge.target],
            type: edge.type,
        })),
    };

    return elk.layout(graph).then((layoutedGraph) => ({
        nodes: layoutedGraph.children!.map((node) => ({
            ...node,
            position: { x: node.x!, y: node.y! },
            sourcePosition: node.sourcePosition as Position,
            targetPosition: node.targetPosition as Position,
        })),
        edges: layoutedGraph.edges!.map(edge => ({
            id: edge.id,
            source: edge.sources![0],
            target: edge.targets![0],
            type: edge.type || 'smoothstep',
        } as Edge)),
    }));
};

export default function OrgChart() {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const { fitView } = useReactFlow();

    const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), []);
    const onLayout = useCallback(
        ({ direction, useInitialNodes = false }: { direction: string, useInitialNodes: boolean }) => {
            const opts = { 'elk.direction': direction, ...elkOptions };
            const ns = useInitialNodes ? initialNodes : nodes;
            const es = useInitialNodes ? initialEdges : edges;

            getLayoutedElements(ns, es, opts).then(
                ({ nodes: layoutedNodes, edges: layoutedEdges }) => {
                    setNodes(layoutedNodes);
                    setEdges(layoutedEdges);
                    fitView();
                },
            );
        },
        [nodes, edges],
    );

    useLayoutEffect(() => {
        onLayout({ direction: 'DOWN', useInitialNodes: true });
    }, []);

    return (
        <div className="w-full h-screen">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onConnect={onConnect}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={{
                    employeeNode: EmployeeNode,
                    teamNode: TeamNode,
                }}
                fitView
            >
                <Background />
            </ReactFlow>
        </div>
    );
}

function EmployeeNode({ data }: { data: { name: string, title: string, team: string, row?: number, totalRows?: number } }) {
    return (
        <div className="px-4 py-3 shadow-md rounded-md bg-white border-2 border-stone-400 min-w-[200px]">
            <div className="flex items-center">
                <div className="rounded-full w-12 h-12 flex justify-center items-center bg-gray-100 flex-shrink-0">
                    {data.name[0]}
                </div>
                <div className="ml-3 flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{data.name}</div>
                    <div className="text-gray-500 text-xs truncate">{data.title}</div>
                    <div className="text-gray-400 text-xs truncate">{data.team}</div>
                    {data.totalRows && data.totalRows > 1 && (
                        <div className="text-gray-300 text-xs">Row {data.row! + 1} of {data.totalRows}</div>
                    )}
                </div>
            </div>

            <Handle
                type="target"
                position={Position.Top}
                className="w-16 !bg-teal-500"
            />
            <Handle
                type="source"
                position={Position.Bottom}
                className="w-16 !bg-teal-500"
            />
        </div>
    );
}

function TeamNode({ data }: { data: { name: string } }) {
    return (
        <div className="px-6 py-4 shadow-lg rounded-lg bg-blue-50 border-2 border-blue-300 min-w-[200px]">
            <div className="flex items-center justify-center">
                <div className="rounded-full w-16 h-16 flex justify-center items-center bg-blue-100 flex-shrink-0">
                    <span className="text-blue-600 font-bold text-lg">{data.name[0]}</span>
                </div>
                <div className="ml-4 flex-1 min-w-0">
                    <div className="text-lg font-bold text-blue-800 truncate">{data.name}</div>
                    <div className="text-blue-600 text-sm">Team</div>
                </div>
            </div>

            <Handle
                type="target"
                position={Position.Top}
                className="w-16 !bg-blue-500"
            />
            <Handle
                type="source"
                position={Position.Bottom}
                className="w-16 !bg-blue-500"
            />
        </div>
    );
}