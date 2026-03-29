import { vi } from 'vitest'

// --- Global fetch mock ---

export const mockFetch = vi.fn()

// Helper to set up a fetch response for a URL pattern
export function mockFetchResponse(
  body: unknown,
  init?: { status?: number; headers?: Record<string, string> },
) {
  const status = init?.status ?? 200
  return mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
    headers: new Headers(init?.headers),
  })
}

export function mockFetchError(message: string) {
  return mockFetch.mockRejectedValueOnce(new Error(message))
}

vi.stubGlobal('fetch', mockFetch)

// --- Resend (email service) ---

export const mockResendSend = vi.fn()

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: mockResendSend,
    },
  })),
}))

// --- AWS S3 ---

export const mockGetSignedUrl = vi.fn()

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({})),
  PutObjectCommand: vi.fn().mockImplementation((input: unknown) => input),
  GetObjectCommand: vi.fn().mockImplementation((input: unknown) => input),
}))

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
}))

// --- Anthropic AI SDK ---

export const mockAnthropicStream = vi.fn()

vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn(() => 'mock-model'),
}))
