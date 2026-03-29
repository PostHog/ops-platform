import { describe, expect, it, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '../helpers/render'
import { atom } from 'jotai'

const mockNavigate = vi.fn()
const mockInvalidate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, ...props }: any) => (
    <a href={to} {...props}>{children}</a>
  ),
  useRouter: vi.fn(() => ({
    navigate: mockNavigate,
    invalidate: mockInvalidate,
  })),
}))

// Mock atoms to avoid atomWithStorage localStorage issues in jsdom
vi.mock('@/atoms', () => {
  const { atom } = require('jotai')
  return {
    hideSensitiveDataAtom: atom(false),
    defaultHideSensitiveDataAtom: atom(false),
    chatSidebarOpenAtom: atom(false),
  }
})

const mockSignOut = vi.fn()
const mockStopImpersonating = vi.fn()
const mockUseSession = vi.fn()

vi.mock('@/lib/auth-client', () => ({
  signOut: (...args: any[]) => mockSignOut(...args),
  useSession: () => mockUseSession(),
  stopImpersonating: (...args: any[]) => mockStopImpersonating(...args),
}))

vi.mock('@/lib/auth-middleware', () => ({
  createInternalFn: () => ({ handler: () => vi.fn() }),
}))

vi.mock('@/db', () => ({ default: {} }))

vi.mock('vercel-toast', () => ({
  createToast: vi.fn(),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <>{children}</>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick, onSelect, asChild, ...props }: any) => (
    <div data-testid="dropdown-item" onClick={onClick || onSelect} {...props}>{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: any) => <>{children}</>,
}))

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      data-testid="switch"
      checked={checked}
      onChange={(e: any) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  ),
}))

vi.mock('lucide-react', () => ({
  ChevronDownIcon: () => <svg data-testid="chevron-down" />,
  MessageSquare: () => <svg data-testid="message-square" />,
  Settings: () => <svg data-testid="settings" />,
}))

import Header from '@/components/Header'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Header', () => {
  it('returns null when user is not logged in', () => {
    mockUseSession.mockReturnValue({ data: null })
    const { container } = render(<Header />)
    expect(container.innerHTML).toBe('')
  })

  it('renders user name when session exists', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { name: 'Alice', role: 'user' },
        session: {},
      },
    })
    render(<Header />)
    expect(screen.getByText(/Alice/)).toBeTruthy()
  })

  it('shows admin nav items for admin role', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { name: 'Admin', role: 'admin' },
        session: {},
      },
    })
    render(<Header />)
    expect(screen.getByText('Pay Reviews')).toBeTruthy()
    expect(screen.getByText('Onboarding')).toBeTruthy()
    expect(screen.getByText('Operations')).toBeTruthy()
  })

  it('does not show admin-only nav items for regular user', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { name: 'Regular', role: 'user' },
        session: {},
      },
    })
    render(<Header />)
    expect(screen.queryByText('Pay Reviews')).toBeNull()
    expect(screen.queryByText('Onboarding')).toBeNull()
    expect(screen.queryByText('Operations')).toBeNull()
  })

  it('shows impersonating indicator with orange styling', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { name: 'Target User', role: 'admin' },
        session: { impersonatedBy: 'admin-id' },
      },
    })
    render(<Header />)
    const impersonatingText = screen.getByText(/Impersonating:/)
    expect(impersonatingText.className).toContain('text-orange-600')
    expect(screen.getByText('Stop Impersonating')).toBeTruthy()
  })

  it('calls signOut when Sign out button clicked', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { name: 'Alice', role: 'user' },
        session: {},
      },
    })
    render(<Header />)
    fireEvent.click(screen.getByText('Sign out'))
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('shows Organization dropdown for org-chart role', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { name: 'OrgUser', role: 'org-chart' },
        session: {},
      },
    })
    render(<Header />)
    expect(screen.getByText('Organization')).toBeTruthy()
  })

  it('shows Org chart link for regular user without dropdown', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { name: 'Regular', role: 'user' },
        session: {},
      },
    })
    render(<Header />)
    expect(screen.getByText('Org chart')).toBeTruthy()
    expect(screen.queryByText('Organization')).toBeNull()
  })
})
