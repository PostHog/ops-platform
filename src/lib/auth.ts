import { betterAuth } from 'better-auth'
import { admin } from 'better-auth/plugins'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import prisma from '@/db'

/**
 * SECURITY: Email/password auth is ONLY enabled in development.
 *
 * Multiple safeguards ensure this cannot be exploited in production:
 * 1. NODE_ENV must be 'development' (set by build tools, not user-controllable)
 * 2. ALLOW_DEV_AUTH env var must be explicitly set to 'true'
 * 3. Production builds (via `pnpm build`) always set NODE_ENV='production'
 *
 * Even if someone somehow sets ALLOW_DEV_AUTH in production, the NODE_ENV
 * check will prevent email/password auth from being enabled.
 */
const isDevAuthEnabled =
  process.env.NODE_ENV === 'development' &&
  process.env.ALLOW_DEV_AUTH === 'true'

// Only configure Google OAuth if credentials are provided
const socialProviders =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          prompt: 'select_account' as const,
        },
      }
    : {}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: isDevAuthEnabled,
  },
  socialProviders,
  plugins: [admin(), tanstackStartCookies()],
})
