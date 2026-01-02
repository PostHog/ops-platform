import { formatCurrency } from '@/lib/utils'

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
  } = data

  const localAmountLine =
    calculatedAmountLocal && localCurrency && localCurrency !== 'USD'
      ? `Local Amount: ${formatCurrency(calculatedAmountLocal, localCurrency)}\n`
      : ''

  return `Commission Bonus Confirmation - ${quarter}

Hey ${employeeName},

Just confirming your commission bonus for ${quarter}:

Quota: ${formatCurrency(quota)}
Attainment: ${formatCurrency(attainment)} (${attainmentPercentage.toFixed(1)}%)
Quarterly Bonus Amount: ${formatCurrency(bonusAmount)}
Calculated Bonus: ${formatCurrency(calculatedAmount)}
${localAmountLine}This will be processed according to our standard payment schedule.

Let us know if you have any questions!
`.trim()
}
