import prisma from '@/db'
import {
  getApplicableTemplates,
  ONBOARDING_TASK_TEMPLATES,
} from './onboarding-task-templates'

// ─── Due date calculation ────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  result.setHours(9, 0, 0, 0)
  return result
}

// ─── Task generation ─────────────────────────────────────────────────────────

export async function generateOnboardingTasks(
  recordId: string,
  triggerStatus: 'offer_accepted' | 'contract_signed',
  record: {
    role: string
    location: string | null
    startDate: Date | null
  },
): Promise<number> {
  if (!record.startDate) return 0
  const startDate = record.startDate

  const templates = getApplicableTemplates(
    triggerStatus,
    record.role,
    record.location,
  )

  // Avoid duplicates
  const existing = await prisma.onboardingTask.findMany({
    where: { onboardingRecordId: recordId },
    select: { templateId: true },
  })
  const existingIds = new Set(existing.map((e) => e.templateId))

  const templatesToCreate = templates.filter((t) => !existingIds.has(t.id))

  const newTasks = templatesToCreate.map((t) => ({
    onboardingRecordId: recordId,
    templateId: t.id,
    description: t.description,
    assigneeType: t.assigneeType,
    dueDate: addDays(startDate, t.daysFromStart),
  }))

  if (newTasks.length > 0) {
    await prisma.onboardingTask.createMany({ data: newTasks })
  }

  return newTasks.length
}

// ─── Remove tasks for a trigger (when status goes backward) ─────────────────

export async function removeTasksForTrigger(
  recordId: string,
  triggerStatus: 'offer_accepted' | 'contract_signed',
): Promise<number> {
  const templateIds = ONBOARDING_TASK_TEMPLATES.filter(
    (t) => t.triggerStatus === triggerStatus,
  ).map((t) => t.id)

  const result = await prisma.onboardingTask.deleteMany({
    where: {
      onboardingRecordId: recordId,
      templateId: { in: templateIds },
      completed: false,
    },
  })

  return result.count
}

// ─── Sync tasks to match current status ─────────────────────────────────────

const STATUS_TRIGGERS: Record<
  string,
  ('offer_accepted' | 'contract_signed')[]
> = {
  offer_accepted: ['offer_accepted'],
  contract_sent: ['offer_accepted'],
  contract_signed: ['offer_accepted', 'contract_signed'],
  provisioned: ['offer_accepted', 'contract_signed'],
  started: ['offer_accepted', 'contract_signed'],
}

const ALL_TRIGGERS: ('offer_accepted' | 'contract_signed')[] = [
  'offer_accepted',
  'contract_signed',
]

export async function syncTasksToStatus(
  recordId: string,
  newStatus: string,
  record: {
    role: string
    location: string | null
    startDate: Date | null
  },
): Promise<{ generated: number; removed: number }> {
  const applicableTriggers = STATUS_TRIGGERS[newStatus] ?? ['offer_accepted']
  const inapplicableTriggers = ALL_TRIGGERS.filter(
    (t) => !applicableTriggers.includes(t),
  )

  // Remove incomplete tasks for triggers that no longer apply
  let removed = 0
  for (const trigger of inapplicableTriggers) {
    removed += await removeTasksForTrigger(recordId, trigger)
  }

  // Generate tasks for all applicable triggers (dedup handles existing)
  let generated = 0
  for (const trigger of applicableTriggers) {
    generated += await generateOnboardingTasks(recordId, trigger, record)
  }

  return { generated, removed }
}

// ─── Recalculate due dates when start date changes ───────────────────────────

export async function recalculateTaskDueDates(
  recordId: string,
  newStartDate: Date,
): Promise<number> {
  const tasks = await prisma.onboardingTask.findMany({
    where: { onboardingRecordId: recordId, completed: false },
    select: { id: true, templateId: true },
  })

  const templateMap = new Map(ONBOARDING_TASK_TEMPLATES.map((t) => [t.id, t]))

  // Group task IDs by daysFromStart so we can batch updates
  const byOffset = new Map<number, string[]>()
  for (const task of tasks) {
    const template = templateMap.get(task.templateId)
    if (!template) continue
    const ids = byOffset.get(template.daysFromStart) ?? []
    ids.push(task.id)
    byOffset.set(template.daysFromStart, ids)
  }

  const entries = [...byOffset.entries()]
  const updated = entries.reduce((sum, [, ids]) => sum + ids.length, 0)

  await prisma.$transaction(
    entries.map(([offset, ids]) =>
      prisma.onboardingTask.updateMany({
        where: { id: { in: ids } },
        data: { dueDate: addDays(newStartDate, offset) },
      }),
    ),
  )

  return updated
}
