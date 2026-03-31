import prisma from '@/db'
import {
  getApplicableTemplates,
  ONBOARDING_TASK_TEMPLATES,
} from './onboarding-task-templates'
import type { OnboardingTaskAssigneeType } from '@prisma/client'

// ─── Assignee email resolution ───────────────────────────────────────────────

const ASSIGNEE_EMAILS: Partial<
  Record<OnboardingTaskAssigneeType, string | undefined>
> = {
  ops: process.env.OPS_EMAIL,
  kendal: process.env.KENDAL_EMAIL,
  hector: process.env.HECTOR_EMAIL,
  scott: process.env.SCOTT_EMAIL,
}

async function resolveAssigneeEmails(
  assigneeTypes: OnboardingTaskAssigneeType[],
  managerId: string | null,
): Promise<Map<OnboardingTaskAssigneeType, string | null>> {
  const unique = [...new Set(assigneeTypes)]
  const result = new Map<OnboardingTaskAssigneeType, string | null>()

  for (const type of unique) {
    if (type === 'new_hire') {
      result.set(type, null)
    } else if (type === 'manager' && managerId) {
      const manager = await prisma.employee.findUnique({
        where: { id: managerId },
        select: { email: true },
      })
      result.set(type, manager?.email ?? null)
    } else {
      result.set(type, ASSIGNEE_EMAILS[type] ?? null)
    }
  }

  return result
}

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
    managerId: string | null
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

  const emailMap = await resolveAssigneeEmails(
    templatesToCreate.map((t) => t.assigneeType),
    record.managerId,
  )

  const newTasks = templatesToCreate.map((t) => ({
    onboardingRecordId: recordId,
    templateId: t.id,
    description: t.description,
    assigneeType: t.assigneeType,
    assigneeEmail: emailMap.get(t.assigneeType) ?? null,
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
    managerId: string | null
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

  let updated = 0
  await prisma.$transaction(
    [...byOffset.entries()].map(([offset, ids]) => {
      updated += ids.length
      return prisma.onboardingTask.updateMany({
        where: { id: { in: ids } },
        data: { dueDate: addDays(newStartDate, offset) },
      })
    }),
  )

  return updated
}
