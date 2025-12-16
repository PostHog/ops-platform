import { Link, useRouter } from '@tanstack/react-router'
import { Button } from './ui/button'
import { signOut, useSession } from '@/lib/auth-client'
import { createUserFn } from '@/lib/auth-middleware'
import prisma from '@/db'
import { useQuery } from '@tanstack/react-query'
import { ROLES } from '@/lib/consts'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { ChevronDownIcon } from 'lucide-react'

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
    <header className="flex h-10 justify-between gap-2 border-b border-gray-200 bg-white p-2 text-black">
      <nav className="flex flex-row items-center gap-2">
        {user?.role === ROLES.ADMIN ? (
          <div className="px-2 font-bold">
            <Link to="/">Employees</Link>
          </div>
        ) : null}
        {user?.role === ROLES.ADMIN ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 px-2 font-bold hover:opacity-80">
                Pay Reviews
                <ChevronDownIcon className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem asChild>
                <Link to="/actions">Pay review actions</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/process">Process</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        {(user?.role === ROLES.ADMIN || user?.role === ROLES.ORG_CHART) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 px-2 font-bold hover:opacity-80">
                Organization
                <ChevronDownIcon className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem asChild>
                <Link to="/org-chart">Org chart</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/proposed-hires">Proposed hires</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {user?.role === ROLES.ADMIN ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 px-2 font-bold hover:opacity-80">
                Operations
                <ChevronDownIcon className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem asChild>
                <Link to="/management">Management</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/salary-sync-status">Salary sync status</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/analytics">Analytics</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
      <div className="flex flex-row items-center gap-2">
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
