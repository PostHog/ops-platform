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
 * Calculate quarterly commission bonus with pro-rated ramp-up
 *
 * Rules:
 * - First 3 months commission is paid at 100% fixed
 * - If you start before the 15th of a month, you get 100% for the full month
 * - If you start on/after the 15th, you get 100% for half the month (from 15th onward)
 * - Ramp-up is exactly 3 months from the effective start date
 */
export function calculateCommissionBonus(
  attainment: number,
  quota: number,
  bonusAmount: number,
  breakdown: QuarterBreakdown,
): number {
  if (quota <= 0) {
    throw new Error('Quota must be greater than 0')
  }
  if (attainment < 0) {
    throw new Error('Attainment must be greater than or equal to 0')
  }

  const attainmentPercentage = attainment / quota

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
 * - If start date is on/after the 15th → effective start is the 15th of that month
 *
 * @returns Date representing the effective start (either 1st or 15th of the month)
 */
export function getEffectiveStartDate(startDate: Date): Date {
  const day = startDate.getDate()
  const month = startDate.getMonth()
  const year = startDate.getFullYear()

  if (day < 15) {
    // Started before 15th - effective start is 1st of the month
    return new Date(year, month, 1)
  } else {
    // Started on/after 15th - effective start is 15th of the month
    return new Date(year, month, 15)
  }
}

/**
 * Get the quarter number (1-4) for a given year and month
 */
export function getQuarterForMonth(month: number): number {
  return Math.floor(month / 3) + 1
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
 * Get the end date of a quarter (last day of the quarter)
 * @param quarter - Quarter in "YYYY-QN" format
 * @returns Date representing the last day of the quarter
 */
export function getQuarterEndDate(quarter: string): Date {
  const [yearStr, quarterStr] = quarter.split('-Q')
  const year = parseInt(yearStr, 10)
  const q = parseInt(quarterStr, 10)

  // Q1: Mar 31, Q2: Jun 30, Q3: Sep 30, Q4: Dec 31
  const endMonth = q * 3 // Month after the quarter ends (0-indexed)
  // Setting day to 0 gives us the last day of the previous month
  return new Date(year, endMonth, 0)
}

/**
 * Calculate the breakdown of a quarter into not-employed, ramp-up, and post-ramp-up months
 *
 * Rules:
 * - First 3 months commission is paid at 100% fixed
 * - If you start before the 15th of a month, you get 100% for the full month
 * - If you start on/after the 15th, you get 100% for half the month (from 15th onward)
 * - Ramp-up is exactly 3 months from the effective start date
 *
 * Example: Start Oct 17th
 * - Effective start: Oct 15th
 * - Ramp-up end: Jan 15th (3 months later)
 * - Q4: Oct 0.5 + Nov 1.0 + Dec 1.0 = 2.5 months ramp-up, 0.5 months not employed
 * - Q1: Jan 0.5 ramp-up + Jan 0.5 post + Feb 1.0 post + Mar 1.0 post
 *
 * @param startDate - Employee's start date
 * @param quarter - Quarter in "YYYY-QN" format
 * @returns QuarterBreakdown with month counts for each portion (can be fractional)
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

  // Get the effective start date (1st or 15th of the month)
  const effectiveStart = getEffectiveStartDate(startDate)
  const startedOn15th = effectiveStart.getDate() === 15

  // Calculate ramp-up end date (exactly 3 months from effective start)
  const rampUpEnd = new Date(effectiveStart)
  rampUpEnd.setMonth(rampUpEnd.getMonth() + 3)
  const rampUpEndsOn15th = rampUpEnd.getDate() === 15

  // Get the first month in this quarter (0-indexed)
  const quarterStartMonth = (quarterNum - 1) * 3 // 0, 3, 6, or 9

  let notEmployedMonths = 0
  let rampUpMonths = 0
  let postRampUpMonths = 0

  // Process each month in the quarter
  for (let i = 0; i < 3; i++) {
    const month = quarterStartMonth + i
    const monthYear = quarterYear

    // Create month boundaries for comparison
    const monthStartIndex = monthYear * 12 + month
    const effectiveStartIndex =
      effectiveStart.getFullYear() * 12 + effectiveStart.getMonth()
    const rampUpEndIndex = rampUpEnd.getFullYear() * 12 + rampUpEnd.getMonth()

    // Is this the month where employment starts?
    const isStartMonth = monthStartIndex === effectiveStartIndex

    // Is this the month where ramp-up ends?
    const isEndMonth = monthStartIndex === rampUpEndIndex

    // Is this month before employment started?
    const isBeforeStart = monthStartIndex < effectiveStartIndex

    // Is this month after ramp-up ended?
    const isAfterRampUp = monthStartIndex > rampUpEndIndex

    // Is this month during ramp-up (not start or end month)?
    const isDuringRampUp =
      monthStartIndex > effectiveStartIndex && monthStartIndex < rampUpEndIndex

    if (isBeforeStart) {
      // Entire month is before employment
      notEmployedMonths += 1
    } else if (isStartMonth && isEndMonth) {
      // Ramp-up both starts and ends in this month (edge case)
      if (startedOn15th && rampUpEndsOn15th) {
        // Started 15th, ends 15th - impossible in same month
        notEmployedMonths += 0.5
        rampUpMonths += 0.5
      } else if (startedOn15th) {
        // Started 15th, ends 1st of this month - also impossible
        notEmployedMonths += 0.5
        rampUpMonths += 0.5
      } else if (rampUpEndsOn15th) {
        // Started 1st, ends 15th
        rampUpMonths += 0.5
        postRampUpMonths += 0.5
      } else {
        // Started 1st, ends 1st - full month is post ramp-up
        postRampUpMonths += 1
      }
    } else if (isStartMonth) {
      // Employment starts in this month
      if (startedOn15th) {
        // First half not employed, second half ramp-up
        notEmployedMonths += 0.5
        rampUpMonths += 0.5
      } else {
        // Full month is ramp-up
        rampUpMonths += 1
      }
    } else if (isEndMonth) {
      // Ramp-up ends in this month
      if (rampUpEndsOn15th) {
        // First half ramp-up, second half post
        rampUpMonths += 0.5
        postRampUpMonths += 0.5
      } else {
        // Ramp-up ends on 1st - full month is post ramp-up
        postRampUpMonths += 1
      }
    } else if (isDuringRampUp) {
      // Full month is ramp-up
      rampUpMonths += 1
    } else if (isAfterRampUp) {
      // Full month is post ramp-up
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
