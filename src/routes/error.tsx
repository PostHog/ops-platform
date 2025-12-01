import { createFileRoute, useSearch } from '@tanstack/react-router'

export const Route = createFileRoute('/error')({
  component: RouteComponent,
})

function RouteComponent() {
  const search: { message: string } = useSearch({ from: '/error' })
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="flex w-full max-w-md flex-col items-center justify-center px-6">
        <h1 className="mb-8 text-center text-3xl font-semibold">
          An error occurred
        </h1>

        <span className="text-center text-sm text-gray-500">
          {search.message}
        </span>
      </div>
    </div>
  )
}
