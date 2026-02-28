import { createAdminFn } from '@/lib/auth-middleware'
import prisma from '@/db'

// Get conversations for the current user
export const getConversations = createAdminFn({ method: 'GET' }).handler(
  async ({ context }) => {
    return await prisma.agentConversation.findMany({
      where: { userId: context.user.id },
      include: {
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { updatedAt: 'desc' },
    })
  },
)

// Create a new conversation
export const createConversation = createAdminFn({ method: 'POST' })
  .inputValidator((d: Record<string, never>) => d)
  .handler(async ({ context }) => {
    return await prisma.agentConversation.create({
      data: {
        userId: context.user.id,
      },
    })
  })

// Get conversation with messages
export const getConversationMessages = createAdminFn({ method: 'GET' })
  .inputValidator((d: { conversationId: string }) => d)
  .handler(async ({ data, context }) => {
    const conversation = await prisma.agentConversation.findFirst({
      where: {
        id: data.conversationId,
        userId: context.user.id,
      },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!conversation) {
      throw new Error('Conversation not found')
    }

    return conversation
  })

// Delete a conversation
export const deleteConversation = createAdminFn({ method: 'POST' })
  .inputValidator((d: { conversationId: string }) => d)
  .handler(async ({ data, context }) => {
    // Verify ownership
    const conversation = await prisma.agentConversation.findFirst({
      where: {
        id: data.conversationId,
        userId: context.user.id,
      },
    })

    if (!conversation) {
      throw new Error('Conversation not found')
    }

    // Delete messages first, then conversation
    await prisma.agentMessage.deleteMany({
      where: { conversationId: data.conversationId },
    })

    return await prisma.agentConversation.delete({
      where: { id: data.conversationId },
    })
  })
