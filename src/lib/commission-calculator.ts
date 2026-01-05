/**
 * Calculate quarterly commission bonus
 * Formula: (attainment / quota) × bonusAmount
 */
export function calculateCommissionBonus(
  attainment: number,
  quota: number,
  bonusAmount: number,
): number {
  if (quota <= 0) {
    throw new Error('Quota must be greater than 0')
  }
  if (attainment < 0) {
    throw new Error('Attainment must be greater than or equal to 0')
  }
  return (attainment / quota) * bonusAmount
}

/**
 * Get the previous quarter in "YYYY-QN" format
 * If importing in January, February, or March, defaults to Q4 of previous year
 * Otherwise defaults to the previous quarter
 */
export function getPreviousQuarter(): string {
  const now = new Date()
  const currentMonth = now.getMonth() // 0-11 (January = 0)
  const currentYear = now.getFullYear()

  // Current quarter (1-4)
  const currentQuarter = Math.floor(currentMonth / 3) + 1

  // Calculate previous quarter
  let previousQuarter: number
  let previousQuarterYear: number

  if (currentQuarter === 1) {
    // If we're in Q1 (Jan-Mar), previous quarter is Q4 of previous year
    previousQuarter = 4
    previousQuarterYear = currentYear - 1
  } else {
    // Otherwise, previous quarter is currentQuarter - 1 of current year
    previousQuarter = currentQuarter - 1
    previousQuarterYear = currentYear
  }

  return `${previousQuarterYear}-Q${previousQuarter}`
}

/**
 * Validate quarter format (YYYY-QN where N is 1-4)
 */
export function validateQuarterFormat(quarter: string): boolean {
  const quarterRegex = /^\d{4}-Q[1-4]$/
  return quarterRegex.test(quarter)
}

/**
 * Validate quota (must be > 0)
 */
export function validateQuota(quota: number): boolean {
  return quota > 0
}

/**
 * Validate attainment (must be >= 0)
 */
export function validateAttainment(attainment: number): boolean {
  return attainment >= 0
}
