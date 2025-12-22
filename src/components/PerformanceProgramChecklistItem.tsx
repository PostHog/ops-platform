import { useState } from 'react'
import { CheckCircle2, Circle, Upload, File as FileIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createToast } from 'vercel-toast'
import { useServerFn } from '@tanstack/react-start'
import { useQuery } from '@tanstack/react-query'
import {
  updateChecklistItem,
  getDeelEmployees,
  getProofFileUploadUrl,
  createProofFileRecord,
  getProofFileUrl,
  deleteProofFile,
} from '@/routes/employee.$employeeId'
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
        name: true
        workEmail: true
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

  const updateItem = useServerFn(updateChecklistItem)
  const getDeelEmployeesFn = useServerFn(getDeelEmployees)
  const getUploadUrl = useServerFn(getProofFileUploadUrl)
  const createFileRecord = useServerFn(createProofFileRecord)
  const getFileUrl = useServerFn(getProofFileUrl)
  const deleteFileFn = useServerFn(deleteProofFile)

  const { data: deelEmployees } = useQuery({
    queryKey: ['deelEmployees'],
    queryFn: () => getDeelEmployeesFn(),
  })

  const handleToggleComplete = async (checked: boolean) => {
    setIsUpdating(true)
    try {
      await updateItem({
        data: {
          checklistItemId: item.id,
          completed: checked,
          notes: notes,
          assignedToDeelEmployeeId: item.assignedTo?.id || null,
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

  const handleAssignDeelEmployee = async (deelEmployeeId: string) => {
    setIsUpdating(true)
    try {
      await updateItem({
        data: {
          checklistItemId: item.id,
          completed: item.completed,
          notes: notes,
          assignedToDeelEmployeeId: deelEmployeeId === 'unassign' ? null : deelEmployeeId,
        },
      })
      createToast(
        deelEmployeeId === 'unassign'
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

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
            notes: notes,
            assignedToDeelEmployeeId: item.assignedTo?.id || null,
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
      // Reset file input
      e.target.value = ''
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

  const itemTypeLabel =
    item.type === 'SLACK_FEEDBACK_MEETING'
      ? 'Slack Feedback Meeting'
      : 'Email Feedback Meeting'

  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        item.completed
          ? 'border-green-200 bg-green-50/50'
          : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {item.completed ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <Circle className="h-5 w-5 text-gray-400" />
          )}
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4
                className={`font-medium ${
                  item.completed ? 'text-green-900' : 'text-gray-900'
                }`}
              >
                {itemTypeLabel}
              </h4>
              {item.completed && item.completedAt && (
                <span className="text-xs text-gray-500">
                  {new Date(item.completedAt).toLocaleDateString()}
                </span>
              )}
              {item.assignedTo && (
                <span className="text-xs text-gray-500">
                  Assigned to: {item.assignedTo.name || item.assignedTo.workEmail}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={item.assignedTo?.id || 'unassign'}
                onValueChange={handleAssignDeelEmployee}
                disabled={isUpdating}
              >
                <SelectTrigger className="h-8 w-[180px] text-xs">
                  <SelectValue placeholder="Assign to..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassign">Unassign</SelectItem>
                  {deelEmployees?.map((deelEmployee) => (
                    <SelectItem key={deelEmployee.id} value={deelEmployee.id}>
                      {deelEmployee.name || deelEmployee.workEmail}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Checkbox
                checked={item.completed}
                onCheckedChange={handleToggleComplete}
                disabled={isUpdating}
              />
            </div>
          </div>

          {item.files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.files.map((file) => (
                <div
                  key={file.id}
                  className="group flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm hover:border-gray-300"
                >
                  <FileIcon className="h-3.5 w-3.5 text-gray-500" />
                  <span className="text-gray-700">{file.fileName}</span>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1.5 text-xs"
                      onClick={() => handleDownloadFile(file.id)}
                    >
                      Download
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => handleDeleteFile(file.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="file"
                id={`file-upload-${item.id}`}
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.gif,.txt"
                onChange={handleFileUpload}
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
                  className="w-full"
                  asChild
                >
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    {isUploading ? 'Uploading...' : 'Upload Proof'}
                  </span>
                </Button>
              </Label>
            </div>
          </div>

          <Textarea
            id={`notes-${item.id}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={async () => {
              if (notes !== item.notes) {
                setIsUpdating(true)
                try {
                  await updateItem({
                    data: {
                      checklistItemId: item.id,
                      completed: item.completed,
                      notes: notes,
                      assignedToDeelEmployeeId: item.assignedTo?.id || null,
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
            className="min-h-[60px] resize-none text-sm"
            rows={2}
            disabled={item.completed}
          />
        </div>
      </div>
    </div>
  )
}
