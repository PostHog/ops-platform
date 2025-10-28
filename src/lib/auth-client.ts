import { createAuthClient } from 'better-auth/react'
import { adminClient } from 'better-auth/client/plugins'

const authClient = createAuthClient({
  baseURL: process.env.VITE_APP_BETTER_AUTH_URL as string,
  plugins: [adminClient()],
})

export const { signIn, signUp, useSession, signOut, getSession } = authClient
