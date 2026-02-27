import { useCallback, useState } from 'react'
import {
  CalendarIcon,
  Eye,
  File as FileIcon,
  ImageIcon,
  MessageSquare,
  Send,
  Upload,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
import { InlineProofImage, isImageFile } from './InlineProofImage'
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

export function PerformanceProgramPanel({
  program,
  onUpdate,
  reportingChain = [],
}: PerformanceProgramPanelProps) {
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackDate, setFeedbackDate] = useState<Date | undefined>(undefined)
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  const [isResolving, setIsResolving] = useState(false)
  const [feedbackFiles, setFeedbackFiles] = useState<
    Array<File & { fileKey: string }>
  >([])
  const [uploadingFilesCount, setUploadingFilesCount] = useState(0)
  const isUploadingFiles = uploadingFilesCount > 0
  const [dragCounter, setDragCounter] = useState(0)
  const isDragging = dragCounter > 0

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

    setUploadingFilesCount((count) => count + 1)
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
      setUploadingFilesCount((count) => Math.max(0, count - 1))
    }
  }

  const handleAddFeedback = async () => {
    if ((!feedbackText.trim() && feedbackFiles.length === 0) || !program) return

    setIsSubmittingFeedback(true)
    try {
      // Create feedback first
      const feedback = await addFeedback({
        data: {
          programId: program.id,
          feedback: feedbackText.trim(),
          ...(feedbackDate && { createdAt: feedbackDate.toISOString() }),
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
      setFeedbackDate(undefined)
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

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragCounter((c) => c + 1)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragCounter((c) => c - 1)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragCounter(0)
      const files = Array.from(e.dataTransfer.files)
      for (const file of files) {
        handleFileUpload(file)
      }
    },
    [handleFileUpload],
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items)
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            e.preventDefault()
            handleFileUpload(file)
          }
          break
        }
      }
    },
    [handleFileUpload],
  )

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
          <div
            className={`mb-2 space-y-1.5 rounded-md border-2 border-dashed p-1.5 transition-colors ${
              isDragging
                ? 'border-blue-400 bg-blue-50/50'
                : 'border-transparent'
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <Textarea
              id="feedback-input"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              onPaste={handlePaste}
              placeholder={
                isDragging
                  ? 'Drop files here...'
                  : 'Enter feedback... (paste or drag & drop images)'
              }
              rows={3}
              className="w-full resize-none text-sm"
            />
            {feedbackFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {feedbackFiles.map((file, index) =>
                  isImageFile(file.name, file.type) ? (
                    <div key={index} className="group relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="max-h-[120px] rounded border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFeedbackFiles((prev) =>
                            prev.filter((_, i) => i !== index),
                          )
                        }}
                        className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-800 text-white opacity-0 shadow transition-opacity group-hover:opacity-100 hover:bg-gray-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      key={index}
                      className="group flex items-center gap-1 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-xs hover:border-gray-300"
                    >
                      <FileIcon className="h-3 w-3 text-gray-500" />
                      <span className="text-gray-700">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFeedbackFiles((prev) =>
                            prev.filter((_, i) => i !== index),
                          )
                        }}
                        className="text-gray-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-gray-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ),
                )}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              {isDragging && (
                <div className="flex flex-1 items-center gap-1.5 text-xs text-blue-600">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Drop files to attach
                </div>
              )}
              <div className="ml-auto flex items-center gap-1.5">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={`h-8 shrink-0 gap-1.5 px-2 text-xs ${feedbackDate ? 'border-blue-500 text-blue-600' : ''}`}
                    >
                      <CalendarIcon className="h-4 w-4" />
                      {feedbackDate
                        ? feedbackDate.toLocaleDateString()
                        : 'Backdate'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={feedbackDate}
                      onSelect={setFeedbackDate}
                      disabled={(date) => date > new Date()}
                      initialFocus
                    />
                    {feedbackDate && (
                      <div className="border-t p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-full text-xs"
                          onClick={() => setFeedbackDate(undefined)}
                        >
                          Clear date (use today)
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
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
                    (!feedbackText.trim() && feedbackFiles.length === 0) ||
                    isSubmittingFeedback ||
                    isUploadingFiles
                  }
                  size="sm"
                  className="h-8 w-8 shrink-0 p-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
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
                          <div
                            key={file.id}
                            className="group flex items-center gap-1 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-xs hover:border-gray-300"
                          >
                            <FileIcon className="h-3 w-3 text-gray-500" />
                            <span className="text-gray-700">
                              {file.fileName}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 px-1 text-xs"
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
                                  className="h-4 w-4 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
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
                                      createToast('File removed', {
                                        timeout: 3000,
                                      })
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
                              onClick={async () => {
                                if (
                                  !confirm(
                                    'Remove this image? This action cannot be undone.',
                                  )
                                ) {
                                  return
                                }
                                try {
                                  await deleteFile({
                                    data: { proofFileId: file.id },
                                  })
                                  createToast('File removed', {
                                    timeout: 3000,
                                  })
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
