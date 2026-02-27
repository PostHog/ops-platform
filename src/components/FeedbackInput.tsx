import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CalendarIcon,
  File as FileIcon,
  ImageIcon,
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
import { createToast } from 'vercel-toast'
import { useServerFn } from '@tanstack/react-start'
import {
  addProgramFeedback,
  getProofFileUploadUrl,
  createProofFileRecord,
} from '@/routes/employee.$employeeId'
import { isImageFile } from './InlineProofImage'

function PendingImagePreview({
  file,
  fileName,
}: {
  file: File
  fileName: string
}) {
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    if (imgRef.current) {
      imgRef.current.src = url
    }
    return () => URL.revokeObjectURL(url)
  }, [file])

  return (
    <img
      ref={imgRef}
      alt={fileName}
      className="max-h-[120px] rounded border border-gray-200"
    />
  )
}

interface FeedbackInputProps {
  programId: string
  onFeedbackAdded: () => void
}

export function FeedbackInput({
  programId,
  onFeedbackAdded,
}: FeedbackInputProps) {
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackDate, setFeedbackDate] = useState<Date | undefined>(undefined)
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  const [feedbackFiles, setFeedbackFiles] = useState<
    Array<File & { fileKey: string }>
  >([])
  const [uploadingFilesCount, setUploadingFilesCount] = useState(0)
  const isUploadingFiles = uploadingFilesCount > 0
  const [dragCounter, setDragCounter] = useState(0)
  const isDragging = dragCounter > 0

  const addFeedback = useServerFn(addProgramFeedback)
  const getUploadUrl = useServerFn(getProofFileUploadUrl)
  const createFileRecord = useServerFn(createProofFileRecord)

  const handleFileUpload = async (file: File) => {
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
          programId,
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
    if (!feedbackText.trim() && feedbackFiles.length === 0) return

    setIsSubmittingFeedback(true)
    try {
      // Create feedback first
      const feedback = await addFeedback({
        data: {
          programId,
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
      onFeedbackAdded()
    } catch (error) {
      createToast(
        error instanceof Error ? error.message : 'Failed to add feedback',
        { timeout: 3000 },
      )
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragCounter((c) => c + 1)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragCounter((c) => Math.max(0, c - 1))
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

  return (
    <div
      className={`mb-2 space-y-1.5 rounded-md border-2 border-dashed p-1.5 transition-colors ${
        isDragging ? 'border-blue-400 bg-blue-50/50' : 'border-transparent'
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
                <PendingImagePreview file={file} fileName={file.name} />
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
                {feedbackDate ? feedbackDate.toLocaleDateString() : 'Backdate'}
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
            <Label htmlFor="feedback-file-upload" className="cursor-pointer">
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
  )
}
