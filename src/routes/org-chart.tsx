import { createFileRoute } from '@tanstack/react-router'
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge, Handle, Position, ConnectionLineType, Background, SmoothStepEdge, Node, Edge, NodeChange, EdgeChange, Connection } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useState, useCallback } from 'react';
import dagre from '@dagrejs/dagre';
import employeeData from '../../todos.json';

export const Route = createFileRoute('/org-chart')({
    component: OrgChart,
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
.filter((teamName) => teamName !== 'Blitzscale')
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

const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

// Calculate node dimensions based on content
const calculateNodeDimensions = (node: Node) => {
    const data = node.data as { name?: string; title?: string; team?: string };
    const name = data.name || '';
    const title = data.title || '';
    const team = data.team || '';
    
    if (node.type === 'teamNode') {
        // Team nodes are larger and only have name
        const nameWidth = name.length * 10; // Larger font for team names
        const width = Math.max(250, 64 + 16 + nameWidth + 24); // Larger circle + margins + text + padding
        const height = 80; // Taller for team nodes
        return { width, height };
    } else {
        // Employee nodes
        const nameWidth = name.length * 8; // Approximate character width
        const titleWidth = (title + ' - ' + team).length * 7; // Smaller font for subtitle
        
        // Node structure: profile circle (48px) + margin (8px) + text content + padding (16px total)
        const width = Math.max(200, 48 + 8 + Math.max(nameWidth, titleWidth) + 16);
        const height = 60; // Fixed height for consistent layout
        
        return { width, height };
    }
};

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({
        rankdir: direction,
        ranksep: 200, // Vertical spacing between ranks
        nodesep: 100,  // Horizontal spacing between nodes in the same rank
    });

    nodes.forEach((node) => {
        const { width, height } = calculateNodeDimensions(node);
        dagreGraph.setNode(node.id, { width, height });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const newNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        const { width, height } = calculateNodeDimensions(node);
        const newNode = {
            ...node,
            targetPosition: isHorizontal ? Position.Left : Position.Top,
            sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
            // We are shifting the dagre node position (anchor=center center) to the top left
            // so it matches the React Flow node anchor point (top left).
            position: {
                x: nodeWithPosition.x - width / 2,
                y: nodeWithPosition.y - height / 2,
            },
        };

        return newNode;
    });

    return { nodes: newNodes, edges };
};

export default function OrgChart() {

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        initialNodes,
        initialEdges,
    );
    const [nodes, setNodes] = useState<Node[]>(layoutedNodes);
    const [edges, setEdges] = useState<Edge[]>(layoutedEdges);

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
        [],
    );
    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
        [],
    );
    const onConnect = useCallback(
        (params: Connection) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
        [],
    );


    return (
        <div className="w-full h-screen">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={{
                    employeeNode: EmployeeNode,
                    teamNode: TeamNode
                }}
                onConnect={onConnect}
                edgeTypes={{ smoothstep: SmoothStepEdge }}
                connectionLineType={ConnectionLineType.SmoothStep}
                fitView
            >
                <Background />
            </ReactFlow>
        </div>
    );
}

function EmployeeNode({ data }: { data: { name: string, title: string, team: string } }) {
    return (
        <div className="px-4 py-3 shadow-md rounded-md bg-white border-2 border-stone-400 min-w-[200px]">
            <div className="flex items-center">
                <div className="rounded-full w-12 h-12 flex justify-center items-center bg-gray-100 flex-shrink-0">
                    {data.name[0]}
                </div>
                <div className="ml-3 flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{data.name}</div>
                    <div className="text-gray-500 text-xs truncate">{data.title} - {data.team}</div>
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