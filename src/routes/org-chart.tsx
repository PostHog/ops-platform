import { createFileRoute } from '@tanstack/react-router'
import { ReactFlow, addEdge, Handle, Position, Background, Node, Edge, useEdgesState, useNodesState, useReactFlow, ReactFlowProvider, Panel } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useLayoutEffect } from 'react';
import ELK from 'elkjs/lib/elk.bundled.js';
import employeeData from '../../todos.json';

import '@xyflow/react/dist/style.css';

export const Route = createFileRoute('/org-chart')({
    component: () => <ReactFlowProvider><OrgChart /></ReactFlowProvider>,
})

const employees = employeeData.Resources
    .filter((employee) => employee.active)
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

const blitzscaleEdges = employees.filter((employee) => {
    return employee.team != 'Blitzscale' && employees.find(e => e.id === employee.manager)?.team === 'Blitzscale'
}).map((employee) => ({
    id: employee.id + employee.manager,
    source: `employee-${employee.manager}`,
    target: `team-${employee.team}`,
    type: 'smoothstep',
}));

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

const getLayoutedElements = (nodes, edges, options = {}) => {
    const isHorizontal = options?.['elk.direction'] === 'RIGHT';
    const graph = {
        id: 'root',
        layoutOptions: options,
        children: nodes.map((node) => ({
            ...node,
            // Adjust the target and source handle positions based on the layout
            // direction.
            targetPosition: isHorizontal ? 'left' : 'top',
            sourcePosition: isHorizontal ? 'right' : 'bottom',

            // Use different sizes for team nodes vs employee nodes
            width: node.type === 'teamNode' ? 250 : 150,
            height: node.type === 'teamNode' ? 80 : 50,
        })),
        edges: edges,
    }

    return elk
        .layout(graph)
        .then((layoutedGraph) => ({
            nodes: layoutedGraph.children.map((node) => ({
                ...node,
                // React Flow expects a position property on the node instead of `x`
                // and `y` fields.
                position: { x: node.x, y: node.y },
            })),

            edges: layoutedGraph.edges,
        }))
        .catch(console.error);
}

export default function OrgChart() {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const { fitView } = useReactFlow();

    const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);
    const onLayout = useCallback(
        ({ direction, useInitialNodes = false }) => {
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

    // Calculate the initial layout on mount.
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
                <Panel position="top-right">
                    <button
                        className="xy-theme__button"
                        onClick={() => onLayout({ direction: 'DOWN' })}
                    >
                        vertical layout
                    </button>

                    <button
                        className="xy-theme__button"
                        onClick={() => onLayout({ direction: 'RIGHT' })}
                    >
                        horizontal layout
                    </button>
                </Panel>
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