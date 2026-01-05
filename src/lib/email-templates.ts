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

  return `
Hey ${employeeName},

Confirming your commission for ${quarter} will be ${formatCurrency(calculatedAmount)}

You can see the breakdown here:

Quota: ${formatCurrency(quota)}
Attainment: ${formatCurrency(attainment)} (${attainmentPercentage.toFixed(1)}%)
OTE amount: ${formatCurrency(bonusAmount)}
OTE payout: ${formatCurrency(calculatedAmount)}
Local amount: ${formatCurrency(calculatedAmountLocal, localCurrency)}

Cheers,

PS we will optimise for getting this into your payroll for this month so any ongoing small tweaks might not make it in and will be resolved next quarter.
`.trim()
}
