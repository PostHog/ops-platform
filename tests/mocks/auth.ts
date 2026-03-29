import { vi } from 'vitest'

interface MockUser {
  id: string
  name: string
  email: string
  role: string
}

interface MockSession {
  user: MockUser
  session: {
    id: string
    token: string
    expiresAt: Date
  }
}

export function createMockSession(overrides?: Partial<MockUser>): MockSession {
  return {
    user: {
      id: 'user-1',
      name: 'Test User',
      email: 'test@posthog.com',
      role: 'admin',
      ...overrides,
    },
    session: {
      id: 'session-1',
      token: 'mock-token',
      expiresAt: new Date(Date.now() + 86400000),
    },
  }
}

export const adminSession = createMockSession({
  id: 'admin-1',
  name: 'Admin User',
  email: 'admin@posthog.com',
  role: 'admin',
})

export const orgChartSession = createMockSession({
  id: 'orgchart-1',
  name: 'Org Chart User',
  email: 'orgchart@posthog.com',
  role: 'org-chart',
})

export const internalSession = createMockSession({
  id: 'internal-1',
  name: 'Internal User',
  email: 'internal@posthog.com',
  role: 'user',
})

export const unauthenticatedSession = null

const mockGetSession = vi.fn()

export const mockAuth = {
  api: {
    getSession: mockGetSession,
  },
}

vi.mock('@/lib/auth', () => ({
  auth: mockAuth,
}))

export { mockGetSession }
