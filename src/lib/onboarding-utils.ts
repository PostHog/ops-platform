import type { OnboardingStatus } from '@prisma/client'

export type Phase = { label: string; badgeClass: string; sortOrder: number }

export function getPhase(startDate: Date): Phase {
  const now = new Date()
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const s = new Date(startDate)
  const startUTC = Date.UTC(s.getFullYear(), s.getMonth(), s.getDate())
  const diff = Math.round((startUTC - todayUTC) / 86400000)

  if (diff > 0)
    return {
      label: 'Pre-start',
      badgeClass: 'bg-[#006FDC]/15 text-[#006FDC] font-semibold',
      sortOrder: 0,
    }
  if (diff === 0)
    return {
      label: 'First Day',
      badgeClass: 'bg-[#FF4E00]/15 text-[#FF4E00] font-semibold',
      sortOrder: 1,
    }
  if (diff >= -7)
    return {
      label: 'First Week',
      badgeClass: 'bg-[#F99B00]/15 text-[#F99B00] font-semibold',
      sortOrder: 2,
    }
  if (diff >= -30)
    return {
      label: 'First 30 Days',
      badgeClass: 'bg-yellow-100 text-yellow-800',
      sortOrder: 3,
    }
  if (diff >= -60)
    return {
      label: 'First 60 Days',
      badgeClass: 'bg-orange-100 text-orange-800',
      sortOrder: 4,
    }
  return {
    label: 'First 90 Days',
    badgeClass: 'bg-purple-100 text-purple-800',
    sortOrder: 5,
  }
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export const STATUS_CONFIG: Record<
  OnboardingStatus,
  { label: string; badgeClass: string }
> = {
  offer_accepted: {
    label: 'Offer accepted',
    badgeClass: 'bg-blue-100 text-blue-800',
  },
  contract_sent: {
    label: 'Contract sent',
    badgeClass: 'bg-yellow-100 text-yellow-800',
  },
  contract_signed: {
    label: 'Contract signed',
    badgeClass: 'bg-orange-100 text-orange-800',
  },
  provisioned: {
    label: 'Provisioned',
    badgeClass: 'bg-purple-100 text-purple-800',
  },
  started: { label: 'Started', badgeClass: 'bg-green-100 text-green-800' },
}

export const STATUS_OPTIONS: OnboardingStatus[] = [
  'offer_accepted',
  'contract_sent',
  'contract_signed',
  'provisioned',
  'started',
]
