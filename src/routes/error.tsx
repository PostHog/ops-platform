import { createFileRoute, useSearch } from '@tanstack/react-router'

export const Route = createFileRoute('/error')({
  component: RouteComponent,
})

function RouteComponent() {
    const search = useSearch({ from: '/error' })
    return (
        <div className="flex flex-col items-center justify-center h-full">
            <div className="w-full max-w-md px-6 flex flex-col items-center justify-center">
                <h1 className="text-3xl font-semibold text-center mb-8">
                    An error occurred
                </h1>

                <span className="text-sm text-gray-500 text-center">{search.message}</span>
            </div>
        </div>
    )}
