import { createAuthClient } from "better-auth/react"

const authClient = createAuthClient({
    baseURL: process.env.VITE_APP_BETTER_AUTH_URL as string,
})

export const { signIn, signUp, useSession, signOut, getSession } = authClient