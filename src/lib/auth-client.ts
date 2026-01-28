import { createAuthClient } from 'better-auth/react'
import { adminClient } from 'better-auth/client/plugins'

const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_APP_BETTER_AUTH_URL as string,
  plugins: [adminClient()],
})

export const { signIn, signUp, useSession, signOut, getSession } = authClient
export const { impersonateUser, stopImpersonating } = authClient.admin

// Check if we're in dev mode (for showing dev login option)
export const isDevMode = import.meta.env.DEV
