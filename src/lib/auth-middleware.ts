import { createMiddleware, createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { redirect } from '@tanstack/react-router'
import { auth } from './auth'
import { ROLES } from './consts'
import prisma from '@/db'

export async function getBlitzscaleUserEmails(): Promise<string[]> {
  const blitzscaleUsers = await prisma.user.findMany({
    where: { role: ROLES.BLITZSCALE },
    select: { email: true },
  })
  return blitzscaleUsers.map((u) => u.email)
}

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

  if (user?.role !== ROLES.ADMIN && user?.role !== ROLES.BLITZSCALE) {
    throw redirect({
      to: '/error',
      search: { message: 'You are not authorized to access this page' },
    })
  } else {
    return await next()
  }
})

// Strictly admin-only (not blitzscale) — for management, role changes, impersonation
const strictAdminCheckMiddleware = createMiddleware({
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

  if (user?.role !== ROLES.ORG_CHART && user?.role !== ROLES.ADMIN && user?.role !== ROLES.BLITZSCALE) {
    throw redirect({
      to: '/error',
      search: { message: 'You are not authorized to access this page' },
    })
  } else {
    return await next()
  }
})

const internalCheckMiddleware = createMiddleware({
  type: 'function',
}).server(async ({ next, context }) => {
  const user = (
    context as unknown as { user?: { email?: string; role?: string } }
  )?.user

  if (
    (user?.email && user?.email.endsWith('@posthog.com')) ||
    user?.role === ROLES.ADMIN || user?.role === ROLES.BLITZSCALE
  ) {
    return await next()
  } else {
    throw redirect({
      to: '/error',
      search: { message: 'You are not authorized to access this page' },
    })
  }
})

async function getManagedEmployeeIds(
  managerDeelEmployeeId: string,
): Promise<Set<string>> {
  const managedEmployeeIds = new Set<string>()

  const getReportEmployeeIds = async (
    deelEmployeeId: string,
  ): Promise<void> => {
    const directReports = await prisma.deelEmployee.findMany({
      where: { managerId: deelEmployeeId },
      include: { employee: { select: { id: true } } },
    })

    for (const report of directReports) {
      if (report.employee?.id) {
        managedEmployeeIds.add(report.employee.id)
        await getReportEmployeeIds(report.id)
      }
    }
  }

  await getReportEmployeeIds(managerDeelEmployeeId)
  return managedEmployeeIds
}

export type ManagerInfo = {
  managerDeelEmployeeId: string | null
  managedEmployeeIds: Array<string>
}

const managerInfoMiddleware = createMiddleware({
  type: 'function',
}).server(async ({ next, context }) => {
  const user = (
    context as unknown as { user?: { email?: string; role?: string } }
  )?.user

  let managerInfo: ManagerInfo = {
    managerDeelEmployeeId: null,
    managedEmployeeIds: [],
  }

  if (user?.email && user.role !== ROLES.ADMIN && user.role !== ROLES.BLITZSCALE) {
    // Get the user's DeelEmployee ID to check if they're a manager
    const userDeelEmployee = await prisma.deelEmployee.findUnique({
      where: { workEmail: user.email },
      select: { id: true },
    })

    const managerDeelEmployeeId = userDeelEmployee?.id ?? null

    // For managers, get all employee IDs they manage (recursively)
    const managedEmployeeIds = managerDeelEmployeeId
      ? Array.from(await getManagedEmployeeIds(managerDeelEmployeeId))
      : []

    managerInfo = {
      managerDeelEmployeeId,
      managedEmployeeIds,
    }
  }

  return await next({
    context: {
      ...(context || {}),
      managerInfo,
    },
  })
})

// admin and blitzscale users will be able to access this function
export const createAdminFn = createServerFn().middleware([
  authMiddleware,
  adminCheckMiddleware,
])

// admin and blitzscale users will be able to access this function (includes manager info)
export const createPayReviewFn = createServerFn().middleware([
  authMiddleware,
  adminCheckMiddleware,
  managerInfoMiddleware,
])

// strictly admin-only (management, role changes, impersonation)
export const createStrictAdminFn = createServerFn().middleware([
  authMiddleware,
  strictAdminCheckMiddleware,
])

// org chart and admin users will be able to access this function
export const createOrgChartFn = createServerFn().middleware([
  authMiddleware,
  orgChartCheckMiddleware,
])

// only internal users will be able to access this function
export const createInternalFn = createServerFn().middleware([
  authMiddleware,
  internalCheckMiddleware,
  managerInfoMiddleware,
])
