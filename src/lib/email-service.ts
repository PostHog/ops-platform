import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface SendEmailOptions {
  to: string
  subject: string
  text: string
  from?: string
}

export async function sendEmail({
  to,
  subject,
  text,
  from = 'Ops platform <onboarding@resend.dev>', // Default Resend sender, should be configured with verified domain
}: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await resend.emails.send({
      from,
      to,
      subject,
      text,
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
