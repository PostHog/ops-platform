import ReactMarkdown from 'react-markdown'
import type { KeeperTestFeedback } from '@prisma/client'
import { TimelineItemBadge } from './TimelineItemBadge'

interface FeedbackCardProps {
  feedback: KeeperTestFeedback & {
    manager: {
      email: string
      deelEmployee?: {
        name: string
      } | null
    }
  }
}

export function FeedbackCard({ feedback }: FeedbackCardProps) {
  const date = new Date(feedback.timestamp)
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="bg-white max-w-3xl">
      <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
        <div className="flex justify-between items-start mb-2">
          <TimelineItemBadge type="feedback" />
          <p className="text-xs text-gray-500">{formattedDate}</p>
        </div>
        <div className="mb-4">
          <h4 className="text-base font-semibold text-blue-900">
            {feedback.title} feedback from{' '}
            {feedback.manager.deelEmployee?.name ?? feedback.manager.email}
          </h4>
        </div>

        <ReactMarkdown
          components={{
            ul: ({ children }) => (
              <ul className="list-disc list-inside space-y-2">{children}</ul>
            ),
            li: ({ children }) => (
              <li className="text-sm text-gray-700">{children}</li>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-gray-800">
                {children}
              </strong>
            ),
          }}
        >
          {`- **If this team member was leaving for a similar role at another company, would you try to keep them?** ${feedback.wouldYouTryToKeepThem ? 'Yes' : 'No'}\n` +
            `- **What makes them so valuable to your team and PostHog?** ${feedback.whatMakesThemValuable}\n` +
            `- **Are they a driver or a passenger?** ${feedback.driverOrPassenger}\n` +
            `- **Do they get things done proactively, today?** ${feedback.proactiveToday ? 'Yes' : 'No'}\n` +
            `- **Are they optimistic by default?** ${feedback.optimisticByDefault ? 'Yes' : 'No'}\n` +
            `- **Areas to watch:** ${feedback.areasToWatch}\n` +
            (feedback.recommendation
              ? `- **Recommendation**: ${feedback.recommendation}\n`
              : '') +
            `- **Have you shared this feedback with your team member?** ${feedback.sharedWithTeamMember ? 'Yes' : 'No, but I will do right now!'}`}
        </ReactMarkdown>
      </div>
    </div>
  )
}
