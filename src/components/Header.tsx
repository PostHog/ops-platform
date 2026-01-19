import { Link, useRouter } from '@tanstack/react-router'
import { Button } from './ui/button'
import { signOut, useSession, stopImpersonating } from '@/lib/auth-client'
import { createInternalFn } from '@/lib/auth-middleware'
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
import { createToast } from 'vercel-toast'

export const getMyEmployeeId = createInternalFn({
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

  const handleStopImpersonating = async () => {
    try {
      await stopImpersonating()
      window.location.href = '/'
    } catch (error) {
      createToast(
        `Failed to stop impersonating: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { timeout: 5000 },
      )
    }
  }

  const isImpersonating = !!session?.session?.impersonatedBy

  if (!user) return null

  return (
    <header className="fixed top-0 right-0 left-0 flex h-10 justify-between gap-2 border-b border-gray-200 bg-white p-2 text-black">
      <nav className="flex flex-row items-center gap-2">
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
                <Link to="/employees">Employees</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/actions">Pay review actions</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/commissionActions">Commission actions</Link>
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
                <Link to="/org-tree">Org tree</Link>
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
                <Link to="/missingCommissions">Missing commissions</Link>
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
        {session && (
          <>
            <span
              className={
                isImpersonating
                  ? 'text-sm font-semibold text-orange-600'
                  : 'text-sm text-gray-500'
              }
            >
              {isImpersonating ? 'Impersonating: ' : 'Logged in as '}
              {session.user.name}
            </span>
            {isImpersonating && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleStopImpersonating}
              >
                Stop Impersonating
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Sign out
            </Button>
          </>
        )}
      </div>
    </header>
  )
}
