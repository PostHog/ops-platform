import { Link, redirect, useRouter } from '@tanstack/react-router'
import { Button } from './ui/button'
import { signOut, useSession } from '@/lib/auth-client'
import { createUserFn } from '@/lib/auth-middleware'
import prisma from '@/db'
import { useQuery } from '@tanstack/react-query'

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
    throw redirect({ to: '/error', search: { message: 'No employee found' } })
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

  return (
    <header className="p-2 flex h-10 gap-2 bg-white text-black justify-between border-b border-gray-200">
      <nav className="flex flex-row">
        {user?.role === 'admin' ? (
          <>
            <div className="px-2 font-bold">
              <Link to="/">Ops Platform</Link>
            </div>
            <div className="px-2 font-bold">
              <Link to="/actions">Actions</Link>
            </div>
            <div className="px-2 font-bold">
              <Link to="/org-chart">Org chart</Link>
            </div>
            <div className="px-2 font-bold">
              <Link to="/management">Management</Link>
            </div>
          </>
        ) : null}
        <div className="px-2 font-bold">
          <Link
            to="/employee/$employeeId"
            disabled={!myEmployeeId}
            params={{ employeeId: myEmployeeId ?? '' }}
          >
            My employee page
          </Link>
        </div>
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
