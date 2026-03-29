import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { render, screen } from '../helpers/render'

// Mock shadcn primitives
vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, asChild, ...props }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span data-testid="tooltip">{children}</span>,
}))

vi.mock('lucide-react', () => ({
  TrendingUp: () => <svg data-testid="trending-up" />,
  TrendingDown: () => <svg data-testid="trending-down" />,
  Zap: () => <svg data-testid="zap" />,
  Clock: () => <svg data-testid="clock" />,
  Sun: () => <svg data-testid="sun" />,
  CloudRain: () => <svg data-testid="cloud-rain" />,
  X: () => <svg data-testid="x-icon" />,
  CheckCircle: () => <svg data-testid="check-circle" />,
}))

import { FeedbackCard } from '@/components/FeedbackCard'

function makeFeedback(overrides: Record<string, unknown> = {}) {
  return {
    id: 'fb-1',
    title: 'Peer feedback',
    wouldYouTryToKeepThem: 'STRONG_YES' as const,
    driverOrPassenger: 'YES' as const,
    proactiveToday: 'STRONG_YES' as const,
    optimisticByDefault: 'NO' as const,
    whatMakesThemValuable: 'Great teammate',
    areasToWatch: 'Could improve on X',
    recommendation: 'Promote',
    manager: {
      email: 'mgr@example.com',
      deelEmployee: {
        firstName: 'Jane',
        lastName: 'Doe',
      },
    },
    ...overrides,
  }
}

describe('FeedbackCard', () => {
  it('renders the manager name from deelEmployee', () => {
    render(<FeedbackCard feedback={makeFeedback() as any} />)
    expect(screen.getByText(/Jane Doe/)).toBeTruthy()
  })

  it('falls back to email when deelEmployee is null', () => {
    render(
      <FeedbackCard
        feedback={makeFeedback({ manager: { email: 'mgr@example.com', deelEmployee: null } }) as any}
      />,
    )
    expect(screen.getByText(/mgr@example.com/)).toBeTruthy()
  })

  it('renders positive keeper text for STRONG_YES rating', () => {
    render(<FeedbackCard feedback={makeFeedback() as any} />)
    expect(screen.getByText('I would fight to keep')).toBeTruthy()
  })

  it('renders negative keeper text for NO rating', () => {
    render(
      <FeedbackCard
        feedback={makeFeedback({ wouldYouTryToKeepThem: 'NO' }) as any}
      />,
    )
    expect(screen.getByText('I would not fight to keep')).toBeTruthy()
  })

  it('renders CheckCircle icon for positive rating', () => {
    render(<FeedbackCard feedback={makeFeedback() as any} />)
    expect(screen.getByTestId('check-circle')).toBeTruthy()
  })

  it('renders X icon for negative rating', () => {
    render(
      <FeedbackCard
        feedback={makeFeedback({ wouldYouTryToKeepThem: 'STRONG_NO' }) as any}
      />,
    )
    expect(screen.getByTestId('x-icon')).toBeTruthy()
  })

  it('renders Manager Feedback title and different fields for manager feedback', () => {
    render(
      <FeedbackCard
        feedback={makeFeedback({ title: 'Manager feedback' }) as any}
      />,
    )
    expect(screen.getByText('Manager Feedback')).toBeTruthy()
    expect(screen.getByText('Why have you given this answer?')).toBeTruthy()
    // Trait badges should NOT appear for manager feedback
    expect(screen.queryByTestId('trending-up')).toBeNull()
  })

  it('renders trait badges and optional fields for non-manager feedback', () => {
    render(<FeedbackCard feedback={makeFeedback() as any} />)
    expect(screen.getByText('What makes them so valuable to your team and PostHog?')).toBeTruthy()
    expect(screen.getByText('Areas to watch:')).toBeTruthy()
    expect(screen.getByText('Recommendation:')).toBeTruthy()
  })

  it('does not render OptionalField when value is null', () => {
    render(
      <FeedbackCard
        feedback={makeFeedback({ recommendation: null }) as any}
      />,
    )
    expect(screen.queryByText('Recommendation:')).toBeNull()
  })
})
