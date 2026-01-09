import prisma from '@/db'
import type { Prisma } from '@prisma/client'
import { Prisma as PrismaClient } from '@prisma/client'

export type AuditLogEntityType = 'USER_ROLE' | 'MANAGER' | 'TEAM'

export async function createAuditLogEntry({
  actorUserId,
  entityType,
  entityId,
  fieldName,
  oldValue,
  newValue,
  metadata,
}: {
  actorUserId: string
  entityType: AuditLogEntityType
  entityId: string
  fieldName: string
  oldValue: string | null
  newValue: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId,
        entityType,
        entityId,
        fieldName,
        oldValue,
        newValue,
        metadata: metadata
          ? (metadata as Prisma.InputJsonValue)
          : PrismaClient.JsonNull,
      },
    })
  } catch (error) {
    // Log error but don't fail the main operation
    console.error('Failed to create audit log entry:', error)
  }
}

export type AuditLogEntry = {
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
