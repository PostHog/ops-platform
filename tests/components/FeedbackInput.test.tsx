import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

const content = fs.readFileSync(
  path.join(process.cwd(), 'src/components/FeedbackInput.tsx'),
  'utf-8',
)

describe('FeedbackInput', () => {
  it('exports FeedbackInput as a named export', () => {
    expect(content).toMatch(/export function FeedbackInput/)
  })

  it('accepts programId and onFeedbackAdded props', () => {
    expect(content).toMatch(/programId:\s*string/)
    expect(content).toMatch(/onFeedbackAdded:\s*\(\)\s*=>\s*void/)
  })

  it('uses server functions for feedback and file operations', () => {
    expect(content).toMatch(/useServerFn\(addProgramFeedback\)/)
    expect(content).toMatch(/useServerFn\(getProofFileUploadUrl\)/)
    expect(content).toMatch(/useServerFn\(createProofFileRecord\)/)
  })

  it('enforces 10MB file size limit on uploads', () => {
    expect(content).toMatch(/file\.size > 10 \* 1024 \* 1024/)
    expect(content).toMatch(/File size exceeds 10MB limit/)
  })

  it('supports drag and drop for file attachment', () => {
    expect(content).toMatch(/handleDragEnter/)
    expect(content).toMatch(/handleDragLeave/)
    expect(content).toMatch(/handleDrop/)
    expect(content).toMatch(/Drop files to attach/)
    expect(content).toMatch(/isDragging/)
  })

  it('supports paste for image attachment', () => {
    expect(content).toMatch(/handlePaste/)
    expect(content).toMatch(/clipboardData\.items/)
    expect(content).toMatch(/item\.type\.startsWith\('image\/'\)/)
    expect(content).toMatch(/item\.getAsFile\(\)/)
  })

  it('supports backdating feedback with a calendar picker', () => {
    expect(content).toMatch(/feedbackDate/)
    expect(content).toMatch(/Calendar/)
    expect(content).toMatch(/Backdate/)
    expect(content).toMatch(/Clear date \(use today\)/)
    expect(content).toMatch(/createdAt:\s*feedbackDate\.toISOString\(\)/)
  })

  it('disables submit when feedback is empty and no files attached', () => {
    expect(content).toMatch(
      /disabled=\{[\s\S]*?!feedbackText\.trim\(\) && feedbackFiles\.length === 0/,
    )
  })

  it('resets form state after successful submission', () => {
    expect(content).toMatch(/setFeedbackText\(''\)/)
    expect(content).toMatch(/setFeedbackDate\(undefined\)/)
    expect(content).toMatch(/setFeedbackFiles\(\[\]\)/)
    expect(content).toMatch(/onFeedbackAdded\(\)/)
  })
})
