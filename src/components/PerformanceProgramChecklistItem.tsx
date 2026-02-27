import { useCallback, useEffect, useState } from 'react'
import { File as FileIcon, ImageIcon, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createToast } from 'vercel-toast'
import { useServerFn } from '@tanstack/react-start'
import { getChecklistItemTypeLabel } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import {
  updateChecklistItem,
  getProofFileUploadUrl,
  createProofFileRecord,
  getProofFileUrl,
  deleteProofFile,
} from '@/routes/employee.$employeeId'
import { getDeelEmployeesAndProposedHires } from '@/routes/org-chart'
import { getFullName } from '@/lib/utils'
import { InlineProofImage, isImageFile } from './InlineProofImage'
import type { Prisma } from '@prisma/client'

type ChecklistItem = Prisma.PerformanceProgramChecklistItemGetPayload<{
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
}>

interface PerformanceProgramChecklistItemProps {
  item: ChecklistItem
  onUpdate: () => void
}

export function PerformanceProgramChecklistItem({
  item,
  onUpdate,
}: PerformanceProgramChecklistItemProps) {
  const [notes, setNotes] = useState(item.notes || '')
  const [isUploading, setIsUploading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)
  const isDragging = dragCounter > 0

  const updateItem = useServerFn(updateChecklistItem)
  const getDeelEmployeesFn = useServerFn(getDeelEmployeesAndProposedHires)
  const getUploadUrl = useServerFn(getProofFileUploadUrl)
  const createFileRecord = useServerFn(createProofFileRecord)
  const getFileUrl = useServerFn(getProofFileUrl)
  const deleteFileFn = useServerFn(deleteProofFile)

  const { data: deelEmployeesData } = useQuery({
    queryKey: ['deelEmployeesAndProposedHires'],
    queryFn: () => getDeelEmployeesFn(),
  })

  useEffect(() => {
    setNotes(item.notes || '')
  }, [item.notes])

  const handleToggleComplete = async (checked: boolean) => {
    setIsUpdating(true)
    try {
      await updateItem({
        data: {
          checklistItemId: item.id,
          completed: checked,
          notes: notes || undefined,
          assignedToEmployeeId: item.assignedTo?.id || null,
          dueDate: item.dueDate ? new Date(item.dueDate).toISOString() : null,
        },
      })
      createToast(
        checked
          ? 'Checklist item marked as complete'
          : 'Checklist item marked as incomplete',
        { timeout: 3000 },
      )
      onUpdate()
    } catch (error) {
      createToast(
        error instanceof Error
          ? error.message
          : 'Failed to update checklist item',
        { timeout: 3000 },
      )
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAssignEmployee = async (employeeId: string) => {
    setIsUpdating(true)
    try {
      await updateItem({
        data: {
          checklistItemId: item.id,
          completed: item.completed,
          notes: notes || undefined,
          assignedToEmployeeId: employeeId === 'unassign' ? null : employeeId,
          dueDate: item.dueDate ? new Date(item.dueDate).toISOString() : null,
        },
      })
      createToast(
        employeeId === 'unassign'
          ? 'Assignment removed'
          : 'Checklist item assigned',
        { timeout: 3000 },
      )
      onUpdate()
    } catch (error) {
      createToast(
        error instanceof Error
          ? error.message
          : 'Failed to assign checklist item',
        { timeout: 3000 },
      )
    } finally {
      setIsUpdating(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      createToast('File size exceeds 10MB limit', { timeout: 3000 })
      return
    }

    setIsUploading(true)
    try {
      // Get presigned upload URL
      const { uploadUrl, fileKey } = await getUploadUrl({
        data: {
          checklistItemId: item.id,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
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

      // Create database record
      await createFileRecord({
        data: {
          checklistItemId: item.id,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          fileKey,
        },
      })

      // Auto-complete the item after successful file upload
      if (!item.completed) {
        await updateItem({
          data: {
            checklistItemId: item.id,
            completed: true,
            notes: notes || undefined,
            assignedToEmployeeId: item.assignedTo?.id || null,
            dueDate: item.dueDate ? new Date(item.dueDate).toISOString() : null,
          },
        })
        createToast('File uploaded and item marked complete', { timeout: 3000 })
      } else {
        createToast('File uploaded successfully', { timeout: 3000 })
      }
      onUpdate()
    } catch (error) {
      createToast(
        error instanceof Error ? error.message : 'Failed to upload file',
        { timeout: 3000 },
      )
    } finally {
      setIsUploading(false)
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
      if (files.length > 0) {
        handleFileUpload(files[0])
      }
    },
    [handleFileUpload],
  )

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
      await deleteFileFn({ data: { proofFileId: fileId } })
      createToast('File removed', { timeout: 3000 })
      onUpdate()
    } catch (error) {
      createToast(
        error instanceof Error ? error.message : 'Failed to remove file',
        { timeout: 3000 },
      )
    }
  }

  const itemTypeLabel = getChecklistItemTypeLabel(item.type)

  // Check if item is overdue
  const isOverdue =
    !item.completed && item.dueDate && new Date(item.dueDate) < new Date()

  const imageFiles = item.files.filter((f) =>
    isImageFile(f.fileName, f.mimeType),
  )
  const nonImageFiles = item.files.filter(
    (f) => !isImageFile(f.fileName, f.mimeType),
  )

  return (
    <div
      className={`flex flex-col gap-2 rounded border px-3 py-2 transition-colors ${
        item.completed
          ? 'border-green-200 bg-green-50/50'
          : isDragging
            ? 'border-blue-400 bg-blue-50/50'
            : 'border-gray-200 bg-white'
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-3">
        <Checkbox
          checked={item.completed}
          onCheckedChange={handleToggleComplete}
          disabled={isUpdating}
          className="shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div
              className={`text-sm font-medium ${
                item.completed ? 'text-green-900' : 'text-gray-900'
              }`}
            >
              {itemTypeLabel}
            </div>
            {item.dueDate && !item.completed && (
              <div
                className={`flex items-center gap-1 text-xs ${
                  isOverdue ? 'text-orange-600' : 'text-gray-500'
                }`}
              >
                <span>
                  {isOverdue ? 'Overdue' : 'Due'}{' '}
                  {new Date(item.dueDate).toLocaleDateString()}
                </span>
              </div>
            )}
            {item.completed && item.completedAt && (
              <div className="text-xs text-gray-500">
                Completed {new Date(item.completedAt).toLocaleDateString()}
              </div>
            )}
          </div>
          {nonImageFiles.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {nonImageFiles.map((file) => (
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => handleDeleteFile(file.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-2">
            <Label
              htmlFor={`assign-${item.id}`}
              className="text-xs text-gray-600"
            >
              Assign:
            </Label>
            <Select
              value={item.assignedTo?.id || 'unassign'}
              onValueChange={handleAssignEmployee}
              disabled={isUpdating}
            >
              <SelectTrigger
                id={`assign-${item.id}`}
                className="h-8 w-[180px] text-xs"
              >
                <SelectValue placeholder="Assign to...">
                  {item.assignedTo
                    ? getFullName(
                        item.assignedTo.deelEmployee?.firstName,
                        item.assignedTo.deelEmployee?.lastName,
                        item.assignedTo.email,
                      )
                    : 'Assign to...'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassign">Unassign</SelectItem>
                {deelEmployeesData?.employees
                  ?.filter((de) => de.employee)
                  .sort((a, b) =>
                    getFullName(a.firstName, a.lastName).localeCompare(
                      getFullName(b.firstName, b.lastName),
                    ),
                  )
                  .map((de) => (
                    <SelectItem key={de.employee!.id} value={de.employee!.id}>
                      {getFullName(
                        de.firstName,
                        de.lastName,
                        de.employee!.email,
                      )}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative">
            <input
              type="file"
              id={`file-upload-${item.id}`}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.gif,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  handleFileUpload(file)
                }
                e.target.value = ''
              }}
              disabled={isUploading}
            />
            <Label
              htmlFor={`file-upload-${item.id}`}
              className="cursor-pointer"
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploading}
                asChild
              >
                <span>
                  <Upload className="h-3.5 w-3.5" />
                </span>
              </Button>
            </Label>
          </div>
        </div>
      </div>
      {imageFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {imageFiles.map((file) => (
            <div key={file.id} className="group relative">
              <InlineProofImage fileId={file.id} fileName={file.fileName} />
              <button
                type="button"
                className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-800/70 text-white opacity-0 shadow transition-opacity group-hover:opacity-100 hover:bg-gray-900"
                onClick={() => handleDeleteFile(file.id)}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {isDragging && (
        <div className="flex items-center gap-1.5 text-xs text-blue-600">
          <ImageIcon className="h-3.5 w-3.5" />
          Drop files to attach
        </div>
      )}
      <Textarea
        id={`notes-${item.id}`}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={async () => {
          if (notes !== (item.notes || '')) {
            setIsUpdating(true)
            try {
              await updateItem({
                data: {
                  checklistItemId: item.id,
                  completed: item.completed,
                  notes: notes || undefined,
                  assignedToEmployeeId: item.assignedTo?.id || null,
                  dueDate: item.dueDate
                    ? new Date(item.dueDate).toISOString()
                    : null,
                },
              })
              onUpdate()
            } catch (error) {
              createToast(
                error instanceof Error
                  ? error.message
                  : 'Failed to update notes',
                { timeout: 3000 },
              )
            } finally {
              setIsUpdating(false)
            }
          }
        }}
        placeholder="Add notes (optional)..."
        className="w-full resize-none text-sm"
        rows={3}
      />
    </div>
  )
}
