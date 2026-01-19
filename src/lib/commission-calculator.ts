/**
 * Breakdown of how a quarter is split for bonus calculation (in months, can be fractional)
 */
export type QuarterBreakdown = {
  /** Months not employed (before effective start) - gets nothing */
  notEmployedMonths: number
  /** Months in ramp-up period - gets 100% OTE */
  rampUpMonths: number
  /** Months post ramp-up - gets attainment% */
  postRampUpMonths: number
}

/**
 * Commission type constant for Customer Success Manager
 */
export const CSM_COMMISSION_TYPE = 'Customer Success Manager (OTE)'

/**
 * Check if a commission type is CSM (Customer Success Manager)
 */
export function isCSMCommissionType(
  commissionType: string | null | undefined,
): boolean {
  return commissionType === CSM_COMMISSION_TYPE
}

/**
 * Calculate the attainment percentage based on commission type
 *
 * For CSM (Customer Success Manager): (attainment - 1) / (quota - 1)
 * For all other types: attainment / quota
 */
export function calculateAttainmentPercentage(
  attainment: number,
  quota: number,
  commissionType?: string | null,
): number {
  if (isCSMCommissionType(commissionType)) {
    // CSM uses percentage-based quota/attainment
    // Formula: (attainment - 1) / (quota - 1)
    const denominator = quota - 1
    if (denominator === 0) return 0
    return ((attainment - 1) / denominator) * 100
  }
  // Standard calculation: attainment / quota
  if (quota === 0) return 0
  return (attainment / quota) * 100
}

/**
 * Format quota or attainment value based on commission type
 * For CSM: returns percentage string (value is expected to be like 0.95 for 95%)
 * For others: returns currency-formatted string
 */
export function formatQuotaOrAttainment(
  value: number,
  commissionType: string | null | undefined,
  currency: string = 'USD',
): string {
  if (isCSMCommissionType(commissionType)) {
    return `${(value * 100).toFixed(1)}%`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value)
}

/**
 * Calculate quarterly commission bonus with pro-rated ramp-up
 *
 * Rules:
 * - First 3 months commission is paid at 100% fixed OTE
 * - If you start before the 15th of a month, you get 100% for that month and two subsequent months
 * - If you start on/after the 15th, ramp-up starts from the next month (3 full months)
 *
 * For CSM (Customer Success Manager):
 * - Attainment percentage is calculated as (attainment - 1) / (quota - 1)
 * - This is because CSM quota/attainment are expressed as percentages (e.g., 1.0 = 100%)
 */
export function calculateCommissionBonus(
  attainment: number,
  quota: number,
  bonusAmount: number,
  breakdown: QuarterBreakdown,
  commissionType?: string | null,
): number {
  if (quota <= 0) {
    throw new Error('Quota must be greater than 0')
  }
  if (attainment < 0) {
    throw new Error('Attainment must be greater than or equal to 0')
  }

  let attainmentPercentage: number
  if (isCSMCommissionType(commissionType)) {
    // CSM: (attainment - 1) / (quota - 1)
    const denominator = quota - 1
    attainmentPercentage =
      denominator === 0 ? 0 : (attainment - 1) / denominator
  } else {
    // Standard: attainment / quota
    attainmentPercentage = attainment / quota
  }

  // Pro-rated calculation (by months, each quarter has 3 months):
  // - Not employed months get nothing
  // - Ramp-up months get 100% OTE (1/3 of bonus per month)
  // - Post ramp-up months get actual attainment percentage
  const rampUpPortion = (breakdown.rampUpMonths / 3) * bonusAmount
  const postRampUpPortion =
    (breakdown.postRampUpMonths / 3) * attainmentPercentage * bonusAmount

  return rampUpPortion + postRampUpPortion
}

/**
 * Get the effective start date based on the 15th rule
 *
 * Rules:
 * - If start date is before the 15th → effective start is the 1st of that month
 * - If start date is on/after the 15th → effective start is the 1st of the next month
 *
 * @returns Date representing the effective start (always the 1st of a month)
 */
export function getEffectiveStartDate(startDate: Date): Date {
  const day = startDate.getDate()
  const month = startDate.getMonth()
  const year = startDate.getFullYear()

  if (day < 15) {
    // Started before 15th - effective start is 1st of the month
    return new Date(year, month, 1)
  } else {
    // Started on/after 15th - effective start is 1st of the next month
    return new Date(year, month + 1, 1)
  }
}

/**
 * Get the start date of a quarter
 * @param quarter - Quarter in "YYYY-QN" format
 * @returns Date representing the first day of the quarter
 */
export function getQuarterStartDate(quarter: string): Date {
  const [yearStr, quarterStr] = quarter.split('-Q')
  const year = parseInt(yearStr, 10)
  const q = parseInt(quarterStr, 10)

  // Q1: Jan 1, Q2: Apr 1, Q3: Jul 1, Q4: Oct 1
  const startMonth = (q - 1) * 3
  return new Date(year, startMonth, 1)
}

/**
 * Calculate the breakdown of a quarter into not-employed, ramp-up, and post-ramp-up months
 *
 * Rules:
 * - First 3 months commission is paid at 100% fixed OTE
 * - If you start before the 15th of a month, you get 100% for that month and two subsequent months
 * - If you start on/after the 15th, ramp-up starts from the next month (3 full months)
 *
 * Example: Start Jan 13th (before 15th)
 * - Effective start: Jan 1st
 * - Ramp-up: Jan, Feb, Mar (3 months)
 * - Q1: 3 months ramp-up
 *
 * Example: Start Jan 17th (on/after 15th)
 * - Effective start: Feb 1st
 * - Ramp-up: Feb, Mar, Apr (3 months)
 * - Q1: 1 month not employed (Jan), 2 months ramp-up (Feb, Mar)
 * - Q2: 1 month ramp-up (Apr), 2 months post ramp-up (May, Jun)
 *
 * @param startDate - Employee's start date
 * @param quarter - Quarter in "YYYY-QN" format
 * @returns QuarterBreakdown with month counts for each portion (always whole months)
 */
export function calculateQuarterBreakdown(
  startDate: Date | null | undefined,
  quarter: string,
): QuarterBreakdown {
  // Default: fully post ramp-up (employee has been there a while)
  if (!startDate) {
    return {
      notEmployedMonths: 0,
      rampUpMonths: 0,
      postRampUpMonths: 3,
    }
  }

  const [yearStr, quarterStr] = quarter.split('-Q')
  const quarterYear = parseInt(yearStr, 10)
  const quarterNum = parseInt(quarterStr, 10)

  // Get the effective start date (always 1st of a month)
  const effectiveStart = getEffectiveStartDate(startDate)

  // Calculate ramp-up end date (exactly 3 months from effective start)
  const rampUpEnd = new Date(effectiveStart)
  rampUpEnd.setMonth(rampUpEnd.getMonth() + 3)

  // Get the first month in this quarter (0-indexed)
  const quarterStartMonth = (quarterNum - 1) * 3 // 0, 3, 6, or 9

  let notEmployedMonths = 0
  let rampUpMonths = 0
  let postRampUpMonths = 0

  // Process each month in the quarter
  for (let i = 0; i < 3; i++) {
    const month = quarterStartMonth + i

    // Create month boundaries for comparison (year * 12 + month gives unique index)
    const monthIndex = quarterYear * 12 + month
    const effectiveStartIndex =
      effectiveStart.getFullYear() * 12 + effectiveStart.getMonth()
    const rampUpEndIndex = rampUpEnd.getFullYear() * 12 + rampUpEnd.getMonth()

    if (monthIndex < effectiveStartIndex) {
      // Month is before employment started
      notEmployedMonths += 1
    } else if (monthIndex < rampUpEndIndex) {
      // Month is during ramp-up period
      rampUpMonths += 1
    } else {
      // Month is after ramp-up ended
      postRampUpMonths += 1
    }
  }

  return {
    notEmployedMonths,
    rampUpMonths,
    postRampUpMonths,
  }
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
 * Get the next quarter from a given quarter in "YYYY-QN" format
 * @param quarter - Quarter in "YYYY-QN" format
 * @returns Next quarter in "YYYY-QN" format
 */
export function getNextQuarter(quarter: string): string {
  const [yearStr, quarterStr] = quarter.split('-Q')
  const year = parseInt(yearStr, 10)
  const q = parseInt(quarterStr, 10)

  if (q === 4) {
    return `${year + 1}-Q1`
  } else {
    return `${year}-Q${q + 1}`
  }
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

/**
 * Get the previous quarter from a given quarter in "YYYY-QN" format
 * @param quarter - Quarter in "YYYY-QN" format
 * @returns Previous quarter in "YYYY-QN" format
 */
export function getPreviousQuarterFrom(quarter: string): string {
  const [yearStr, quarterStr] = quarter.split('-Q')
  const year = parseInt(yearStr, 10)
  const q = parseInt(quarterStr, 10)

  if (q === 1) {
    return `${year - 1}-Q4`
  } else {
    return `${year}-Q${q - 1}`
  }
}

/**
 * Get the previous N quarters from a given quarter (not including the given quarter)
 * @param quarter - Quarter in "YYYY-QN" format
 * @param count - Number of previous quarters to return
 * @returns Array of quarters in "YYYY-QN" format, most recent first
 */
export function getPreviousNQuarters(quarter: string, count: number): string[] {
  const quarters: string[] = []
  let currentQuarter = quarter

  for (let i = 0; i < count; i++) {
    currentQuarter = getPreviousQuarterFrom(currentQuarter)
    quarters.push(currentQuarter)
  }

  return quarters
}
