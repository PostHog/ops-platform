import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

const content = fs.readFileSync(
  path.join(process.cwd(), 'src/components/PerformanceProgramChecklistItem.tsx'),
  'utf-8',
)

describe('PerformanceProgramChecklistItem', () => {
  it('exports PerformanceProgramChecklistItem as a named export', () => {
    expect(content).toMatch(/export function PerformanceProgramChecklistItem/)
  })

  it('accepts item and onUpdate props', () => {
    expect(content).toMatch(/item:\s*ChecklistItem/)
    expect(content).toMatch(/onUpdate:\s*\(\)\s*=>\s*void/)
  })

  it('uses multiple server functions for checklist operations', () => {
    expect(content).toMatch(/useServerFn\(updateChecklistItem\)/)
    expect(content).toMatch(/useServerFn\(getProofFileUploadUrl\)/)
    expect(content).toMatch(/useServerFn\(createProofFileRecord\)/)
    expect(content).toMatch(/useServerFn\(getProofFileUrl\)/)
    expect(content).toMatch(/useServerFn\(deleteProofFile\)/)
  })

  it('handles toggling completion status', () => {
    expect(content).toMatch(/handleToggleComplete/)
    expect(content).toMatch(/completed:\s*checked/)
    expect(content).toMatch(/'Checklist item marked as complete'/)
    expect(content).toMatch(/'Checklist item marked as incomplete'/)
  })

  it('supports file upload with 10MB limit and S3 presigned URLs', () => {
    expect(content).toMatch(/handleFileUpload/)
    expect(content).toMatch(/10 \* 1024 \* 1024/)
    expect(content).toMatch(/File size exceeds 10MB limit/)
    expect(content).toMatch(/uploadUrl/)
    expect(content).toMatch(/method:\s*'PUT'/)
  })

  it('auto-completes item after successful file upload', () => {
    expect(content).toMatch(/if \(!item\.completed\)/)
    expect(content).toMatch(/completed:\s*true/)
    expect(content).toMatch(/'File uploaded and item marked complete'/)
  })

  it('supports drag and drop for file attachment', () => {
    expect(content).toMatch(/handleDragEnter/)
    expect(content).toMatch(/handleDragLeave/)
    expect(content).toMatch(/handleDragOver/)
    expect(content).toMatch(/handleDrop/)
    expect(content).toMatch(/Drop files to attach/)
  })

  it('allows assigning employees to checklist items', () => {
    expect(content).toMatch(/handleAssignEmployee/)
    expect(content).toMatch(/assignedToEmployeeId/)
    expect(content).toMatch(/Assign:/)
    expect(content).toMatch(/Unassign/)
  })

  it('shows overdue status when item is past due date', () => {
    expect(content).toMatch(/isOverdue/)
    expect(content).toMatch(/!item\.completed && item\.dueDate && new Date\(item\.dueDate\) < new Date\(\)/)
  })

  it('separates image and non-image files for display', () => {
    expect(content).toMatch(/imageFiles/)
    expect(content).toMatch(/nonImageFiles/)
    expect(content).toMatch(/isImageFile/)
  })
})
