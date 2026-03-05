import prisma from '@/db'

export async function createAgentAuditLog({
  actorUserId,
  conversationId,
  toolName,
  params,
  result,
}: {
  actorUserId: string
  conversationId: string
  toolName: string
  params: unknown
  result: unknown
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorUserId,
      entityType: 'AGENT_ACTION',
      entityId: conversationId,
      fieldName: toolName,
      newValue: JSON.stringify(result),
      metadata: {
        toolName,
        params,
        result,
      },
    },
  })
}
