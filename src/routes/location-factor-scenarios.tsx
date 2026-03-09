import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/location-factor-scenarios')({
  loader: () => {
    throw redirect({ to: '/payroll-scenarios' })
  },
  component: () => null,
})
