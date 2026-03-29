import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '../helpers/render'

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span data-testid="tooltip">{children}</span>,
}))

vi.mock('lucide-react', () => ({
  CheckCircle: () => <svg data-testid="check-circle" />,
  X: () => <svg data-testid="x-icon" />,
}))

import { AshbyInterviewScoreTimelineCard } from '@/components/AshbyInterviewScoreTimelineCard'

function makeScore(overrides: Record<string, unknown> = {}) {
  return {
    id: 'score-1',
    rating: 4,
    interviewName: 'Technical Interview',
    feedback: 'Excellent candidate',
    interviewer: {
      id: 'int-1',
      email: 'interviewer@example.com',
      deelEmployee: {
        firstName: 'John',
        lastName: 'Smith',
      },
    },
    ...overrides,
  }
}

describe('AshbyInterviewScoreTimelineCard', () => {
  it('renders interview name with rating for Strong Yes', () => {
    render(<AshbyInterviewScoreTimelineCard score={makeScore() as any} />)
    expect(screen.getByText('Technical Interview: 4/4 (Strong Yes)')).toBeTruthy()
  })

  it('renders fallback text when interviewName is null', () => {
    render(
      <AshbyInterviewScoreTimelineCard
        score={makeScore({ interviewName: null }) as any}
      />,
    )
    expect(screen.getByText('Interview Score: 4/4 (Strong Yes)')).toBeTruthy()
  })

  it('renders CheckCircle icon for positive rating (3 or 4)', () => {
    render(<AshbyInterviewScoreTimelineCard score={makeScore({ rating: 3 }) as any} />)
    expect(screen.getByTestId('check-circle')).toBeTruthy()
  })

  it('renders X icon for negative rating (1 or 2)', () => {
    render(<AshbyInterviewScoreTimelineCard score={makeScore({ rating: 2 }) as any} />)
    expect(screen.getByTestId('x-icon')).toBeTruthy()
  })

  it('renders interviewer name', () => {
    render(<AshbyInterviewScoreTimelineCard score={makeScore() as any} />)
    expect(screen.getByText(/John Smith/)).toBeTruthy()
  })

  it('renders feedback text when present', () => {
    render(<AshbyInterviewScoreTimelineCard score={makeScore() as any} />)
    expect(screen.getByText('Excellent candidate')).toBeTruthy()
  })

  it('does not render feedback section when feedback is null', () => {
    render(
      <AshbyInterviewScoreTimelineCard
        score={makeScore({ feedback: null }) as any}
      />,
    )
    expect(screen.queryByText('Feedback:')).toBeNull()
  })

  it('applies correct color class for rating 1 (Strong No)', () => {
    const { container } = render(
      <AshbyInterviewScoreTimelineCard score={makeScore({ rating: 1 }) as any} />,
    )
    const heading = container.querySelector('h4')
    expect(heading?.className).toContain('text-red-700')
  })
})
