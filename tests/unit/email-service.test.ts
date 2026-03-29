import { describe, expect, it, vi } from 'vitest'
import { mockResendSend } from '../mocks/external-apis'
import { sendEmail } from '@/lib/email-service'

vi.stubEnv('COMMISSION_PAYOUT_EMAIL_SENDER', 'Charles')

describe('sendEmail', () => {
  it('sends email successfully', async () => {
    mockResendSend.mockResolvedValue({ data: { id: 'email-1' }, error: null })

    const result = await sendEmail({
      to: 'alice@posthog.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    })

    expect(result).toEqual({ success: true })
    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'alice@posthog.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      }),
    )
  })

  it('returns error when Resend returns an error', async () => {
    mockResendSend.mockResolvedValue({
      data: null,
      error: { message: 'Invalid recipient' },
    })

    const result = await sendEmail({
      to: 'bad@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    })

    expect(result).toEqual({
      success: false,
      error: 'Invalid recipient',
    })
  })

  it('returns error when Resend throws', async () => {
    mockResendSend.mockRejectedValue(new Error('Network failure'))

    const result = await sendEmail({
      to: 'alice@posthog.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    })

    expect(result).toEqual({
      success: false,
      error: 'Network failure',
    })
  })

  it('handles non-Error exceptions', async () => {
    mockResendSend.mockRejectedValue('string error')

    const result = await sendEmail({
      to: 'alice@posthog.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    })

    expect(result).toEqual({
      success: false,
      error: 'Unknown error',
    })
  })

  it('includes cc when provided', async () => {
    mockResendSend.mockResolvedValue({ data: { id: 'email-2' }, error: null })

    await sendEmail({
      to: 'alice@posthog.com',
      subject: 'Test',
      html: '<p>Hello</p>',
      cc: ['bob@posthog.com', 'carol@posthog.com'],
    })

    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        cc: ['bob@posthog.com', 'carol@posthog.com'],
      }),
    )
  })

  it('omits cc when empty array', async () => {
    mockResendSend.mockResolvedValue({ data: { id: 'email-3' }, error: null })

    await sendEmail({
      to: 'alice@posthog.com',
      subject: 'Test',
      html: '<p>Hello</p>',
      cc: [],
    })

    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        cc: undefined,
      }),
    )
  })
})
