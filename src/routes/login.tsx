import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { DevLoginForm } from '@/components/DevLoginForm'
import { signIn, useSession, isDevMode } from '@/lib/auth-client'
import { useEffect } from 'react'
import { getMyEmployeeId } from '@/components/Header'
import { useQuery } from '@tanstack/react-query'
import { ROLES } from '@/lib/consts'

export const Route = createFileRoute('/login')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: session, isRefetching } = useSession()
  const user = session?.user
  const router = useRouter()

  const {
    data: myEmployeeId,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['myEmployeeId'],
    queryFn: getMyEmployeeId,
  })

  useEffect(() => {
    if (user && !isRefetching) {
      if (user.role === ROLES.ADMIN) {
        router.navigate({ to: '/org-chart' })
      } else if (user.role === ROLES.ORG_CHART) {
        router.navigate({ to: '/org-chart' })
      } else if (myEmployeeId) {
        router.navigate({
          to: '/employee/$employeeId',
          params: { employeeId: myEmployeeId },
        })
      } else if (!isLoading && !myEmployeeId && error instanceof Error) {
        router.navigate({ to: '/error', search: { message: error.message } })
      }
    }
  }, [user, myEmployeeId, isLoading, error])

  const handleGoogleLogin = async () => {
    await signIn.social({
      provider: 'google',
      callbackURL: '/login',
      errorCallbackURL: '/error',
    })
  }

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="w-full max-w-md px-6">
        <h1 className="mb-8 text-center text-3xl font-semibold">
          Sign in to your account
        </h1>

        <Button
          className="h-11 w-full rounded-lg font-medium shadow-lg transition-all"
          onClick={handleGoogleLogin}
        >
          Sign in with Google
        </Button>

        {isDevMode && <DevLoginForm />}
      </div>
    </div>
  )
}
