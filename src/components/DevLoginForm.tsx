import { Button } from '@/components/ui/button'
import { signIn, signUp } from '@/lib/auth-client'
import { useState } from 'react'

// Must match the dev user created in scripts/generateDemoData.ts
const DEV_EMAIL = 'dev@posthog.com'
const DEV_PASSWORD = 'devpassword123'
const DEV_NAME = 'Dev User'

/**
 * Development-only login button.
 *
 * SECURITY: This component should ONLY be rendered when import.meta.env.DEV is true.
 * The parent component is responsible for this check. Additionally, the server-side
 * auth configuration only enables email/password auth when NODE_ENV === 'development'.
 */
export function DevLoginForm() {
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleDevLogin = async () => {
    setError('')
    setIsLoading(true)

    try {
      // Try to sign in first
      const loginResult = await signIn.email({
        email: DEV_EMAIL,
        password: DEV_PASSWORD,
      })

      // If user not found, create the auth account (Employee already exists from seed)
      if (loginResult.error) {
        const errorMsg = loginResult.error.message?.toLowerCase() || ''
        const isUserNotFound =
          errorMsg.includes('user') ||
          errorMsg.includes('not found') ||
          errorMsg.includes('invalid')

        if (isUserNotFound) {
          const signUpResult = await signUp.email({
            email: DEV_EMAIL,
            password: DEV_PASSWORD,
            name: DEV_NAME,
          })

          if (signUpResult.error) {
            setError(signUpResult.error.message || 'Failed to create account')
            return
          }
          return
        }

        setError(loginResult.error.message || 'Login failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mt-4">
      {error && <p className="mb-2 text-center text-sm text-red-500">{error}</p>}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={isLoading}
        onClick={handleDevLogin}
      >
        {isLoading ? 'Logging in…' : 'Dev Login (dev@posthog.com)'}
      </Button>
    </div>
  )
}
