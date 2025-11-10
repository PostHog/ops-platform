import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { signIn, useSession } from '@/lib/auth-client'
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
  const { data: myEmployeeId } = useQuery({
    queryKey: ['myEmployeeId'],
    queryFn: getMyEmployeeId,
  })

  useEffect(() => {
    if (user && !isRefetching) {
      if (user.role === ROLES.ADMIN) {
        router.navigate({ to: '/' })
      } else {
        if (!myEmployeeId) return
        router.navigate({
          to: '/employee/$employeeId',
          params: { employeeId: myEmployeeId ?? '' },
        })
      }
    }
  }, [user, myEmployeeId])

  const handleLogin = async () => {
    await signIn.social({
      provider: 'google',
      callbackURL: '/login',
    })
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="w-full max-w-md px-6">
        <h1 className="text-3xl font-semibold text-center mb-8">
          Sign in to your account
        </h1>

        <Button
          className="w-full h-11 rounded-lg font-medium shadow-lg transition-all"
          onClick={handleLogin}
        >
          Sign in
        </Button>
      </div>
    </div>
  )
}
