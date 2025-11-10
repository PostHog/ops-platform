import { Link, useRouter } from '@tanstack/react-router'
import { Button } from './ui/button'
import { signOut, useSession } from '@/lib/auth-client'
import { createUserFn } from '@/lib/auth-middleware'
import prisma from '@/db'
import { useQuery } from '@tanstack/react-query'
import { ROLES } from '@/lib/consts'

export const getMyEmployeeId = createUserFn({
  method: 'GET',
}).handler(async ({ context }) => {
  const user = context.user

  const employee = await prisma.employee.findUnique({
    where: {
      email: user.email,
    },
  })

  if (!employee) {
    throw Error('No employee found')
  }

  return employee.id
})

export default function Header() {
  const { data: session } = useSession()
  const user = session?.user
  const router = useRouter()
  const { data: myEmployeeId } = useQuery({
    queryKey: ['myEmployeeId'],
    queryFn: getMyEmployeeId,
  })

  const handleSignOut = () => {
    signOut()
    router.navigate({ to: '/login' })
  }

  if (!user) return null

  return (
    <header className="p-2 flex h-10 gap-2 bg-white text-black justify-between border-b border-gray-200">
      <nav className="flex flex-row">
        {user?.role === ROLES.ADMIN ? (
          <div className="px-2 font-bold">
            <Link to="/">Employees</Link>
          </div>
        ) : null}
        {user?.role === ROLES.ADMIN ? (
          <div className="px-2 font-bold">
            <Link to="/actions">Pay review actions</Link>
          </div>
        ) : null}
        {user?.role === ROLES.ADMIN || user?.role === ROLES.ORG_CHART ? (
          <div className="px-2 font-bold">
            <Link to="/org-chart">Org chart</Link>
          </div>
        ) : null}
        {user?.role === ROLES.ADMIN ? (
          <div className="px-2 font-bold">
            <Link to="/management">Management</Link>
          </div>
        ) : null}
        {myEmployeeId ? (
          <div className="px-2 font-bold">
            <Link
              to="/employee/$employeeId"
              params={{ employeeId: myEmployeeId }}
            >
              My employee page
            </Link>
          </div>
        ) : null}
      </nav>
      <div className="flex flex-row gap-2 items-center">
        {session ? (
          <>
            <span className="text-sm text-gray-500">
              Logged in as {session?.user.name}
            </span>
            <Button variant="outline" onClick={handleSignOut}>
              Sign out
            </Button>
          </>
        ) : null}
      </div>
    </header>
  )
}
