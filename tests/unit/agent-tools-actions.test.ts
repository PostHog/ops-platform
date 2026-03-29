import { describe, expect, it, vi } from 'vitest'
import mockPrisma from '../mocks/prisma'
import {
  createProposedHire,
  updateProposedHirePriority,
} from '@/lib/agents/tools/actions'

const mockContext = {
  userId: 'user-1',
  userRole: 'admin',
  userEmail: 'admin@posthog.com',
  conversationId: 'conv-1',
  agentId: 'agent-1',
}

// ─── createProposedHire ─────────────────────────────────────────────────────

describe('createProposedHire', () => {
  it('creates a proposed hire and returns success', async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({
      id: 'emp-1',
      email: 'mgr@posthog.com',
      deelEmployee: { firstName: 'Bob', lastName: 'Jones' },
    })
    mockPrisma.proposedHire.create.mockResolvedValue({
      id: 'ph-1',
      title: 'Senior Engineer',
      priority: 'high',
      hiringProfile: 'Full stack',
      createdAt: new Date(),
      manager: {
        id: 'emp-1',
        email: 'mgr@posthog.com',
        deelEmployee: { firstName: 'Bob', lastName: 'Jones' },
      },
      talentPartners: [],
    })
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' })

    const result = (await createProposedHire.execute(
      {
        title: 'Senior Engineer',
        managerId: 'emp-1',
        talentPartnerIds: [],
        priority: 'high',
        hiringProfile: 'Full stack',
      },
      mockContext,
    )) as Record<string, unknown>

    expect(result.success).toBe(true)
    expect((result.proposedHire as Record<string, unknown>).title).toBe('Senior Engineer')
  })

  it('returns error when manager not found', async () => {
    mockPrisma.employee.findUnique.mockResolvedValue(null)

    const result = (await createProposedHire.execute(
      {
        title: 'Engineer',
        managerId: 'emp-999',
        talentPartnerIds: [],
        priority: 'medium',
        hiringProfile: '',
      },
      mockContext,
    )) as Record<string, unknown>

    expect(result.error).toContain('not found')
  })

  it('creates audit log after creation', async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({
      id: 'emp-1',
      email: 'mgr@posthog.com',
      deelEmployee: { firstName: 'A', lastName: 'B' },
    })
    mockPrisma.proposedHire.create.mockResolvedValue({
      id: 'ph-2',
      title: 'T',
      priority: 'medium',
      hiringProfile: '',
      createdAt: new Date(),
      manager: { id: 'emp-1', email: 'mgr@posthog.com', deelEmployee: { firstName: 'A', lastName: 'B' } },
      talentPartners: [],
    })
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' })

    await createProposedHire.execute(
      { title: 'T', managerId: 'emp-1', talentPartnerIds: [], priority: 'medium', hiringProfile: '' },
      mockContext,
    )

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: 'AGENT_ACTION',
          fieldName: 'createProposedHire',
        }),
      }),
    )
  })

  it('connects talent partners by ID', async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({
      id: 'emp-1',
      email: 'mgr@posthog.com',
      deelEmployee: { firstName: 'A', lastName: 'B' },
    })
    mockPrisma.proposedHire.create.mockResolvedValue({
      id: 'ph-3',
      title: 'T',
      priority: 'medium',
      hiringProfile: '',
      createdAt: new Date(),
      manager: { id: 'emp-1', email: 'mgr@posthog.com', deelEmployee: null },
      talentPartners: [
        { id: 'tp-1', email: 'tp@posthog.com', deelEmployee: { firstName: 'C', lastName: 'D' } },
      ],
    })
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' })

    await createProposedHire.execute(
      { title: 'T', managerId: 'emp-1', talentPartnerIds: ['tp-1'], priority: 'medium', hiringProfile: '' },
      mockContext,
    )

    expect(mockPrisma.proposedHire.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          talentPartners: { connect: [{ id: 'tp-1' }] },
        }),
      }),
    )
  })

  it('has requiresConfirmation flag set', () => {
    expect(createProposedHire.requiresConfirmation).toBe(true)
  })
})

// ─── updateProposedHirePriority ─────────────────────────────────────────────

describe('updateProposedHirePriority', () => {
  it('updates priority and returns old and new', async () => {
    mockPrisma.proposedHire.findUnique.mockResolvedValue({
      id: 'ph-1',
      title: 'Engineer',
      priority: 'medium',
      manager: {
        id: 'emp-1',
        email: 'mgr@posthog.com',
        deelEmployee: { firstName: 'Bob', lastName: 'Jones' },
      },
    })
    mockPrisma.proposedHire.update.mockResolvedValue({
      id: 'ph-1',
      title: 'Engineer',
      priority: 'high',
    })
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' })

    const result = (await updateProposedHirePriority.execute(
      { proposedHireId: 'ph-1', priority: 'high' },
      mockContext,
    )) as Record<string, unknown>

    expect(result.success).toBe(true)
    const ph = result.proposedHire as Record<string, unknown>
    expect(ph.oldPriority).toBe('medium')
    expect(ph.newPriority).toBe('high')
  })

  it('returns error when proposed hire not found', async () => {
    mockPrisma.proposedHire.findUnique.mockResolvedValue(null)

    const result = (await updateProposedHirePriority.execute(
      { proposedHireId: 'ph-999', priority: 'high' },
      mockContext,
    )) as Record<string, unknown>

    expect(result.error).toContain('not found')
  })

  it('creates audit log with old and new priority', async () => {
    mockPrisma.proposedHire.findUnique.mockResolvedValue({
      id: 'ph-1',
      title: 'T',
      priority: 'low',
      manager: { id: 'emp-1', email: 'e', deelEmployee: null },
    })
    mockPrisma.proposedHire.update.mockResolvedValue({
      id: 'ph-1',
      title: 'T',
      priority: 'filled',
    })
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' })

    await updateProposedHirePriority.execute(
      { proposedHireId: 'ph-1', priority: 'filled' },
      mockContext,
    )

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            result: { oldPriority: 'low', newPriority: 'filled' },
          }),
        }),
      }),
    )
  })

  it('has requiresConfirmation flag set', () => {
    expect(updateProposedHirePriority.requiresConfirmation).toBe(true)
  })
})
