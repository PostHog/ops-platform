import { Badge } from '@/components/ui/badge'
import type { Priority } from '@prisma/client'

interface PriorityBadgeProps {
  priority: Priority
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const getColorClasses = (priority: Priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'low':
        return 'bg-gray-100 text-gray-700 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  return <Badge className={getColorClasses(priority)}>{priority}</Badge>
}
