import { getMyEmployeeId } from '@/components/Header'
import { useSession } from '@/lib/auth-client'
import { ROLES } from '@/lib/consts'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/')({
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

  return <div>Redirecting...</div>
}
