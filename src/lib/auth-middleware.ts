import { createMiddleware, createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { redirect } from '@tanstack/react-router'
import { auth } from './auth'
import { ROLES } from './consts'

const authMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    let user = null

    try {
      const request = getRequest()

      const session = await auth.api.getSession({
        headers: request.headers,
      })

      if (session?.user) {
        user = {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
        }
      }
    } catch (error) {
      console.error('❌ Auth middleware error:', error)
    }

    if (!user) {
      throw redirect({ to: '/login' })
    }

    return await next({
      context: { user },
    })
  },
)

const adminCheckMiddleware = createMiddleware({
  type: 'function',
}).server(async ({ next, context }) => {
  const user = (context as unknown as { user?: { role?: string } })?.user

  if (user?.role !== ROLES.ADMIN) {
    throw redirect({
      to: '/error',
      search: { message: 'You are not authorized to access this page' },
    })
  } else {
    return await next()
  }
})

const orgChartCheckMiddleware = createMiddleware({
  type: 'function',
}).server(async ({ next, context }) => {
  const user = (context as unknown as { user?: { role?: string } })?.user

  if (user?.role !== ROLES.ORG_CHART && user?.role !== ROLES.ADMIN) {
    throw redirect({
      to: '/error',
      search: { message: 'You are not authorized to access this page' },
    })
  } else {
    return await next()
  }
})

// only admins will be able to access this function
export const createAuthenticatedFn = createServerFn().middleware([
  authMiddleware,
  adminCheckMiddleware,
])

// org chart and admin users will be able to access this function
export const createOrgChartFn = createServerFn().middleware([
  authMiddleware,
  orgChartCheckMiddleware,
])

// all authenticated users will be able to access this function
export const createUserFn = createServerFn().middleware([authMiddleware])
