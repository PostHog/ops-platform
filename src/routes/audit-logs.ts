import { createOrgChartFn } from '@/lib/auth-middleware'
import prisma from '@/db'
import type { Prisma } from '@prisma/client'
import { ROLES } from '@/lib/consts'

type AuditLogEntityType = 'USER_ROLE' | 'MANAGER' | 'TEAM'

type AuditLogEntry = {
  id: string
  timestamp: Date
  actor: {
    id: string
    name: string
    email: string
  }
  oldValue: string | null
  newValue: string | null
  metadata: Record<string, unknown> | null
}

type AuditLogEntryResponse = {
  id: string
  timestamp: Date
  actor: {
    id: string
    name: string
    email: string
  }
  oldValue: string | null
  newValue: string | null
  metadata: { [x: string]: {} } | null
}

async function getAuditLogs({
  entityType,
  entityId,
}: {
  entityType: AuditLogEntityType
  entityId: string
}): Promise<AuditLogEntry[]> {
  const logs = await prisma.auditLog.findMany({
    where: {
      entityType,
      entityId,
    },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
  })

  return logs.map(
    (
      log: Prisma.AuditLogGetPayload<{
        include: {
          actor: {
            select: {
              id: true
              name: true
              email: true
            }
          }
        }
      }>,
    ) => ({
      id: log.id,
      timestamp: log.timestamp,
      actor: log.actor,
      oldValue: log.oldValue,
      newValue: log.newValue,
      metadata: log.metadata as Record<string, unknown> | null,
    }),
  )
}

export const getAuditLogsFn = createOrgChartFn({
  method: 'GET',
})
  .inputValidator((d: { entityType: string; entityId: string }) => d)
  .handler(async ({ data, context }): Promise<AuditLogEntryResponse[]> => {
    if (data.entityType === 'USER_ROLE' && context.user.role !== ROLES.ADMIN) {
      throw new Error('Unauthorized')
    }
    const logs = await getAuditLogs({
      entityType: data.entityType as AuditLogEntityType,
      entityId: data.entityId,
    })
    return logs.map((log) => ({
      ...log,
      metadata: log.metadata as { [x: string]: {} } | null,
    }))
  })
