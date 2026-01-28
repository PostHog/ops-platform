import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { admin } from 'better-auth/plugins'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import prisma from '@/db'

const ALLOWED_EMAIL_DOMAIN = '@posthog.com'

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      prompt: 'select_account',
    },
  },
  plugins: [admin(), tanstackStartCookies()],
  user: {
    // Validate email domain before creating user account
    additionalFields: {},
  },
  account: {
    accountLinking: {
      enabled: true,
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Reject non-posthog.com emails before creating user in database
          if (!user.email?.endsWith(ALLOWED_EMAIL_DOMAIN)) {
            console.warn(
              `Rejected login attempt from non-posthog email: ${user.email}`,
            )
            throw new APIError('FORBIDDEN', {
              message: 'only-posthog-emails-allowed',
            })
          }
          return { data: user }
        },
      },
    },
  },
})
