import ReactMarkdown from 'react-markdown'
import type { KeeperTestFeedback } from '@prisma/client'

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

export function FeedbackCard({ feedback, lastTableItem = false }: FeedbackCardProps) {
  return (
    <div className={`border border-t-0 border-gray-200 ${lastTableItem ? 'rounded-b-md' : ''}`}>
      <div className="border-l-3 border-blue-300 px-4 py-2 ml-8">
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-blue-900">
            {feedback.title} feedback from{' '}
            {/* TODO: this info on submitter should be stored in the models here itself, as managers change */}
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
