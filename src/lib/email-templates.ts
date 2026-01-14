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
<p>Just confirming that you are due ${rampUpMonths} months of fixed commission so <strong>${localAmountText}</strong>.</p>
${nextQuarterHtml}
<p>Any questions just let us know.</p>
`.trim()
  }

  // Standard email with full breakdown
  return `
<p>Hey ${employeeName},</p>
<p>Confirming your commission for ${quarter} will be <strong>${formatCurrency(calculatedAmountLocal, localCurrency)}</strong></p>
<p>You can see the breakdown here:</p>
<ul>
  <li>Quota: ${formatCurrency(quota)}</li>
  <li>Attainment: ${formatCurrency(attainment)} (${attainmentPercentage.toFixed(1)}%)</li>
  <li>OTE amount: ${formatCurrency(bonusAmount)}</li>
  <li>OTE payout: ${formatCurrency(calculatedAmount)}</li>
  <li>Local amount: ${formatCurrency(calculatedAmountLocal, localCurrency)}</li>
</ul>
<p>Please let us know any errors within 48 hours, so we can make these ahead of payroll changes. We will always default to getting you paid out on time and fixing any issues after that.</p>
<p>Cheers,</p>
<p><em>PS we will optimise for getting this into your payroll for this month so any ongoing small tweaks might not make it in and will be resolved next quarter.</em></p>
`.trim()
}
