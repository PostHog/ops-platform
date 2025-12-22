import { useState } from 'react'
import { MessageSquare, Send, Upload, File as FileIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { createToast } from 'vercel-toast'
import { useServerFn } from '@tanstack/react-start'
import {
  addProgramFeedback,
  resolvePerformanceProgram,
  getProofFileUploadUrl,
  createProofFileRecord,
  getProofFileUrl,
  deleteProofFile,
} from '@/routes/employee.$employeeId'
import { PerformanceProgramChecklistItem } from './PerformanceProgramChecklistItem'
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
            name: true
            workEmail: true
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
}

export function PerformanceProgramPanel({
  program,
  onUpdate,
}: PerformanceProgramPanelProps) {
  const [feedbackText, setFeedbackText] = useState('')
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  const [isResolving, setIsResolving] = useState(false)
  const [feedbackFiles, setFeedbackFiles] = useState<
    Array<File & { fileKey: string }>
  >([])
  const [isUploadingFiles, setIsUploadingFiles] = useState(false)

  const addFeedback = useServerFn(addProgramFeedback)
  const resolveProgram = useServerFn(resolvePerformanceProgram)
  const getUploadUrl = useServerFn(getProofFileUploadUrl)
  const createFileRecord = useServerFn(createProofFileRecord)
  const getFileUrl = useServerFn(getProofFileUrl)
  const deleteFile = useServerFn(deleteProofFile)

  const handleFileUpload = async (file: File) => {
    if (!program) return

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      createToast('File size exceeds 10MB limit', { timeout: 3000 })
      return
    }

    setIsUploadingFiles(true)
    try {
      // Get presigned upload URL
      const { uploadUrl, fileKey } = await getUploadUrl({
        data: {
          programId: program.id,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
        },
      })

      // Upload file directly to S3 using presigned URL
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to S3')
      }

      // Store file info for later (will create record after feedback is created)
      setFeedbackFiles((prev) => [...prev, Object.assign(file, { fileKey })])

      createToast('File ready to attach', { timeout: 2000 })
    } catch (error) {
      createToast(
        error instanceof Error ? error.message : 'Failed to upload file',
        { timeout: 3000 },
      )
    } finally {
      setIsUploadingFiles(false)
    }
  }

  const handleAddFeedback = async () => {
    if (!feedbackText.trim() || !program) return

    setIsSubmittingFeedback(true)
    try {
      // Create feedback first
      const feedback = await addFeedback({
        data: {
          programId: program.id,
          feedback: feedbackText.trim(),
        },
      })

      // Upload any files that were selected
      if (feedbackFiles.length > 0) {
        await Promise.all(
          feedbackFiles.map((file) =>
            createFileRecord({
              data: {
                feedbackId: feedback.id,
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type,
                fileKey: file.fileKey,
              },
            }),
          ),
        )
      }

      createToast('Feedback added', { timeout: 3000 })
      setFeedbackText('')
      setFeedbackFiles([])
      onUpdate()
    } catch (error) {
      createToast(
        error instanceof Error ? error.message : 'Failed to add feedback',
        { timeout: 3000 },
      )
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

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

  if (!program) {
    return null
  }

  const allItemsCompleted = program.checklistItems.every(
    (item) => item.completed,
  )
  const statusColor =
    program.status === 'ACTIVE'
      ? 'bg-orange-100 text-orange-800'
      : program.status === 'RESOLVED'
        ? 'bg-green-100 text-green-800'
        : 'bg-gray-100 text-gray-800'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className={statusColor}>{program.status}</Badge>
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
        <h4 className="font-semibold">Checklist Items</h4>
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
        <h4 className="mb-2 text-sm font-semibold">Feedback</h4>
        {program.status === 'ACTIVE' && (
          <div className="mb-2 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Textarea
                id="feedback-input"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Enter feedback..."
                rows={1}
                className="min-h-[32px] flex-1 resize-none text-xs"
              />
              <div className="relative shrink-0">
                <input
                  type="file"
                  id="feedback-file-upload"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.gif,.txt"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleFileUpload(file)
                    }
                    e.target.value = ''
                  }}
                  disabled={isUploadingFiles}
                />
                <Label
                  htmlFor="feedback-file-upload"
                  className="cursor-pointer"
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploadingFiles}
                    className="h-8 w-8 p-0"
                    asChild
                  >
                    <span>
                      <Upload className="h-4 w-4" />
                    </span>
                  </Button>
                </Label>
              </div>
              <Button
                onClick={handleAddFeedback}
                disabled={
                  !feedbackText.trim() ||
                  isSubmittingFeedback ||
                  isUploadingFiles
                }
                size="sm"
                className="h-8 w-8 shrink-0 p-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {feedbackFiles.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                {feedbackFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 rounded border bg-gray-50 px-1.5 py-0.5 text-xs"
                  >
                    <FileIcon className="h-3 w-3 text-gray-500" />
                    <span className="max-w-[120px] truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFeedbackFiles((prev) =>
                          prev.filter((_, i) => i !== index),
                        )
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="space-y-2">
          {program.feedback.length === 0 ? (
            <p className="text-sm text-gray-500">No feedback yet</p>
          ) : (
            program.feedback.map((feedback) => (
              <div
                key={feedback.id}
                className="flex items-center gap-2 rounded border border-gray-200 bg-gray-50/50 px-3 py-2"
              >
                <MessageSquare className="h-4 w-4 shrink-0 text-gray-500" />
                <span className="shrink-0 text-sm font-medium whitespace-nowrap">
                  {feedback.givenBy.name || feedback.givenBy.email}
                </span>
                <span className="shrink-0 text-sm whitespace-nowrap text-gray-500">
                  {new Date(feedback.createdAt).toLocaleDateString()}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-gray-700">
                  {feedback.feedback}
                </span>
                {feedback.files && feedback.files.length > 0 && (
                  <div className="flex shrink-0 items-center gap-1">
                    {feedback.files.map((file) => (
                      <div
                        key={file.id}
                        className="group flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-sm hover:border-gray-300"
                      >
                        <FileIcon className="h-4 w-4 shrink-0 text-gray-500" />
                        <span className="max-w-[120px] truncate">
                          {file.fileName}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1 text-xs"
                            onClick={async () => {
                              try {
                                const { url } = await getFileUrl({
                                  data: { proofFileId: file.id },
                                })
                                window.open(url, '_blank')
                              } catch (error) {
                                createToast(
                                  error instanceof Error
                                    ? error.message
                                    : 'Failed to get file URL',
                                  { timeout: 3000 },
                                )
                              }
                            }}
                          >
                            Download
                          </Button>
                          {program.status === 'ACTIVE' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={async () => {
                                if (
                                  !confirm(
                                    'Are you sure you want to remove this file? This action cannot be undone.',
                                  )
                                ) {
                                  return
                                }
                                try {
                                  await deleteFile({
                                    data: { proofFileId: file.id },
                                  })
                                  createToast('File removed', { timeout: 3000 })
                                  onUpdate()
                                } catch (error) {
                                  createToast(
                                    error instanceof Error
                                      ? error.message
                                      : 'Failed to remove file',
                                    { timeout: 3000 },
                                  )
                                }
                              }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
