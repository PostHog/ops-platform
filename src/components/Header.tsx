import { useSession, signOut } from '@/lib/auth-client'
import { Link } from '@tanstack/react-router'
import { Button } from './ui/button'

export default function Header() {
  const { data: session } = useSession()

  return (
    <header className="p-2 flex h-10 gap-2 bg-white text-black justify-between border-b border-gray-200">
      <nav className="flex flex-row">
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
      </nav>
      <div className="flex flex-row gap-2 items-center">
        {session ? (
          <>
            <span className="text-sm text-gray-500">Logged in as {session?.user.name}</span>
            <Button variant="outline" onClick={() => signOut()}>Sign out</Button>
          </>
        ) : null}
      </div>
    </header>
  )
}
