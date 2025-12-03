import type { KeeperTestFeedback } from '@prisma/client'
import {
  TrendingUp,
  TrendingDown,
  Zap,
  Clock,
  Sun,
  CloudRain,
  X,
  CheckCircle,
} from 'lucide-react'

interface FeedbackCardProps {
  feedback: KeeperTestFeedback & {
    manager: {
      email: string
      deelEmployee?: {
        name: string
      } | null
    }
  }
  lastTableItem?: boolean
}

interface TraitBadgeProps {
  icon: React.ReactNode
  label: string
  isPositive: boolean
}

function TraitBadge({ icon, label, isPositive }: TraitBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-xs font-medium ring-1 ring-inset ${
        isPositive
          ? 'bg-green-50 text-green-700 ring-green-600/20'
          : 'bg-red-50 text-red-700 ring-red-600/20'
      }`}
    >
      {icon}
      <span className="lowercase">{label}</span>
    </span>
  )
}

export function FeedbackCard({
  feedback,
  lastTableItem = false,
}: FeedbackCardProps) {
  return (
    <div
      className={`border border-t-0 border-gray-200${lastTableItem ? 'rounded-b-md' : ''}`}
    >
      <div className="ml-8 flex flex-col gap-3 border-l-[3px] border-gray-200 px-4 py-2">
        <div>
          <h4
            className={`flex items-center gap-1.5 text-sm font-semibold ${
              feedback.wouldYouTryToKeepThem ? 'text-green-700' : 'text-red-700'
            }`}
          >
            {feedback.wouldYouTryToKeepThem ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
            {feedback.wouldYouTryToKeepThem
              ? 'I would fight to keep'
              : 'I would not fight to keep'}
            <span className="font-normal text-gray-500">
              {' '}
              - submitted by{' '}
              {feedback.manager.deelEmployee?.name || feedback.manager.email}
            </span>
          </h4>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <TraitBadge
            icon={
              feedback.driverOrPassenger === 'DRIVER' ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )
            }
            label={
              feedback.driverOrPassenger === 'DRIVER' ? 'Driver' : 'Passenger'
            }
            isPositive={feedback.driverOrPassenger === 'DRIVER'}
          />
          <TraitBadge
            icon={
              feedback.proactiveToday ? (
                <Zap className="h-3 w-3" />
              ) : (
                <Clock className="h-3 w-3" />
              )
            }
            label={feedback.proactiveToday ? 'Proactive' : 'Reactive'}
            isPositive={feedback.proactiveToday}
          />
          <TraitBadge
            icon={
              feedback.optimisticByDefault ? (
                <Sun className="h-3 w-3" />
              ) : (
                <CloudRain className="h-3 w-3" />
              )
            }
            label={
              feedback.optimisticByDefault ? 'Optimistic' : 'Not Optimistic'
            }
            isPositive={feedback.optimisticByDefault}
          />
        </div>
        {feedback.whatMakesThemValuable && (
          <div className="max-w-4xl">
            <p className="mb-1 text-sm font-bold text-gray-700">
              What makes them so valuable to your team and PostHog?
            </p>
            <p className="text-sm text-gray-500 italic">
              {feedback.whatMakesThemValuable}
            </p>
          </div>
        )}
        <div className="max-w-4xl">
          <p className="mb-1 text-sm font-bold text-gray-700">
            Areas to watch:
          </p>
          <p className="text-sm text-gray-500 italic">
            {feedback.areasToWatch}
          </p>
        </div>
        {feedback.recommendation && (
          <div>
            <p className="mb-1 text-sm font-bold text-gray-700">
              Recommendation:
            </p>
            <p className="text-sm text-gray-500 italic">
              {feedback.recommendation}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
