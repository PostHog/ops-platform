import { z } from 'zod'
import prisma from '@/db'
import { defineTool } from '../types'
import { createAgentAuditLog } from '../audit'

export const createProposedHire = defineTool({
  name: 'createProposedHire',
  description:
    'Create a new proposed hire record. This adds a planned hiring position to the system. REQUIRES USER CONFIRMATION before executing.',
  parameters: z.object({
    title: z.string().describe('Job title for the proposed hire'),
    managerId: z
      .string()
      .describe('Employee ID of the hiring manager'),
    talentPartnerIds: z
      .array(z.string())
      .default([])
      .describe('Employee IDs of talent partners assigned to this hire'),
    priority: z
      .enum(['low', 'medium', 'high'])
      .default('medium')
      .describe('Hiring priority'),
    hiringProfile: z
      .string()
      .default('')
      .describe('Description of the ideal candidate profile'),
  }),
  requiresConfirmation: true,
  execute: async (params, context) => {
    // Verify the manager exists
    const manager = await prisma.employee.findUnique({
      where: { id: params.managerId },
      include: {
        deelEmployee: { select: { firstName: true, lastName: true } },
      },
    })

    if (!manager) {
      return { error: `Manager with ID ${params.managerId} not found` }
    }

    // Create the proposed hire
    const proposedHire = await prisma.proposedHire.create({
      data: {
        title: params.title,
        managerId: params.managerId,
        priority: params.priority,
        hiringProfile: params.hiringProfile,
        talentPartners: {
          connect: params.talentPartnerIds.map((id) => ({ id })),
        },
      },
      include: {
        manager: {
          include: {
            deelEmployee: { select: { firstName: true, lastName: true } },
          },
        },
        talentPartners: {
          include: {
            deelEmployee: { select: { firstName: true, lastName: true } },
          },
        },
      },
    })

    // Log the action
    await createAgentAuditLog({
      actorUserId: context.userId,
      conversationId: context.conversationId,
      toolName: 'createProposedHire',
      params,
      result: { proposedHireId: proposedHire.id },
    })

    return {
      success: true,
      proposedHire: {
        id: proposedHire.id,
        title: proposedHire.title,
        priority: proposedHire.priority,
        hiringProfile: proposedHire.hiringProfile,
        manager: {
          id: proposedHire.manager.id,
          name: proposedHire.manager.deelEmployee
            ? `${proposedHire.manager.deelEmployee.firstName} ${proposedHire.manager.deelEmployee.lastName}`
            : proposedHire.manager.email,
        },
        talentPartners: proposedHire.talentPartners.map((tp) => ({
          id: tp.id,
          name: tp.deelEmployee
            ? `${tp.deelEmployee.firstName} ${tp.deelEmployee.lastName}`
            : tp.email,
        })),
        createdAt: proposedHire.createdAt,
      },
    }
  },
})

export const updateProposedHirePriority = defineTool({
  name: 'updateProposedHirePriority',
  description:
    'Update the priority of an existing proposed hire. REQUIRES USER CONFIRMATION before executing.',
  parameters: z.object({
    proposedHireId: z.string().describe('ID of the proposed hire to update'),
    priority: z
      .enum(['low', 'medium', 'high', 'pushed_to_next_quarter', 'filled'])
      .describe('New priority level'),
  }),
  requiresConfirmation: true,
  execute: async (params, context) => {
    // Get current state
    const existing = await prisma.proposedHire.findUnique({
      where: { id: params.proposedHireId },
      include: {
        manager: {
          include: {
            deelEmployee: { select: { firstName: true, lastName: true } },
          },
        },
      },
    })

    if (!existing) {
      return { error: `Proposed hire with ID ${params.proposedHireId} not found` }
    }

    const oldPriority = existing.priority

    // Update
    const updated = await prisma.proposedHire.update({
      where: { id: params.proposedHireId },
      data: { priority: params.priority },
    })

    // Log the action
    await createAgentAuditLog({
      actorUserId: context.userId,
      conversationId: context.conversationId,
      toolName: 'updateProposedHirePriority',
      params,
      result: { oldPriority, newPriority: params.priority },
    })

    return {
      success: true,
      proposedHire: {
        id: updated.id,
        title: updated.title,
        oldPriority,
        newPriority: updated.priority,
        manager: existing.manager.deelEmployee
          ? `${existing.manager.deelEmployee.firstName} ${existing.manager.deelEmployee.lastName}`
          : existing.manager.email,
      },
    }
  },
})

export const actionTools = {
  createProposedHire,
  updateProposedHirePriority,
}
