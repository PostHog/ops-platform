import { describe, expect, it, vi } from 'vitest'
import { mockGetSignedUrl } from '../mocks/external-apis'
import {
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  generateFileKey,
} from '@/lib/s3'

vi.stubEnv('AWS_S3_ENDPOINT', 'https://s3.example.com')
vi.stubEnv('AWS_S3_REGION', 'us-east-1')
vi.stubEnv('AWS_S3_KEY_ID', 'test-key')
vi.stubEnv('AWS_S3_SECRET_ACCESS_KEY', 'test-secret')
vi.stubEnv('AWS_S3_BUCKET_NAME', 'test-bucket')

describe('getPresignedUploadUrl', () => {
  it('calls getSignedUrl and returns the URL', async () => {
    mockGetSignedUrl.mockResolvedValue('https://s3.example.com/upload-url')

    const url = await getPresignedUploadUrl('test-key', 'image/png')

    expect(url).toBe('https://s3.example.com/upload-url')
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1)
    // Second arg is the command, third is options with expiresIn
    const callArgs = mockGetSignedUrl.mock.calls[0]
    expect(callArgs[2]).toEqual({ expiresIn: 3600 })
  })

  it('uses custom expiresIn', async () => {
    mockGetSignedUrl.mockResolvedValue('https://s3.example.com/upload-url')

    await getPresignedUploadUrl('test-key', 'image/png', 600)

    const callArgs = mockGetSignedUrl.mock.calls[0]
    expect(callArgs[2]).toEqual({ expiresIn: 600 })
  })
})

describe('getPresignedDownloadUrl', () => {
  it('calls getSignedUrl and returns the URL', async () => {
    mockGetSignedUrl.mockResolvedValue('https://s3.example.com/download-url')

    const url = await getPresignedDownloadUrl('test-key')

    expect(url).toBe('https://s3.example.com/download-url')
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1)
    const callArgs = mockGetSignedUrl.mock.calls[0]
    expect(callArgs[2]).toEqual({ expiresIn: 3600 })
  })

  it('uses custom expiresIn', async () => {
    mockGetSignedUrl.mockResolvedValue('https://s3.example.com/download-url')

    await getPresignedDownloadUrl('test-key', 1800)

    const callArgs = mockGetSignedUrl.mock.calls[0]
    expect(callArgs[2]).toEqual({ expiresIn: 1800 })
  })
})

describe('generateFileKey', () => {
  it('returns a key with program, checklist item, and filename', () => {
    const key = generateFileKey('prog-1', 'item-1', 'report.pdf')
    expect(key).toMatch(
      /^performance-programs\/prog-1\/item-1\/\d+-report\.pdf$/,
    )
  })

  it('sanitizes special characters in filename', () => {
    const key = generateFileKey('prog-1', 'item-1', 'my file (v2).pdf')
    expect(key).toContain('my_file__v2_.pdf')
    expect(key).not.toContain(' ')
    expect(key).not.toContain('(')
  })

  it('preserves safe characters', () => {
    const key = generateFileKey('prog-1', 'item-1', 'file-name_v2.txt')
    expect(key).toContain('file-name_v2.txt')
  })

  it('includes a timestamp for uniqueness', () => {
    const key1 = generateFileKey('p', 'i', 'f.txt')
    const key2 = generateFileKey('p', 'i', 'f.txt')
    // Both should match the pattern
    expect(key1).toMatch(/\/\d+-f\.txt$/)
    expect(key2).toMatch(/\/\d+-f\.txt$/)
  })
})
