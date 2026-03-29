import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '../helpers/render'

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span data-testid="tooltip">{children}</span>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick, ...props }: any) => (
    <button data-testid="dropdown-item" onClick={onClick} {...props}>{children}</button>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('lucide-react', () => ({
  MoreVertical: () => <svg data-testid="more-vertical" />,
  PencilLine: () => <svg data-testid="pencil-line" />,
  Trash2: () => <svg data-testid="trash-icon" />,
}))

import { SalaryHistoryCard } from '@/components/SalaryHistoryCard'

function makeSalary(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sal-1',
    locationFactor: 1.0,
    level: 3,
    step: 2,
    benchmarkFactor: 50000,
    totalSalary: 150000,
    totalSalaryLocal: null as number | null,
    localCurrency: 'USD',
    actualSalary: null as number | null,
    actualSalaryLocal: null as number | null,
    changePercentage: 0.05,
    changeAmount: 7000,
    benchmark: 'Engineering',
    area: 'San Francisco',
    country: 'United States',
    notes: null as string | null,
    timestamp: new Date(),
    ...overrides,
  }
}

describe('SalaryHistoryCard', () => {
  it('renders positive change percentage in green', () => {
    const { container } = render(
      <SalaryHistoryCard salary={makeSalary() as any} isAdmin={false} />,
    )
    const changeSpan = screen.getByText('+5.00%')
    expect(changeSpan.className).toContain('text-green-600')
  })

  it('renders negative change percentage in red', () => {
    render(
      <SalaryHistoryCard
        salary={makeSalary({ changePercentage: -0.03 }) as any}
        isAdmin={false}
      />,
    )
    const changeSpan = screen.getByText('-3.00%')
    expect(changeSpan.className).toContain('text-red-600')
  })

  it('renders benchmark and location info', () => {
    render(
      <SalaryHistoryCard salary={makeSalary() as any} isAdmin={false} />,
    )
    expect(screen.getByText(/Engineering/)).toBeTruthy()
    expect(screen.getByText(/San Francisco/)).toBeTruthy()
    expect(screen.getByText(/United States/)).toBeTruthy()
  })

  it('renders level and step', () => {
    render(
      <SalaryHistoryCard salary={makeSalary() as any} isAdmin={false} />,
    )
    expect(screen.getByText('2')).toBeTruthy() // step
    expect(screen.getByText('level / step')).toBeTruthy()
  })

  it('renders level 1 as "1.0"', () => {
    render(
      <SalaryHistoryCard salary={makeSalary({ level: 1 }) as any} isAdmin={false} />,
    )
    expect(screen.getByText('1.0')).toBeTruthy()
  })

  it('does not render notes when isAdmin is false even if notes exist', () => {
    render(
      <SalaryHistoryCard
        salary={makeSalary({ notes: 'Some note' }) as any}
        isAdmin={false}
      />,
    )
    expect(screen.queryByText('Some note')).toBeNull()
  })

  it('renders notes when isAdmin is true and notes exist', () => {
    render(
      <SalaryHistoryCard
        salary={makeSalary({ notes: 'Admin note here' }) as any}
        isAdmin={true}
      />,
    )
    expect(screen.getByText('Admin note here')).toBeTruthy()
  })

  it('renders delete button when admin, deletable, and onDelete provided', () => {
    const onDelete = vi.fn()
    render(
      <SalaryHistoryCard
        salary={makeSalary({ timestamp: new Date() }) as any}
        isAdmin={true}
        onDelete={onDelete}
      />,
    )
    expect(screen.getByTestId('trash-icon')).toBeTruthy()
  })

  it('does not render delete button when salary is older than 24 hours', () => {
    const oldTimestamp = new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
    const onDelete = vi.fn()
    render(
      <SalaryHistoryCard
        salary={makeSalary({ timestamp: oldTimestamp }) as any}
        isAdmin={true}
        onDelete={onDelete}
      />,
    )
    expect(screen.queryByTestId('trash-icon')).toBeNull()
  })
})
