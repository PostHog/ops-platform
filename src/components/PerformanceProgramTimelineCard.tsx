import {
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  PencilLine,
} from 'lucide-react'
import type { Prisma } from '@prisma/client'

type PerformanceProgram = Prisma.PerformanceProgramGetPayload<{
  include: {
    startedBy: {
      select: {
        id: true
        name: true
        email: true
      }
    }
  }
}>

type ChecklistItem = Prisma.PerformanceProgramChecklistItemGetPayload<{
  include: {
    completedBy: {
      select: {
        id: true
        name: true
        email: true
      }
    }
  }
}>

interface PerformanceProgramTimelineCardProps {
  event: 'started' | 'resolved' | 'checklist-completed' | 'feedback'
  program: PerformanceProgram
  checklistItem?: ChecklistItem
  feedback?: {
    id: string
    feedback: string
    createdAt: Date
    givenBy: {
      id: string
      name: string | null
      email: string
    }
  }
  lastTableItem?: boolean
}

export function PerformanceProgramTimelineCard({
  event,
  program,
  checklistItem,
  feedback,
  lastTableItem = false,
}: PerformanceProgramTimelineCardProps) {
  const getEventLabel = () => {
    switch (event) {
      case 'started':
        return 'Performance Program Started'
      case 'resolved':
        return 'Performance Program Resolved'
      case 'checklist-completed':
        const itemType =
          checklistItem?.type === 'SLACK_FEEDBACK_MEETING'
            ? 'Slack Feedback Meeting'
            : 'Email Feedback Meeting'
        return `${itemType} Completed`
      case 'feedback':
        return 'Feedback Added'
    }
  }

  const getEventIcon = () => {
    switch (event) {
      case 'started':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'resolved':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'checklist-completed':
        return <CheckCircle2 className="h-4 w-4 text-blue-600" />
      case 'feedback':
        return <MessageSquare className="h-4 w-4 text-gray-600" />
    }
  }

  const getEventColor = () => {
    switch (event) {
      case 'started':
        return 'border-orange-200'
      case 'resolved':
        return 'border-green-200'
      case 'checklist-completed':
        return 'border-blue-200'
      case 'feedback':
        return 'border-gray-200'
    }
  }

  const completedBy =
    event === 'checklist-completed' && checklistItem?.completedBy
      ? checklistItem.completedBy.name || checklistItem.completedBy.email
      : event === 'started'
        ? program.startedBy.name || program.startedBy.email
        : event === 'feedback' && feedback
          ? feedback.givenBy.name || feedback.givenBy.email
          : null

  const notes =
    event === 'checklist-completed' && checklistItem?.notes
      ? checklistItem.notes
      : event === 'feedback' && feedback?.feedback
        ? feedback.feedback
        : null

  return (
    <div
      className={`border border-t-0 border-gray-200${lastTableItem ? 'rounded-b-md' : ''}`}
    >
      <div
        className={`ml-8 flex flex-col gap-2 border-l-[3px] ${getEventColor()} px-4 py-2`}
      >
        <div>
          <h4 className="flex items-center gap-1.5 text-sm font-semibold">
            {getEventIcon()}
            {getEventLabel()}
            {completedBy && (
              <span className="font-normal text-gray-500">
                {' '}
                -{' '}
                {event === 'checklist-completed' || event === 'feedback'
                  ? 'completed'
                  : 'started'}{' '}
                by {completedBy}
              </span>
            )}
          </h4>
        </div>
        {notes && (
          <div className="flex text-xs whitespace-pre-line text-gray-700 italic">
            <PencilLine className="mr-2 h-4 w-4 shrink-0 text-gray-500" />
            <span>{notes}</span>
          </div>
        )}
      </div>
    </div>
  )
}
