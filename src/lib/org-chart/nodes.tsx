import { Handle, Position } from '@xyflow/react'
import { memo, useEffect, useState } from 'react'
import { cn } from '../utils'
import { OrgChartNode } from '@/routes/org-chart'
import {
  CalendarClockIcon,
  ClockIcon,
  CrownIcon,
  AlertTriangle,
} from 'lucide-react'

const useMetaKeyDown = () => {
  const [isMetaDown, setIsMetaDown] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey) {
        setIsMetaDown(true)
      }
    }

    const handleKeyUp = () => {
      setIsMetaDown(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  return isMetaDown
}

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
  data: { name, childrenCount, expanded, toggleExpanded },
}: {
  data: OrgChartNode['data']
}) {
  const isMetaDown = useMetaKeyDown()

  return (
    <div className="transition-all hover:translate-y-[-2px]">
      <div className="flex h-[100px] max-h-[100px] min-h-[100px] w-[200px] min-w-[200px] items-center justify-center rounded-lg border-2 border-blue-300 bg-blue-50 px-6 py-4 shadow-lg">
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-bold text-blue-800">
              {name}
            </div>
          </div>
          {childrenCount !== undefined &&
          (childrenCount.active > 0 ||
            childrenCount.pending > 0 ||
            childrenCount.planned > 0) ? (
            <div className="flex items-center gap-2">
              <div className="text-xs font-medium text-blue-600">
                {childrenCount.active > 0 ? (
                  <div className="flex flex-row items-center gap-1">
                    <span>{childrenCount.active}</span>
                    <span>
                      {childrenCount.active === 1 ? 'member' : 'members'}
                    </span>
                  </div>
                ) : null}
                <div className="flex flex-row gap-2">
                  {childrenCount.pending > 0 ? (
                    <div className="flex flex-row items-center gap-1">
                      <span>{childrenCount.pending}</span>
                      <ClockIcon className="h-3 w-3" />
                    </div>
                  ) : null}
                  {childrenCount.planned > 0 ? (
                    <div className="flex flex-row items-center gap-1">
                      <span>{childrenCount.planned}</span>
                      <CalendarClockIcon className="h-3 w-3" />
                    </div>
                  ) : null}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleExpanded(e.metaKey)
                }}
                className="rounded bg-blue-100 px-2 py-1 text-xs whitespace-nowrap transition-colors hover:bg-blue-200"
              >
                {expanded ? 'Hide' : isMetaDown ? 'Expand all' : 'Show'}
              </button>
            </div>
          ) : null}
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
    isTeamLead,
    hasActivePerformanceProgram,
  },
}: {
  data: OrgChartNode['data']
}) {
  const isMetaDown = useMetaKeyDown()
  const isFutureHire = startDate && new Date(startDate) > new Date()

  const handleNodeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    handleClick?.(id)
  }

  return (
    <div
      className="h-[100px] max-h-[100px] min-h-[100px] w-[200px] max-w-[200px] min-w-[200px] transition-all hover:translate-y-[-2px]"
      onClick={handleNodeClick}
    >
      <div
        className={cn(
          'flex h-full w-full min-w-[200px] items-center justify-center rounded-md border-stone-400 bg-white px-4 py-3 shadow-md',
          isFutureHire ? 'bg-violet-50' : '',
          hiringPriority ? 'bg-yellow-50' : '',
          selectedNode === id ? 'border-2' : 'border-1',
        )}
      >
        <div className="flex max-w-[80%] items-center">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <div className="truncate text-sm font-bold">{name}</div>
              {isTeamLead && (
                <CrownIcon className="h-4 w-4 flex-shrink-0 text-yellow-500" />
              )}
            </div>
            <div className="truncate text-xs text-gray-500">{title}</div>
            <div className="truncate text-xs font-bold text-yellow-600">
              {team}
            </div>
            {childrenCount !== undefined &&
            (childrenCount.active > 0 ||
              childrenCount.pending > 0 ||
              childrenCount.planned > 0) ? (
              <div className="mt-1 flex items-center gap-2">
                <div className="flex flex-col text-xs font-medium text-blue-600">
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
                        <ClockIcon className="h-3 w-3" />
                      </div>
                    ) : null}
                    {childrenCount.planned > 0 ? (
                      <div className="flex flex-row items-center gap-1">
                        <span>{childrenCount.planned}</span>
                        <CalendarClockIcon className="h-3 w-3" />
                      </div>
                    ) : null}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleExpanded(e.metaKey)
                  }}
                  className="rounded bg-gray-100 px-2 py-1 text-xs whitespace-nowrap transition-colors hover:bg-gray-200"
                >
                  {expanded ? 'Hide' : isMetaDown ? 'Expand all' : 'Show'}
                </button>
              </div>
            ) : null}
            {isFutureHire && (
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs font-medium text-violet-600">
                  Future starter
                </span>
              </div>
            )}
            {hiringPriority && (
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs font-medium text-violet-600">
                  Proposed hire ({hiringPriority})
                </span>
              </div>
            )}
            {hasActivePerformanceProgram && (
              <div className="mt-1 flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 text-orange-600" />
                <span className="text-xs font-medium text-orange-600">
                  Perf. Program
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
    children: Array<
      OrgChartNode['data'] & { nodeType: 'employeeNode' | 'teamNode' }
    >
  }
}) {
  const children = data.children || []

  return (
    <div className="rounded-lg border-t-2 border-gray-300 p-4">
      <div
        className={`grid gap-4 ${children.length >= 2 ? 'grid-cols-2' : ''}`}
      >
        {children.map((child) => {
          if (child.nodeType === 'employeeNode') {
            return <EmployeeNode key={child.id} data={child} />
          } else if (child.nodeType === 'teamNode') {
            return <TeamNode key={child.id} data={child} />
          }
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
