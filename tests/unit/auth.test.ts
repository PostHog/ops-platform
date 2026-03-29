import { describe, expect, it, vi, beforeEach } from 'vitest'

// Must mock dependencies before importing auth
vi.mock('@/db', () => ({ default: {} }))
vi.mock('better-auth', () => ({
  betterAuth: vi.fn((config) => {
    // Capture the databaseHooks for testing
    ;(globalThis as Record<string, unknown>).__betterAuthConfig = config
    return { api: { getSession: vi.fn() } }
  }),
}))
vi.mock('better-auth/api', () => ({
  APIError: class APIError extends Error {
    constructor(
      public status: string,
      public details: { message: string },
    ) {
      super(details.message)
    }
  },
}))
vi.mock('better-auth/plugins', () => ({
  admin: vi.fn(() => ({})),
}))
vi.mock('better-auth/adapters/prisma', () => ({
  prismaAdapter: vi.fn(() => ({})),
}))
vi.mock('better-auth/tanstack-start', () => ({
  tanstackStartCookies: vi.fn(() => ({})),
}))

describe('auth databaseHooks', () => {
  let createBefore: (user: { email: string }) => Promise<{ data: unknown }>

  beforeEach(async () => {
    // Reset module to get fresh config
    vi.resetModules()
    // Set dev env vars before importing
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('ALLOW_DEV_AUTH', 'true')

    await import('@/lib/auth')
    const config = (globalThis as Record<string, unknown>)
      .__betterAuthConfig as {
      databaseHooks: {
        user: { create: { before: typeof createBefore } }
      }
    }
    createBefore = config.databaseHooks.user.create.before
  })

  it('rejects non-posthog emails', async () => {
    await expect(
      createBefore({ email: 'alice@gmail.com' }),
    ).rejects.toThrow()
  })

  it('allows posthog.com emails', async () => {
    const result = await createBefore({ email: 'alice@posthog.com' })
    expect(result.data).toEqual(
      expect.objectContaining({ email: 'alice@posthog.com' }),
    )
  })

  it('gives dev@posthog.com admin role in dev mode', async () => {
    const result = await createBefore({ email: 'dev@posthog.com' })
    expect(result.data).toEqual(
      expect.objectContaining({ role: 'admin' }),
    )
  })

  it('does not give admin role to other posthog emails', async () => {
    const result = await createBefore({ email: 'alice@posthog.com' })
    expect((result.data as Record<string, unknown>).role).toBeUndefined()
  })
})
