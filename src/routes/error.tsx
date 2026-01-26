import { createFileRoute, useSearch } from '@tanstack/react-router'
import { useSession } from '@/lib/auth-client'

export const Route = createFileRoute('/error')({
  component: RouteComponent,
})

function RouteComponent() {
  const search: { message: string } = useSearch({ from: '/error' })
  const { data: session } = useSession()

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="flex w-full max-w-md flex-col items-center justify-center px-6">
        <h1 className="mb-8 text-center text-3xl font-semibold">
          An error occurred
        </h1>

        <span className="text-center text-sm text-gray-500">
          {search.message}
        </span>

        {session?.user?.email && (
          <span className="mt-6 text-center text-sm text-gray-400">
            You are logged in as {session.user.email}. Please make sure to login
            with your work email.
          </span>
        )}
      </div>
    </div>
  )
}
