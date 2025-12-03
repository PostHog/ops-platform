import { Link } from '@tanstack/react-router'
import { Check } from 'lucide-react'

interface StatusCellProps {
  reviewed: boolean
  employeeId: string
}

export function StatusCell({ reviewed, employeeId }: StatusCellProps) {
  if (reviewed) {
    return (
      <div className="flex items-center gap-2 text-gray-700">
        <Check className="h-4 w-4 text-green-600" />
        <span>reviewed</span>
      </div>
    )
  }

  return (
    <Link
      to="/employee/$employeeId"
      params={{ employeeId }}
      className="text-blue-500 hover:text-blue-700 hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      Review now →
    </Link>
  )
}
