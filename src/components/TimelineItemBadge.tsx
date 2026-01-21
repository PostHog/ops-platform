interface TimelineItemBadgeProps {
  type: 'salary' | 'new salary' | 'feedback' | 'commission'
}

export function TimelineItemBadge({ type }: TimelineItemBadgeProps) {
  if (type === 'salary') {
    return (
      <span className="inline-flex items-center rounded-md bg-green-50 px-1 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-600/20 ring-inset">
        salary update
      </span>
    )
  }
  if (type === 'new salary') {
    return (
      <span className="inline-flex items-center rounded-md bg-green-50 px-1 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-600/20 ring-inset">
        new salary
      </span>
    )
  }

  if (type === 'commission') {
    return (
      <span className="inline-flex items-center rounded-md bg-purple-50 px-1 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-purple-600/20 ring-inset">
        commission bonus
      </span>
    )
  }

  return (
    <span className="inline-flex items-center rounded-md bg-blue-50 px-1 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-600/20 ring-inset">
      keeper test
    </span>
  )
}
