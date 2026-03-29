import { describe, expect, it } from 'vitest'
import mockPrisma from '../mocks/prisma'
import { createAgentAuditLog } from '@/lib/agents/audit'

describe('createAgentAuditLog', () => {
  it('creates audit log with AGENT_ACTION entity type', async () => {
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' })

    await createAgentAuditLog({
      actorUserId: 'user-1',
      conversationId: 'conv-1',
      toolName: 'readEmployees',
      params: { limit: 10 },
      result: [{ id: 'emp-1' }],
    })

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorUserId: 'user-1',
        entityType: 'AGENT_ACTION',
        entityId: 'conv-1',
        fieldName: 'readEmployees',
        newValue: JSON.stringify([{ id: 'emp-1' }]),
        metadata: {
          toolName: 'readEmployees',
          params: { limit: 10 },
          result: [{ id: 'emp-1' }],
        },
      },
    })
  })

  it('stores conversationId as entityId', async () => {
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-2' })

    await createAgentAuditLog({
      actorUserId: 'user-1',
      conversationId: 'conv-abc',
      toolName: 'createProposedHire',
      params: {},
      result: { success: true },
    })

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityId: 'conv-abc',
        }),
      }),
    )
  })

  it('serializes result to JSON string for newValue', async () => {
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-3' })
    const result = { count: 42 }

    await createAgentAuditLog({
      actorUserId: 'user-1',
      conversationId: 'conv-1',
      toolName: 'test',
      params: {},
      result,
    })

    const call = mockPrisma.auditLog.create.mock.calls[0][0]
    expect(call.data.newValue).toBe(JSON.stringify(result))
  })
})
