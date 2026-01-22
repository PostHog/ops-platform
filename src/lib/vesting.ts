import type { CartaOptionGrant } from '@prisma/client'

/**
 * Calculate the number of full calendar months between two dates
 * A month is considered complete on the same day of the month as the start date
 */
function getFullMonthsElapsed(start: Date, end: Date): number {
  const startYear = start.getFullYear()
  const startMonth = start.getMonth()
  const startDay = start.getDate()

  const endYear = end.getFullYear()
  const endMonth = end.getMonth()
  const endDay = end.getDate()

  // Calculate total months difference
  let months = (endYear - startYear) * 12 + (endMonth - startMonth)

  // If we haven't reached the anniversary day this month, subtract 1
  if (endDay < startDay) {
    months -= 1
  }

  return Math.max(0, months)
}

/**
 * Calculate vested quantity at runtime based on vesting schedule
 * Default: 1/48 monthly, 1 year cliff
 * Alternative: 1/48 monthly, no cliff
 */
export function calculateVestedQuantity(grant: CartaOptionGrant): number {
  if (!grant.vestingStartDate) {
    return 0
  }

  const now = new Date()
  const vestingStart = new Date(grant.vestingStartDate)
  const monthsElapsed = getFullMonthsElapsed(vestingStart, now)

  if (monthsElapsed < 0) {
    return 0
  }

  const totalShares = grant.issuedQuantity
  const vestingPeriodMonths = 48
  const hasNoCliff =
    grant.vestingSchedule?.toLowerCase().includes('no cliff') ?? false
  const cliffMonths = hasNoCliff ? 0 : 12

  if (!hasNoCliff && monthsElapsed < cliffMonths) {
    return 0
  }

  // Calculate vested shares
  const monthsVested = Math.min(monthsElapsed, vestingPeriodMonths)
  const vestedShares = Math.floor(
    (totalShares * monthsVested) / vestingPeriodMonths,
  )

  return Math.min(vestedShares, totalShares)
}

