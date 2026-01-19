import {
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  PencilLine,
  File as FileIcon,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import type { Prisma } from '@prisma/client'
import { useServerFn } from '@tanstack/react-start'
import { getProofFileUrl } from '@/routes/employee.$employeeId'
import { Button } from '@/components/ui/button'
import { createToast } from 'vercel-toast'
import { cn } from '@/lib/utils'

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
    files: true
  }
}>

type File = ChecklistItem['files'][number]

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
    files?: File[]
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

  const files =
    event === 'checklist-completed' && checklistItem?.files
      ? checklistItem.files
      : event === 'feedback' && feedback?.files
        ? feedback.files
        : []

  return (
    <div
      className={cn(
        'border border-t-0 border-gray-200',
        lastTableItem && 'rounded-b-md',
      )}
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
        {notes && <ExpandableText text={notes} />}
        {files.length > 0 && <FileList files={files} />}
      </div>
    </div>
  )
}

function ExpandableText({ text }: { text: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isTruncated, setIsTruncated] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (textRef.current) {
      const element = textRef.current
      setIsTruncated(element.scrollHeight > element.clientHeight)
    }
  }, [text, isExpanded])

  return (
    <div className="flex max-w-4xl text-xs text-gray-700 italic">
      <PencilLine className="mr-2 h-4 w-4 shrink-0 text-gray-500" />
      <div>
        <p
          ref={textRef}
          className={cn('whitespace-pre-line', !isExpanded && 'line-clamp-3')}
        >
          {text}
        </p>
        {isTruncated && !isExpanded && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(true)
            }}
            className="mt-1 text-sm font-semibold text-gray-500 not-italic hover:text-blue-700"
          >
            show more
          </button>
        )}
        {isExpanded && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(false)
            }}
            className="mt-1 text-sm font-semibold text-gray-500 not-italic hover:text-blue-700"
          >
            show less
          </button>
        )}
      </div>
    </div>
  )
}

function FileList({ files }: { files: File[] }) {
  const getFileUrl = useServerFn(getProofFileUrl)

  const handleDownloadFile = async (fileId: string) => {
    try {
      const { url } = await getFileUrl({ data: { proofFileId: fileId } })
      window.open(url, '_blank')
    } catch (error) {
      createToast(
        error instanceof Error ? error.message : 'Failed to get file URL',
        { timeout: 3000 },
      )
    }
  }

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {files.map((file) => (
        <div
          key={file.id}
          className="group flex items-center gap-1 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-xs hover:border-gray-300"
        >
          <FileIcon className="h-3 w-3 text-gray-500" />
          <span className="text-gray-700">{file.fileName}</span>
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="sm"
              className="h-4 px-1 text-xs"
              onClick={() => handleDownloadFile(file.id)}
            >
              Download
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
