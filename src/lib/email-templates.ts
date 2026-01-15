import { formatCurrency } from '@/lib/utils'
import type { QuarterBreakdown } from '@/lib/commission-calculator'

export interface CommissionBonusEmailData {
  employeeName: string
  quarter: string
  quota: number
  attainment: number
  attainmentPercentage: number
  bonusAmount: number
  calculatedAmount: number
  calculatedAmountLocal?: number
  localCurrency?: string
  quarterBreakdown?: QuarterBreakdown
  nextQuarterRampUpAmount?: number
  notes?: string
  sheet?: string
  /** Trailing 12-month performance percentage (if > 100%, show a congratulatory message) */
  trailing12MonthsPerformance?: number
}

export function generateCommissionBonusEmail(
  data: CommissionBonusEmailData,
): string {
  const {
    employeeName,
    quarter,
    quota,
    attainment,
    attainmentPercentage,
    bonusAmount,
    calculatedAmount,
    calculatedAmountLocal,
    localCurrency,
    quarterBreakdown,
    nextQuarterRampUpAmount,
    notes,
    sheet,
    trailing12MonthsPerformance,
  } = data

  // Check if this is a ramp-up only quarter (no post-ramp-up portion)
  const isRampUpOnly =
    quarterBreakdown &&
    quarterBreakdown.rampUpMonths > 0 &&
    quarterBreakdown.postRampUpMonths === 0

  if (isRampUpOnly) {
    // Email for employees only getting fixed OTE this quarter
    const rampUpMonths = quarterBreakdown.rampUpMonths
    const localAmountText = calculatedAmountLocal
      ? formatCurrency(calculatedAmountLocal, localCurrency)
      : formatCurrency(calculatedAmount)

    let nextQuarterHtml = ''
    if (nextQuarterRampUpAmount && nextQuarterRampUpAmount > 0) {
      const nextQuarterLocalAmount = formatCurrency(
        nextQuarterRampUpAmount,
        localCurrency,
      )
      nextQuarterHtml = `<p>You will get another ${nextQuarterLocalAmount} next quarter as well as your quota'd performance attainment.</p>`
    }

    return `
<p>Hi ${employeeName},</p>
<p>Just confirming that you are due ${rampUpMonths > 1 ? `${rampUpMonths} months` : '1 month'} of fixed commission so <strong>${localAmountText}</strong>.</p>
${nextQuarterHtml}
<p>Any questions just let us know.</p>
`.trim()
  }

  // Standard email with full breakdown
  const notesHtml = notes ? `<p>${notes}</p>` : ''
  const sheetHtml = sheet
    ? `<p>You can see a list of your accounts in <a href="${sheet}" target="_blank">this sheet</a>.</p> `
    : ''

  // Add trailing 12-month performance message if > 100%
  const trailing12MonthsHtml =
    trailing12MonthsPerformance && trailing12MonthsPerformance > 100
      ? `<p>Finally, I wanted to flag that over the last 12 months you've hit <strong>${trailing12MonthsPerformance.toFixed(0)}%</strong> quota performance! Awesome work!</p>`
      : ''

  return `
<p>Hey ${employeeName},</p>
<p>Confirming your commission for ${quarter} will be <strong>${formatCurrency(calculatedAmountLocal, localCurrency)}</strong></p>
<p>${sheetHtml}Here is the breakdown:</p>
<ul>
  <li>Quota: ${formatCurrency(quota)}</li>
  <li>Attainment: ${formatCurrency(attainment)} (${attainmentPercentage.toFixed(1)}%)</li>
  <li>OTE amount: ${formatCurrency(bonusAmount)}</li>
  <li>OTE payout: ${formatCurrency(calculatedAmount)}</li>
  <li>Local amount: ${formatCurrency(calculatedAmountLocal, localCurrency)}</li>
</ul>
${notesHtml}${trailing12MonthsHtml}
<p>Please let us know any errors within 48 hours, so we can make these ahead of payroll changes. We will always default to getting you paid out on time and fixing any issues after that.</p>
<p><em>PS we will optimise for getting this into your payroll for this month so any ongoing small tweaks might not make it in and will be resolved next quarter.</em></p>
`.trim()
}
