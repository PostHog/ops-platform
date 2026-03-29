import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { render, screen } from '../helpers/render'

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span data-testid="tooltip">{children}</span>,
}))

vi.mock('lucide-react', () => ({
  Award: () => <svg data-testid="award-icon" />,
}))

vi.mock('@/lib/vesting', () => ({
  calculateVestedQuantity: vi.fn(() => 500),
}))

import { OptionGrantTimelineCard } from '@/components/OptionGrantTimelineCard'

function makeGrant(overrides: Record<string, unknown> = {}) {
  return {
    id: 'grant-1',
    issuedQuantity: 1000,
    exercisePrice: 1.5,
    exercisedQuantity: 0,
    expiredQuantity: 0,
    vestingStartDate: new Date('2023-01-01'),
    vestingSchedule: '1/48 monthly, 1 year cliff',
    ...overrides,
  }
}

describe('OptionGrantTimelineCard', () => {
  it('renders issued quantity formatted with commas', () => {
    render(<OptionGrantTimelineCard grant={makeGrant({ issuedQuantity: 10000 }) as any} />)
    expect(screen.getByText('10,000 options')).toBeTruthy()
  })

  it('renders exercise price formatted as currency', () => {
    render(<OptionGrantTimelineCard grant={makeGrant() as any} />)
    expect(screen.getByText(/@ \$1\.50\/share/)).toBeTruthy()
  })

  it('renders Option Grant label', () => {
    render(<OptionGrantTimelineCard grant={makeGrant() as any} />)
    expect(screen.getByText('Option Grant')).toBeTruthy()
  })

  it('renders award icon', () => {
    render(<OptionGrantTimelineCard grant={makeGrant() as any} />)
    expect(screen.getByTestId('award-icon')).toBeTruthy()
  })

  it('applies rounded-b-md when lastTableItem is true', () => {
    const { container } = render(
      <OptionGrantTimelineCard grant={makeGrant() as any} lastTableItem={true} />,
    )
    const outerDiv = container.firstChild as HTMLElement
    expect(outerDiv.className).toContain('rounded-b-md')
  })

  it('does not apply rounded-b-md by default', () => {
    const { container } = render(
      <OptionGrantTimelineCard grant={makeGrant() as any} />,
    )
    const outerDiv = container.firstChild as HTMLElement
    expect(outerDiv.className).not.toContain('rounded-b-md')
  })
})
