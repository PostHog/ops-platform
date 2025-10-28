import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { redirect } from '@tanstack/react-router'
import { auth } from './auth'

export const authMiddleware = createMiddleware({ type: 'function' }).server(
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

    if (user.role !== 'admin') {
      throw redirect({
        to: '/error',
        search: { message: 'You are not authorized to access this page' },
      })
    }

    return await next({
      context: { user },
    })
  },
)
