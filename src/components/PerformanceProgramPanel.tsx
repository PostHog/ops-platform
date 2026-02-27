import { memo, useState } from 'react'
import { Eye, File as FileIcon, MessageSquare, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { createToast } from 'vercel-toast'
import { useServerFn } from '@tanstack/react-start'
import {
  resolvePerformanceProgram,
  getProofFileUrl,
  deleteProofFile,
} from '@/routes/employee.$employeeId'
import { PerformanceProgramChecklistItem } from './PerformanceProgramChecklistItem'
import { InlineProofImage, isImageFile } from './InlineProofImage'
import { FeedbackInput } from './FeedbackInput'
import type { Prisma } from '@prisma/client'

type PerformanceProgram = Prisma.PerformanceProgramGetPayload<{
  include: {
    checklistItems: {
      include: {
        files: true
        completedBy: {
          select: {
            id: true
            name: true
            email: true
          }
        }
        assignedTo: {
          select: {
            id: true
            email: true
            deelEmployee: {
              select: {
                firstName: true
                lastName: true
              }
            }
          }
        }
      }
    }
    feedback: {
      include: {
        givenBy: {
          select: {
            id: true
            name: true
            email: true
          }
        }
        files: true
      }
    }
    startedBy: {
      select: {
        id: true
        name: true
        email: true
      }
    }
  }
}>

interface PerformanceProgramPanelProps {
  employeeId: string
  program: PerformanceProgram | null
  onUpdate: () => void
  reportingChain?: Array<{ name: string; team?: string }>
}

type FeedbackFile = PerformanceProgram['feedback'][number]['files'][number]

const FeedbackFileChip = memo(function FeedbackFileChip({
  file,
  isActive,
  onDownload,
  onDelete,
}: {
  file: FeedbackFile
  isActive: boolean
  onDownload: (fileId: string) => void
  onDelete: (fileId: string) => void
}) {
  return (
    <div className="group flex items-center gap-1 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-xs hover:border-gray-300">
      <FileIcon className="h-3 w-3 text-gray-500" />
      <span className="text-gray-700">{file.fileName}</span>
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="sm"
          className="h-4 px-1 text-xs"
          onClick={() => onDownload(file.id)}
        >
          Download
        </Button>
        {isActive && (
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => onDelete(file.id)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
})

export function PerformanceProgramPanel({
  program,
  onUpdate,
  reportingChain = [],
}: PerformanceProgramPanelProps) {
  const [isResolving, setIsResolving] = useState(false)

  const resolveProgram = useServerFn(resolvePerformanceProgram)
  const getFileUrl = useServerFn(getProofFileUrl)
  const deleteFile = useServerFn(deleteProofFile)

  const handleResolveProgram = async () => {
    if (!program) return

    if (
      !confirm(
        'Are you sure you want to resolve this performance program? This action cannot be undone.',
      )
    ) {
      return
    }

    setIsResolving(true)
    try {
      await resolveProgram({
        data: {
          programId: program.id,
        },
      })
      createToast('Performance program resolved', { timeout: 3000 })
      onUpdate()
    } catch (error) {
      createToast(
        error instanceof Error ? error.message : 'Failed to resolve program',
        { timeout: 3000 },
      )
    } finally {
      setIsResolving(false)
    }
  }

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

  const handleDeleteFile = async (fileId: string) => {
    if (
      !confirm(
        'Are you sure you want to remove this file? This action cannot be undone.',
      )
    ) {
      return
    }
    try {
      await deleteFile({ data: { proofFileId: fileId } })
      createToast('File removed', { timeout: 3000 })
      onUpdate()
    } catch (error) {
      createToast(
        error instanceof Error ? error.message : 'Failed to remove file',
        { timeout: 3000 },
      )
    }
  }

  if (!program) {
    return null
  }

  if (program.status !== 'ACTIVE') {
    return null
  }

  const allItemsCompleted = program.checklistItems.every(
    (item) => item.completed,
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Performance Program</span>
          <span className="text-sm text-gray-500">
            Started {new Date(program.startedAt).toLocaleDateString()} by{' '}
            {program.startedBy.name || program.startedBy.email}
            {program.resolvedAt && (
              <>
                {' '}
                · Resolved {new Date(program.resolvedAt).toLocaleDateString()}
              </>
            )}
          </span>
          {reportingChain.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-default items-center gap-1 text-sm text-gray-500">
                    <Eye className="h-3.5 w-3.5" />
                    Viewable by: {reportingChain.length}{' '}
                    {reportingChain.length === 1 ? 'person' : 'people'}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <ul className="space-y-1">
                    {reportingChain.map((person, i) => (
                      <li key={i}>{person.name}</li>
                    ))}
                    <li>+ Blitzscale</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {program.status === 'ACTIVE' && allItemsCompleted && (
          <Button
            onClick={handleResolveProgram}
            disabled={isResolving}
            variant="default"
            size="sm"
          >
            {isResolving ? 'Resolving...' : 'Resolve Program'}
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {[...program.checklistItems]
          .sort((a, b) => {
            // First sort by completed status (incomplete items first)
            if (a.completed !== b.completed) {
              return a.completed ? 1 : -1
            }
            // Then sort by due date (earliest first, nulls last)
            if (!a.dueDate && !b.dueDate) return 0
            if (!a.dueDate) return 1
            if (!b.dueDate) return -1
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
          })
          .map((item) => (
            <PerformanceProgramChecklistItem
              key={item.id}
              item={item}
              onUpdate={onUpdate}
            />
          ))}
      </div>

      <div className="rounded-lg border bg-white p-3">
        <h4 className="mb-2 text-sm font-semibold">
          Additional performance feedback
        </h4>
        {program.status === 'ACTIVE' && (
          <FeedbackInput programId={program.id} onFeedbackAdded={onUpdate} />
        )}
        <div className="space-y-2">
          {program.feedback.length === 0 ? (
            <p className="text-sm text-gray-500">No feedback yet</p>
          ) : (
            program.feedback.map((feedback) => {
              const imageFiles = feedback.files.filter((f) =>
                isImageFile(f.fileName, f.mimeType),
              )
              const nonImageFiles = feedback.files.filter(
                (f) => !isImageFile(f.fileName, f.mimeType),
              )
              return (
                <div
                  key={feedback.id}
                  className="flex flex-col gap-2 rounded border border-gray-200 bg-gray-50/50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 shrink-0 text-gray-500" />
                    <span className="shrink-0 text-sm font-medium whitespace-nowrap">
                      {feedback.givenBy.name || feedback.givenBy.email}
                    </span>
                    <span className="shrink-0 text-sm whitespace-nowrap text-gray-500">
                      {new Date(feedback.createdAt).toLocaleDateString()}
                    </span>
                    {nonImageFiles.length > 0 && (
                      <div className="ml-auto flex shrink-0 items-center gap-1">
                        {nonImageFiles.map((file) => (
                          <FeedbackFileChip
                            key={file.id}
                            file={file}
                            isActive={program.status === 'ACTIVE'}
                            onDownload={handleDownloadFile}
                            onDelete={handleDeleteFile}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  {feedback.feedback && (
                    <p className="text-sm whitespace-pre-line text-gray-700">
                      {feedback.feedback}
                    </p>
                  )}
                  {imageFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {imageFiles.map((file) => (
                        <div key={file.id} className="group relative">
                          <InlineProofImage
                            fileId={file.id}
                            fileName={file.fileName}
                          />
                          {program.status === 'ACTIVE' && (
                            <button
                              type="button"
                              className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-800/70 text-white opacity-0 shadow transition-opacity group-hover:opacity-100 hover:bg-gray-900"
                              onClick={() => handleDeleteFile(file.id)}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
