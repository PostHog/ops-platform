import { Handle, Position } from '@xyflow/react'
import { memo } from 'react'
import { cn } from '../utils'
import { OrgChartNode } from '@/routes/org-chart'
import { CalendarClockIcon, ClockIcon } from 'lucide-react'

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
    id,
    name,
    title,
    team,
    startDate,
    childrenCount,
    expanded,
    toggleExpanded,
    handleClick,
    selectedNode,
    hiringPriority,
  },
}: {
  data: OrgChartNode['data']
}) {
  const isFutureHire = startDate && new Date(startDate) > new Date()

  const handleNodeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    handleClick?.(id)
  }

  return (
    <div
      className="w-[200px] max-w-[200px] min-w-[200px] h-[100px] max-h-[100px] min-h-[100px] transition-all hover:translate-y-[-2px]"
      onClick={handleNodeClick}
    >
      <div
        className={cn(
          'w-full h-full flex justify-center items-center px-4 py-3 shadow-md rounded-md bg-white border-stone-400 min-w-[200px]',
          isFutureHire ? 'bg-violet-50' : '',
          hiringPriority ? 'bg-yellow-50' : '',
          selectedNode === id ? 'border-2' : 'border-1',
        )}
      >
        <div className="flex items-center max-w-[80%]">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold truncate">{name}</div>
            <div className="text-gray-500 text-xs truncate">{title}</div>
            <div className="text-yellow-600 font-bold text-xs truncate">
              {team}
            </div>
            {childrenCount !== undefined &&
            (childrenCount.active > 0 ||
              childrenCount.pending > 0 ||
              childrenCount.planned > 0) ? (
              <div className="flex items-center gap-2 mt-1">
                <div className="text-blue-600 text-xs font-medium flex flex-col">
                  {childrenCount.active > 0 ? (
                    <div className="flex flex-row items-center gap-1">
                      <span>{childrenCount.active}</span>
                      <span>
                        {childrenCount.active === 1 ? 'report' : 'reports'}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex flex-row gap-2">
                    {childrenCount.pending > 0 ? (
                      <div className="flex flex-row items-center gap-1">
                        <span>{childrenCount.pending}</span>
                        <ClockIcon className="w-3 h-3" />
                      </div>
                    ) : null}
                    {childrenCount.planned > 0 ? (
                      <div className="flex flex-row items-center gap-1">
                        <span>{childrenCount.planned}</span>
                        <CalendarClockIcon className="w-3 h-3" />
                      </div>
                    ) : null}
                  </div>
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
            ) : null}
            {isFutureHire && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-violet-600 text-xs font-medium">
                  Future starter
                </span>
              </div>
            )}
            {hiringPriority && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-violet-600 text-xs font-medium">
                  Proposed hire ({hiringPriority})
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
  data: {
    employees: Array<OrgChartNode['data']>
  }
}) {
  const employees = data.employees || []

  return (
    <div className="p-4 rounded-lg border-t-2 border-gray-300">
      <div
        className={`grid gap-4 ${employees.length >= 2 ? 'grid-cols-2' : ''}`}
      >
        {employees.map((employee) => {
          return <EmployeeNode key={employee.name} data={employee} />
        })}
      </div>
      <NodeHandles />
    </div>
  )
})

export const nodeTypes = {
  employeeNode: EmployeeNode,
  teamNode: TeamNode,
  leafContainerNode: LeafContainer,
}
