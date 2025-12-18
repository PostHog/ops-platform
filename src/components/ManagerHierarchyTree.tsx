import { useState, useEffect, useRef } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { useRouter } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

type HierarchyNode = {
  id: string
  name: string
  title: string
  team?: string
  employeeId?: string
  children: HierarchyNode[]
}

type ManagerHierarchyTreeProps = {
  hierarchy: HierarchyNode | HierarchyNode[] | null
  currentEmployeeId: string
  expandAll?: boolean | null
  onExpandAllChange?: (expand: boolean | null) => void
  onNodeExpand?: (nodeId: string, expand: boolean) => void
}

function TreeNode({
  node,
  level = 0,
  currentEmployeeId,
  expandAll,
  containerRef,
  onNodeExpand,
}: {
  node: HierarchyNode
  level: number
  currentEmployeeId: string
  expandAll: boolean | null
  containerRef?: React.RefObject<HTMLDivElement | null>
  onNodeExpand?: (nodeId: string, expand: boolean) => void
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const nodeRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const hasChildren = node.children.length > 0
  const isCurrentEmployee = node.employeeId === currentEmployeeId

  // Check if any child is the current employee
  const hasCurrentEmployeeAsChild = (n: HierarchyNode): boolean => {
    if (n.employeeId === currentEmployeeId) return true
    return n.children.some((child) => hasCurrentEmployeeAsChild(child))
  }

  useEffect(() => {
    if (expandAll !== null) {
      setIsExpanded(expandAll)
    }
  }, [expandAll])

  // Expand if current employee is a descendant (to make it visible)
  useEffect(() => {
    if (hasCurrentEmployeeAsChild(node)) {
      setIsExpanded(true)
    }
  }, [currentEmployeeId, node])

  // Scroll to current employee when it changes
  useEffect(() => {
    if (isCurrentEmployee && nodeRef.current && containerRef?.current) {
      // Use setTimeout to ensure DOM has updated after expansion
      setTimeout(() => {
        const nodeElement = nodeRef.current
        if (nodeElement) {
          nodeElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          })
        }
      }, 100)
    }
  }, [isCurrentEmployee, containerRef])

  const handleClick = (e: React.MouseEvent) => {
    if (hasChildren) {
      e.stopPropagation()
      setIsExpanded(!isExpanded)
    }
    if (node.employeeId && node.employeeId !== currentEmployeeId) {
      router.navigate({
        to: '/employee/$employeeId',
        params: { employeeId: node.employeeId },
      })
    }
  }

  return (
    <div ref={nodeRef}>
      <div
        className={cn(
          'flex cursor-pointer items-center gap-1 rounded px-2 py-1.5 text-sm hover:bg-gray-100',
          isCurrentEmployee && 'bg-blue-50 font-semibold',
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="h-3 w-3 flex-shrink-0 text-gray-500" />
          ) : (
            <ChevronRight className="h-3 w-3 flex-shrink-0 text-gray-500" />
          )
        ) : (
          <div className="h-3 w-3 flex-shrink-0" />
        )}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate">{node.name}</span>
          {node.team && (
            <span className="flex-shrink-0 truncate text-xs text-gray-500">
              {node.team}
            </span>
          )}
        </div>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              currentEmployeeId={currentEmployeeId}
              expandAll={expandAll}
              containerRef={containerRef}
              onNodeExpand={onNodeExpand}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function ManagerHierarchyTree({
  hierarchy,
  currentEmployeeId,
  expandAll = null,
}: ManagerHierarchyTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  if (!hierarchy) {
    return (
      <div className="p-4 text-sm text-gray-500">
        No hierarchy data available
      </div>
    )
  }

  const nodes = Array.isArray(hierarchy) ? hierarchy : [hierarchy]

  return (
    <div ref={containerRef} className="h-full overflow-y-auto">
      <div className="p-2">
        {nodes.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            level={0}
            currentEmployeeId={currentEmployeeId}
            expandAll={expandAll}
            containerRef={containerRef}
          />
        ))}
      </div>
    </div>
  )
}
