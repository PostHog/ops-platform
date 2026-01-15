import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  from?: string
  cc?: string[]
}

export async function sendEmail({
  to,
  subject,
  html,
  from = `${process.env.COMMISSION_PAYOUT_EMAIL_SENDER} <commission-confirmation@ops.posthog.dev>`,
  cc,
}: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
      cc: cc && cc.length > 0 ? cc : undefined,
    })

    if (result.error) {
      return {
        success: false,
        error: result.error.message || 'Failed to send email',
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
