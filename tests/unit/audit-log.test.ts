import { describe, expect, it, vi } from 'vitest'
import mockPrisma from '../mocks/prisma'
import { createAuditLogEntry } from '@/lib/audit-log'

describe('createAuditLogEntry', () => {
  it('creates an audit log with correct shape', async () => {
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' })

    await createAuditLogEntry({
      actorUserId: 'user-1',
      entityType: 'USER_ROLE',
      entityId: 'emp-1',
      fieldName: 'role',
      oldValue: 'user',
      newValue: 'admin',
    })

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: 'user-1',
        entityType: 'USER_ROLE',
        entityId: 'emp-1',
        fieldName: 'role',
        oldValue: 'user',
        newValue: 'admin',
      }),
    })
  })

  it('passes metadata as JSON when provided', async () => {
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-2' })

    await createAuditLogEntry({
      actorUserId: 'user-1',
      entityType: 'MANAGER',
      entityId: 'emp-1',
      fieldName: 'manager',
      oldValue: null,
      newValue: 'mgr-1',
      metadata: { reason: 'reorg' },
    })

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: { reason: 'reorg' },
      }),
    })
  })

  it('does not throw when prisma.create fails', async () => {
    mockPrisma.auditLog.create.mockRejectedValue(new Error('DB error'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(
      createAuditLogEntry({
        actorUserId: 'user-1',
        entityType: 'TEAM',
        entityId: 'emp-1',
        fieldName: 'team',
        oldValue: 'A',
        newValue: 'B',
      }),
    ).resolves.toBeUndefined()

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to create audit log entry:',
      expect.any(Error),
    )
    consoleSpy.mockRestore()
  })

  it('sets metadata to JsonNull when no metadata provided', async () => {
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-3' })

    await createAuditLogEntry({
      actorUserId: 'user-1',
      entityType: 'USER_ROLE',
      entityId: 'emp-1',
      fieldName: 'role',
      oldValue: 'a',
      newValue: 'b',
    })

    const call = mockPrisma.auditLog.create.mock.calls[0][0]
    // Prisma.JsonNull is a special sentinel, not null
    expect(call.data.metadata).not.toBeNull()
  })
})
