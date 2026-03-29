import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { render, screen } from '../helpers/render'

// Mock shadcn primitives
vi.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    className,
  }: {
    children: React.ReactNode
    className?: string
  }) => (
    <span data-testid="badge" className={className}>
      {children}
    </span>
  ),
}))

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

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...props
  }: {
    children: React.ReactNode
    to: string
    [key: string]: unknown
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('lucide-react', () => ({
  Check: () => <svg data-testid="check-icon" />,
  AlertCircle: () => <svg data-testid="alert-icon" />,
}))

import { PriorityBadge } from '@/components/PriorityBadge'
import { TimelineItemBadge } from '@/components/TimelineItemBadge'
import { StatusCell } from '@/components/StatusCell'
import { LevelStepDisplay } from '@/components/LevelStepDisplay'
import { ReviewerAvatar } from '@/components/ReviewerAvatar'
import { EmployeeNameCell } from '@/components/EmployeeNameCell'
import { SalaryWithMismatchIndicator } from '@/components/SalaryWithMismatchIndicator'

// ─── PriorityBadge ──────────────────────────────────────────────────────────

describe('PriorityBadge', () => {
  it('renders the priority text', () => {
    render(<PriorityBadge priority="high" />)
    expect(screen.getByText('high')).toBeDefined()
  })

  it('applies red classes for high priority', () => {
    render(<PriorityBadge priority="high" />)
    expect(screen.getByTestId('badge').className).toContain('red')
  })

  it('applies yellow classes for medium priority', () => {
    render(<PriorityBadge priority="medium" />)
    expect(screen.getByTestId('badge').className).toContain('yellow')
  })

  it('applies green classes for filled priority', () => {
    render(<PriorityBadge priority="filled" />)
    expect(screen.getByTestId('badge').className).toContain('green')
  })

  it('applies blue classes for pushed_to_next_quarter', () => {
    render(<PriorityBadge priority="pushed_to_next_quarter" />)
    expect(screen.getByTestId('badge').className).toContain('blue')
  })
})

// ─── TimelineItemBadge ──────────────────────────────────────────────────────

describe('TimelineItemBadge', () => {
  it('renders "salary update" for salary type', () => {
    render(<TimelineItemBadge type="salary" />)
    expect(screen.getByText('salary update')).toBeDefined()
  })

  it('renders "new salary" for new salary type', () => {
    render(<TimelineItemBadge type="new salary" />)
    expect(screen.getByText('new salary')).toBeDefined()
  })

  it('renders "commission bonus" for commission type', () => {
    render(<TimelineItemBadge type="commission" />)
    expect(screen.getByText('commission bonus')).toBeDefined()
  })

  it('renders "keeper test" for feedback type', () => {
    render(<TimelineItemBadge type="feedback" />)
    expect(screen.getByText('keeper test')).toBeDefined()
  })
})

// ─── StatusCell ─────────────────────────────────────────────────────────────

describe('StatusCell', () => {
  it('shows "reviewed" with check icon when reviewed', () => {
    render(<StatusCell reviewed={true} employeeId="emp-1" />)
    expect(screen.getByText('reviewed')).toBeDefined()
    expect(screen.getByTestId('check-icon')).toBeDefined()
  })

  it('shows "Review now" link when not reviewed', () => {
    render(<StatusCell reviewed={false} employeeId="emp-1" />)
    expect(screen.getByText('Review now →')).toBeDefined()
  })

  it('links to correct employee page', () => {
    render(<StatusCell reviewed={false} employeeId="emp-123" />)
    const link = screen.getByText('Review now →')
    expect(link.getAttribute('href')).toContain('emp')
  })
})

// ─── LevelStepDisplay ───────────────────────────────────────────────────────

describe('LevelStepDisplay', () => {
  it('renders level and step values', () => {
    render(<LevelStepDisplay level={3} step={1.05} />)
    expect(screen.getByText('3')).toBeDefined()
    expect(screen.getByText('1.05')).toBeDefined()
  })

  it('renders level 1 as "1.0"', () => {
    render(<LevelStepDisplay level={1} step={1} />)
    expect(screen.getByText('1.0')).toBeDefined()
  })

  it('renders "level" and "step" labels', () => {
    render(<LevelStepDisplay level={2} step={1} />)
    expect(screen.getByText('level')).toBeDefined()
    expect(screen.getByText('step')).toBeDefined()
  })

  it('uses large text by default', () => {
    const { container } = render(<LevelStepDisplay level={2} step={1} />)
    expect(container.innerHTML).toContain('text-xl')
  })

  it('uses small text with size="sm"', () => {
    const { container } = render(
      <LevelStepDisplay level={2} step={1} size="sm" />,
    )
    expect(container.innerHTML).toContain('text-base')
  })
})

// ─── ReviewerAvatar ─────────────────────────────────────────────────────────

describe('ReviewerAvatar', () => {
  it('renders the name', () => {
    render(<ReviewerAvatar name="Alice Smith" />)
    expect(screen.getByText('Alice Smith')).toBeDefined()
  })

  it('shows initials from first and last name', () => {
    render(<ReviewerAvatar name="Alice Smith" />)
    expect(screen.getByText('AS')).toBeDefined()
  })

  it('shows first two letters for single name', () => {
    render(<ReviewerAvatar name="Alice" />)
    expect(screen.getByText('AL')).toBeDefined()
  })

  it('produces consistent color for same name', () => {
    const { container: c1 } = render(<ReviewerAvatar name="Alice Smith" />)
    const { container: c2 } = render(<ReviewerAvatar name="Alice Smith" />)
    // Both should produce the same class names
    const avatar1 = c1.querySelector('.rounded-full')
    const avatar2 = c2.querySelector('.rounded-full')
    expect(avatar1?.className).toBe(avatar2?.className)
  })
})

// ─── EmployeeNameCell ───────────────────────────────────────────────────────

describe('EmployeeNameCell', () => {
  it('renders the employee name', () => {
    render(<EmployeeNameCell name="Alice Smith" />)
    expect(screen.getByText('Alice Smith')).toBeDefined()
  })

  it('renders notes when provided', () => {
    render(<EmployeeNameCell name="Alice" notes="Great performer" />)
    expect(screen.getByText('Great performer')).toBeDefined()
  })

  it('does not render notes section when notes is null', () => {
    const { container } = render(<EmployeeNameCell name="Alice" notes={null} />)
    expect(container.querySelector('.border-l-2')).toBeNull()
  })
})

// ─── SalaryWithMismatchIndicator ────────────────────────────────────────────

describe('SalaryWithMismatchIndicator', () => {
  it('renders formatted salary', () => {
    render(<SalaryWithMismatchIndicator totalSalary={150000} />)
    expect(screen.getByText('$150,000.00')).toBeDefined()
  })

  it('shows mismatch icon when expected differs from actual', () => {
    render(
      <SalaryWithMismatchIndicator
        totalSalary={150000}
        benchmarkFactor={100000}
        locationFactor={1}
        level={1}
        step={1}
      />,
    )
    // 100000 * 1 * 1 * 1 = 100000 ≠ 150000 → mismatch
    expect(screen.getByTestId('alert-icon')).toBeDefined()
  })

  it('does not show mismatch when values match', () => {
    render(
      <SalaryWithMismatchIndicator
        totalSalary={100000}
        benchmarkFactor={100000}
        locationFactor={1}
        level={1}
        step={1}
      />,
    )
    expect(screen.queryByTestId('alert-icon')).toBeNull()
  })

  it('does not show mismatch when factors are missing', () => {
    render(<SalaryWithMismatchIndicator totalSalary={150000} />)
    expect(screen.queryByTestId('alert-icon')).toBeNull()
  })
})
