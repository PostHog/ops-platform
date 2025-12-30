import type { KeeperTestFeedback, KeeperTestRating } from '@prisma/client'
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
import {
  driverRatingToText,
  proactiveRatingToText,
  optimisticRatingToText,
} from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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

const RATING_STYLES: Record<KeeperTestRating, string> = {
  STRONG_YES: 'bg-green-50 text-green-700 ring-green-600/20',
  YES: 'bg-lime-50 text-lime-700 ring-lime-600/20',
  NO: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  STRONG_NO: 'bg-red-50 text-red-700 ring-red-600/20',
}

const RATING_TEXT_COLORS: Record<KeeperTestRating, string> = {
  STRONG_YES: 'text-green-700',
  YES: 'text-lime-700',
  NO: 'text-amber-700',
  STRONG_NO: 'text-red-700',
}

const isPositiveRating = (rating: KeeperTestRating): boolean =>
  rating === 'YES' || rating === 'STRONG_YES'

interface TraitBadgeProps {
  positiveIcon: React.ReactNode
  negativeIcon: React.ReactNode
  getLabel: (rating: KeeperTestRating) => string
  rating: KeeperTestRating
}

function TraitBadge({
  positiveIcon,
  negativeIcon,
  getLabel,
  rating,
}: TraitBadgeProps) {
  const isPositive = isPositiveRating(rating)
  const icon = isPositive ? positiveIcon : negativeIcon
  const label = getLabel(rating)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-xs font-medium ring-1 ring-inset ${RATING_STYLES[rating]}`}
        >
          {icon}
          <span className="lowercase">{label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{rating}</p>
      </TooltipContent>
    </Tooltip>
  )
}

function OptionalField({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  if (!value) return null

  return (
    <div className="max-w-4xl">
      <p className="mb-1 text-sm font-bold text-gray-700">{label}</p>
      <p className="text-sm text-gray-500 italic">{value}</p>
    </div>
  )
}

export function FeedbackCard({
  feedback,
  lastTableItem = false,
}: FeedbackCardProps) {
  return (
    <TooltipProvider>
      <div
        className={`border border-t-0 border-gray-200${lastTableItem ? 'rounded-b-md' : ''}`}
      >
        <div className="ml-8 flex flex-col gap-3 border-l-[3px] border-gray-200 px-4 py-2">
          <div>
            <h4
              className={`flex items-center gap-1.5 text-sm font-semibold ${RATING_TEXT_COLORS[feedback.wouldYouTryToKeepThem]}`}
            >
              {isPositiveRating(feedback.wouldYouTryToKeepThem) ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <X className="h-4 w-4" />
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    {isPositiveRating(feedback.wouldYouTryToKeepThem)
                      ? 'I would fight to keep'
                      : 'I would not fight to keep'}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{feedback.wouldYouTryToKeepThem}</p>
                </TooltipContent>
              </Tooltip>
              <span className="font-normal text-gray-500">
                {' '}
                - submitted by{' '}
                {feedback.manager.deelEmployee?.name || feedback.manager.email}
              </span>
            </h4>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <TraitBadge
              positiveIcon={<TrendingUp className="h-3 w-3" />}
              negativeIcon={<TrendingDown className="h-3 w-3" />}
              getLabel={driverRatingToText}
              rating={feedback.driverOrPassenger}
            />
            <TraitBadge
              positiveIcon={<Zap className="h-3 w-3" />}
              negativeIcon={<Clock className="h-3 w-3" />}
              getLabel={proactiveRatingToText}
              rating={feedback.proactiveToday}
            />
            <TraitBadge
              positiveIcon={<Sun className="h-3 w-3" />}
              negativeIcon={<CloudRain className="h-3 w-3" />}
              getLabel={optimisticRatingToText}
              rating={feedback.optimisticByDefault}
            />
          </div>
          <OptionalField
            label="What makes them so valuable to your team and PostHog?"
            value={feedback.whatMakesThemValuable}
          />
          <OptionalField
            label="Areas to watch:"
            value={feedback.areasToWatch}
          />
          <OptionalField
            label="Recommendation:"
            value={feedback.recommendation || null}
          />
        </div>
      </div>
    </TooltipProvider>
  )
}
