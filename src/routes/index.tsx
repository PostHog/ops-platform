import { getMyEmployeeId } from '@/components/Header'
import { useSession } from '@/lib/auth-client'
import { ROLES } from '@/lib/consts'
import { useQuery, useMutation } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AgentChat } from '@/components/agents/AgentChat'
import { ChatSidebar } from '@/components/agents/ChatSidebar'
import { createConversation } from '@/lib/agents/server-functions'

export const Route = createFileRoute('/')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      c: search.c as string | undefined,
    }
  },
})

// Default agent configuration with all tools
const DEFAULT_AGENT = {
  id: 'default',
  name: 'AI Assistant',
  slug: 'default',
  description: 'Your AI assistant with access to all tools',
  systemPrompt: `You are a helpful AI assistant for the Array ops platform. You have access to tools that let you:

- Read employee data, salaries, and organizational structure
- Analyze compensation scenarios
- Read and manage proposed hires
- View compensation benchmarks

Always be clear and concise in your responses. When using tools, ALWAYS explain what you're doing and what you found. After calling a tool and receiving results, you MUST provide a natural language response to the user summarizing the information.`,
  initialPrompt:
    'Hi! I can help you with employee data, compensation analysis, and more. What would you like to know?',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdById: '',
}

function RouteComponent() {
  const { data: session, isRefetching } = useSession()
  const user = session?.user
  const router = useRouter()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const [conversationId, setConversationId] = useState<string | undefined>(
    search.c,
  )
  const {
    data: myEmployeeId,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['myEmployeeId'],
    queryFn: getMyEmployeeId,
  })

  // Create a conversation for admins
  const createConversationMutation = useMutation({
    mutationFn: () => createConversation({ data: {} }),
    onSuccess: (conversation) => {
      setConversationId(conversation.id)
      navigate({ search: { c: conversation.id } })
    },
  })

  // Auto-create conversation when there isn't one
  useEffect(() => {
    if (
      user?.role === ROLES.ADMIN &&
      !conversationId &&
      !createConversationMutation.isPending
    ) {
      createConversationMutation.mutate()
    }
  }, [user, conversationId])

  useEffect(() => {
    if (user && !isRefetching) {
      if (user.role === ROLES.ADMIN) {
        // Admins see the assistant - don't auto-create conversation
        // User can click "New Chat" to start
      } else if (user.role === ROLES.ORG_CHART) {
        router.navigate({ to: '/org-chart' })
      } else if (myEmployeeId) {
        router.navigate({
          to: '/employee/$employeeId',
          params: { employeeId: myEmployeeId },
        })
      } else if (!isLoading && !myEmployeeId && error instanceof Error) {
        router.navigate({ to: '/error', search: { message: error.message } })
      }
    } else if (!user && !isRefetching) {
      router.navigate({ to: '/login' })
    }
  }, [user, myEmployeeId, isLoading, error, isRefetching])

  const handleSelectConversation = (id: string | undefined) => {
    if (id) {
      setConversationId(id)
      navigate({ search: { c: id } })
    } else {
      // Start new conversation (without creating DB record yet)
      setConversationId(undefined)
      navigate({ search: {} })
    }
  }

  // Sync conversationId from URL on mount/change
  useEffect(() => {
    if (search.c && search.c !== conversationId) {
      setConversationId(search.c)
    }
  }, [search.c])

  // Show assistant for admins
  if (user?.role === ROLES.ADMIN) {
    return (
      <div className="fixed inset-0 top-10 flex">
        <ChatSidebar
          currentConversationId={conversationId}
          onSelectConversation={handleSelectConversation}
        />
        <div className="flex-1">
          {conversationId ? (
            <AgentChat
              agent={DEFAULT_AGENT}
              conversationId={conversationId}
              onConversationCreated={(id) => {
                setConversationId(id)
                navigate({ search: { c: id } })
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-500">
              Creating conversation…
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen items-center justify-center">
      Redirecting...
    </div>
  )
}
