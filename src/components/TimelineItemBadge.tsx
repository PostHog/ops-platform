interface TimelineItemBadgeProps {
  type: 'salary' | 'new salary' | 'feedback'
}

export function TimelineItemBadge({ type }: TimelineItemBadgeProps) {
  if (type === 'salary') {
    return (
      <span className="inline-flex items-center rounded-md bg-green-50 px-1 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
        salary update
      </span>
    )
  }
  if (type === 'new salary') {
    return (
      <span className="inline-flex items-center rounded-md bg-green-50 px-1 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
        new salary
      </span>
    )
  }

  return (
    <span className="inline-flex items-center rounded-md bg-blue-50 px-1 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
      keeper test
    </span>
  )
}
