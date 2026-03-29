import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { OnboardingTask, OnboardingTaskAssigneeType } from '@prisma/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createToast } from 'vercel-toast'

const ASSIGNEE_LABELS: Record<OnboardingTaskAssigneeType, string> = {
  ops: 'Ops (Carol / Tara)',
  manager: 'Manager',
  kendal: 'Kendal',
  hector: 'Hector',
  scott: 'Scott',
  new_hire: 'New Hire',
}

const ASSIGNEE_ORDER: OnboardingTaskAssigneeType[] = [
  'ops',
  'manager',
  'kendal',
  'hector',
  'scott',
  'new_hire',
]

function formatTaskDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

function isOverdue(date: Date | string) {
  return new Date(date) < new Date()
}

export function OnboardingTaskPanel({
  open,
  onOpenChange,
  recordId,
  recordName,
  getOnboardingTasks,
  completeOnboardingTask,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  recordId: string
  recordName: string
  getOnboardingTasks: (args: {
    data: { recordId: string }
  }) => Promise<OnboardingTask[]>
  completeOnboardingTask: (args: {
    data: { taskId: string; completed: boolean }
  }) => Promise<OnboardingTask>
}) {
  const queryClient = useQueryClient()

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['onboarding-tasks', recordId],
    queryFn: () => getOnboardingTasks({ data: { recordId } }),
    enabled: open,
  })

  const handleToggle = async (taskId: string, currentCompleted: boolean) => {
    try {
      await completeOnboardingTask({
        data: { taskId, completed: !currentCompleted },
      })
      await queryClient.invalidateQueries({
        queryKey: ['onboarding-tasks', recordId],
      })
      await queryClient.invalidateQueries({ queryKey: ['onboarding-records'] })
    } catch {
      createToast('Failed to update task', { type: 'error', timeout: 4000 })
    }
  }

  // Group tasks by assignee type
  const grouped = ASSIGNEE_ORDER.map((type) => ({
    type,
    label: ASSIGNEE_LABELS[type],
    tasks: tasks.filter((t) => t.assigneeType === type),
  })).filter((g) => g.tasks.length > 0)

  const completed = tasks.filter((t) => t.completed).length
  const total = tasks.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Tasks for {recordName}
            {total > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                {completed}/{total} complete
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            Loading tasks...
          </p>
        ) : tasks.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No tasks generated yet. Tasks are created when a hire has a start
            date.
          </p>
        ) : (
          <div className="space-y-6 py-2">
            {grouped.map((group) => (
              <div key={group.type}>
                <h3 className="mb-2 text-sm font-semibold text-gray-900">
                  {group.label}
                  <span className="ml-1.5 text-xs font-normal text-gray-400">
                    ({group.tasks.filter((t) => t.completed).length}/
                    {group.tasks.length})
                  </span>
                </h3>
                <div className="space-y-1">
                  {group.tasks.map((task) => {
                    const overdue = !task.completed && isOverdue(task.dueDate)
                    return (
                      <label
                        key={task.id}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-gray-50 ${
                          task.completed ? 'opacity-60' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => handleToggle(task.id, task.completed)}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300"
                        />
                        <span
                          className={`flex-1 text-sm ${task.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}
                        >
                          {task.description}
                        </span>
                        <span
                          className={`shrink-0 text-xs ${
                            task.completed
                              ? 'text-gray-400'
                              : overdue
                                ? 'font-medium text-red-600'
                                : 'text-gray-500'
                          }`}
                        >
                          {overdue && !task.completed ? 'Overdue · ' : ''}
                          {formatTaskDate(task.dueDate)}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
