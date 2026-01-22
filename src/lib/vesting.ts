import type { CartaOptionGrant } from '@prisma/client'

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
  const monthsElapsed = Math.floor(
    (now.getTime() - vestingStart.getTime()) / (1000 * 60 * 60 * 24 * 30.44),
  )

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

