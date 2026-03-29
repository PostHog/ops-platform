import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { render, screen } from '../helpers/render'

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="tooltip">{children}</span>
  ),
}))

vi.mock('lucide-react', () => ({
  Receipt: () => <svg data-testid="receipt-icon" />,
}))

import { CommissionBonusTimelineCard } from '@/components/CommissionBonusTimelineCard'

function makeBonus(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bonus-1',
    attainment: 80000,
    quota: 100000,
    commissionType: 'AE',
    bonusAmount: 5000,
    exchangeRate: 1.0,
    localCurrency: 'USD',
    calculatedAmount: 4000,
    calculatedAmountLocal: null as number | null,
    amountHeld: 0,
    quarter: '2025-Q1',
    ...overrides,
  }
}

describe('CommissionBonusTimelineCard', () => {
  it('renders attainment percentage', () => {
    render(<CommissionBonusTimelineCard bonus={makeBonus() as any} />)
    // 80000 / 100000 * 100 = 80.0%
    expect(screen.getByText('80.0% attainment')).toBeTruthy()
  })

  it('renders quarter in label', () => {
    render(<CommissionBonusTimelineCard bonus={makeBonus() as any} />)
    expect(screen.getByText('Commission Bonus (2025-Q1)')).toBeTruthy()
  })

  it('renders receipt icon', () => {
    render(<CommissionBonusTimelineCard bonus={makeBonus() as any} />)
    expect(screen.getByTestId('receipt-icon')).toBeTruthy()
  })

  it('renders USD amount when calculatedAmountLocal is null', () => {
    render(<CommissionBonusTimelineCard bonus={makeBonus() as any} />)
    // calculatedAmount (4000) - amountHeld (0) = $4,000.00
    expect(screen.getByText('$4,000.00')).toBeTruthy()
  })

  it('renders local currency amount when calculatedAmountLocal is set', () => {
    render(
      <CommissionBonusTimelineCard
        bonus={
          makeBonus({
            calculatedAmountLocal: 3500,
            localCurrency: 'EUR',
            exchangeRate: 0.9,
            amountHeld: 0,
          }) as any
        }
      />,
    )
    // (3500 - 0 * 0.9) in EUR
    expect(screen.getByText(/3,500\.00/)).toBeTruthy()
  })

  it('applies rounded-b-md when lastTableItem is true', () => {
    const { container } = render(
      <CommissionBonusTimelineCard
        bonus={makeBonus() as any}
        lastTableItem={true}
      />,
    )
    const outerDiv = container.firstChild as HTMLElement
    expect(outerDiv.className).toContain('rounded-b-md')
  })

  it('handles CSM commission type attainment calculation', () => {
    // CSM formula: (attainment - 1) / (quota - 1) * 100
    // (1.1 - 1) / (1.2 - 1) * 100 = 0.1 / 0.2 * 100 = 50.0%
    render(
      <CommissionBonusTimelineCard
        bonus={
          makeBonus({
            attainment: 1.1,
            quota: 1.2,
            commissionType: 'Customer Success Manager (OTE)',
          }) as any
        }
      />,
    )
    expect(screen.getByText('50.0% attainment')).toBeTruthy()
  })
})
