import { describe, expect, it, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '../helpers/render'

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}))

const mockSignIn = {
  email: vi.fn(),
}
const mockSignUp = {
  email: vi.fn(),
}

vi.mock('@/lib/auth-client', () => ({
  signIn: { email: (...args: any[]) => mockSignIn.email(...args) },
  signUp: { email: (...args: any[]) => mockSignUp.email(...args) },
}))

import { DevLoginForm } from '@/components/DevLoginForm'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DevLoginForm', () => {
  it('renders the dev login button', () => {
    render(<DevLoginForm />)
    expect(screen.getByText('Dev Login (dev@posthog.com)')).toBeTruthy()
  })

  it('calls signIn.email on click', async () => {
    mockSignIn.email.mockResolvedValue({})
    render(<DevLoginForm />)
    fireEvent.click(screen.getByText('Dev Login (dev@posthog.com)'))
    await waitFor(() => {
      expect(mockSignIn.email).toHaveBeenCalledWith({
        email: 'dev@posthog.com',
        password: 'devpassword123',
      })
    })
  })

  it('displays error message when login fails', async () => {
    mockSignIn.email.mockResolvedValue({
      error: { message: 'Something went wrong' },
    })
    render(<DevLoginForm />)
    fireEvent.click(screen.getByText('Dev Login (dev@posthog.com)'))
    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeTruthy()
    })
  })

  it('attempts signup when user not found', async () => {
    mockSignIn.email.mockResolvedValue({
      error: { message: 'User not found' },
    })
    mockSignUp.email.mockResolvedValue({})
    render(<DevLoginForm />)
    fireEvent.click(screen.getByText('Dev Login (dev@posthog.com)'))
    await waitFor(() => {
      expect(mockSignUp.email).toHaveBeenCalledWith({
        email: 'dev@posthog.com',
        password: 'devpassword123',
        name: 'Dev User',
      })
    })
  })

  it('shows error when signup also fails', async () => {
    mockSignIn.email.mockResolvedValue({
      error: { message: 'User not found' },
    })
    mockSignUp.email.mockResolvedValue({
      error: { message: 'Failed to create account' },
    })
    render(<DevLoginForm />)
    fireEvent.click(screen.getByText('Dev Login (dev@posthog.com)'))
    await waitFor(() => {
      expect(screen.getByText('Failed to create account')).toBeTruthy()
    })
  })
})
