import { Handle, Position, useReactFlow } from '@xyflow/react'
import { memo, MouseEventHandler } from 'react'
import { cn } from '../utils'
import { OrgChartNode } from '@/routes/org-chart'

const NodeHandles = () => {
  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={false}
        className="opacity-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        className="opacity-0"
      />
    </>
  )
}

const TeamNode = memo(function TeamNode({
  data: { name },
}: {
  data: OrgChartNode['data']
}) {
  return (
    <div className="transition-all hover:translate-y-[-2px]">
      <div className="w-full h-full flex justify-center items-center px-6 py-4 shadow-lg rounded-lg bg-blue-50 border-2 border-blue-300 min-w-[200px]">
        <div className="flex items-center justify-center">
          <div className="ml-4 flex-1 min-w-0">
            <div className="text-lg font-bold text-blue-800 truncate">
              {name}
            </div>
          </div>
        </div>

        <NodeHandles />
      </div>
    </div>
  )
})

const EmployeeNode = memo(function EmployeeNode({
  data: {
    name,
    title,
    team,
    startDate,
    childrenCount,
    expanded,
    toggleExpanded,
  },
}: {
  data: OrgChartNode['data']
}) {
  const isFutureHire = startDate && new Date(startDate) > new Date()

  return (
    <div className="w-[200px] max-w-[200px] min-w-[200px] h-[100px] max-h-[100px] min-h-[100px] transition-all hover:translate-y-[-2px]">
      <div
        className={cn(
          'w-full h-full flex justify-center items-center px-4 py-3 shadow-md rounded-md bg-white border-2 border-stone-400 min-w-[200px]',
          isFutureHire ? 'bg-violet-50' : '',
        )}
      >
        <div className="flex items-center max-w-[80%]">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold truncate">{name}</div>
            <div className="text-gray-500 text-xs truncate">{title}</div>
            <div className="text-gray-400 text-xs truncate">{team}</div>
            {childrenCount !== undefined && childrenCount > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <div className="text-blue-600 text-xs font-medium">
                  {childrenCount} {childrenCount === 1 ? 'child' : 'children'}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleExpanded()
                  }}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  {expanded ? 'Hide' : 'Show'}
                </button>
              </div>
            )}
            {isFutureHire && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-violet-600 text-xs font-medium">
                  Future starter
                </span>
              </div>
            )}
          </div>
        </div>

        <NodeHandles />
      </div>
    </div>
  )
})

const LeafContainer = memo(function LeafContainer({
  data,
}: {
  data: { name: string }
}) {
  return <div>this is a leaf container {data.name}</div>
})

export const nodeTypes = {
  employeeNode: EmployeeNode,
  teamNode: TeamNode,
  leafContainer: LeafContainer,
}
