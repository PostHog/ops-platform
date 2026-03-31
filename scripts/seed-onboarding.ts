/**
 * Seed script: fake onboarding data for development
 *
 * Creates OnboardingRecord entries across all 5 statuses, plus a fake
 * DeelEmployee manager they can reference. Tasks are auto-generated
 * from templates based on each record's status.
 *
 * Safe to re-run — deletes existing fake records first, then re-inserts.
 *
 * Usage:
 *   npx tsx scripts/seed-onboarding.ts
 */

import { PrismaClient } from '@prisma/client'
import { getApplicableTemplates } from '../src/lib/onboarding-task-templates'

const prisma = new PrismaClient()

function daysFromToday(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(9, 0, 0, 0)
  return d
}

// A fake manager used by seed records for the manager picker
const FAKE_MANAGER = {
  id: 'seed-manager-001',
  firstName: 'Alex',
  lastName: 'Morgan',
  title: 'Engineering Manager',
  team: 'Platform',
  personalEmail: 'alex.morgan@fake-seed.dev',
  startDate: daysFromToday(-365),
}

// ─── Onboarding records ─────────────────────────────────────────────────────

const SEED_PREFIX = 'seed-tracker-'

const FAKE_RECORDS = [
  {
    id: `${SEED_PREFIX}001`,
    name: 'Kenji Watanabe',
    role: 'Full Stack Engineer',
    team: 'Pipeline',
    startDate: daysFromToday(21),
    location: 'Tokyo, Japan (JST)',
    quarter: '2026-Q2',
    referral: true,
    referredBy: 'Li Wei',
    status: 'offer_accepted' as const,
    notes: 'Relocating from Osaka. Needs visa sponsorship confirmation.',
  },
  {
    id: `${SEED_PREFIX}002`,
    name: 'Elena Vasquez',
    role: 'Product Manager',
    team: 'Feature Success',
    startDate: daysFromToday(10),
    location: 'Mexico City, Mexico (CST)',
    quarter: '2026-Q2',
    referral: false,
    status: 'contract_sent' as const,
    notes: 'Awaiting DocuSign from Tim.',
  },
  {
    id: `${SEED_PREFIX}003`,
    name: 'Marcus Chen',
    role: 'Site Reliability Engineer',
    team: 'Infrastructure',
    startDate: daysFromToday(3),
    location: 'San Francisco, US (PST)',
    quarter: '2026-Q1',
    referral: false,
    status: 'contract_signed' as const,
  },
  {
    id: `${SEED_PREFIX}004`,
    name: 'Fatima Al-Rashid',
    role: 'Data Scientist',
    team: 'Product Analytics',
    startDate: daysFromToday(-2),
    location: 'London, UK (GMT)',
    quarter: '2026-Q1',
    referral: true,
    referredBy: 'James Hawkins',
    status: 'provisioned' as const,
    notes: 'GitHub, Slack, and 1Password provisioned. Laptop shipped.',
  },
  {
    id: `${SEED_PREFIX}005`,
    name: 'Tomasz Nowak',
    role: 'Growth Engineer',
    team: 'Growth',
    startDate: daysFromToday(-14),
    location: 'Warsaw, Poland (CET)',
    quarter: '2026-Q1',
    referral: false,
    status: 'started' as const,
    notes: 'Completed first week. Paired with Ben on onboarding project.',
  },
]

async function main() {
  console.log('🌱 Seeding onboarding data...\n')

  // ── Clean up existing seed data ───────────────────────────────────────────

  const recordIds = FAKE_RECORDS.map((r) => r.id)

  // Tasks must be deleted before records (FK constraint)
  await prisma.onboardingTask.deleteMany({
    where: { onboardingRecordId: { in: recordIds } },
  })
  const deletedRecords = await prisma.onboardingRecord.deleteMany({
    where: { id: { in: recordIds } },
  })
  if (deletedRecords.count > 0) {
    console.log(`🗑️  Removed ${deletedRecords.count} existing seed record(s)`)
  }

  // Upsert the fake DeelEmployee and Employee (needed for the manager relation)
  await prisma.deelEmployee.upsert({
    where: { id: FAKE_MANAGER.id },
    update: {},
    create: FAKE_MANAGER,
  })
  const fakeEmployee = await prisma.employee.upsert({
    where: { email: FAKE_MANAGER.personalEmail },
    update: {},
    create: {
      email: FAKE_MANAGER.personalEmail,
      priority: 'medium',
      reviewed: false,
      checkIn30DaysScheduled: false,
      checkIn60DaysScheduled: false,
      checkIn80DaysScheduled: false,
    },
  })
  console.log(
    `✓ Fake manager: ${FAKE_MANAGER.firstName} ${FAKE_MANAGER.lastName}\n`,
  )

  // ── Create onboarding records ─────────────────────────────────────────────

  for (const record of FAKE_RECORDS) {
    await prisma.onboardingRecord.create({
      data: {
        ...record,
        managerId: fakeEmployee.id,
      },
    })
    const statusLabel = record.status.replace(/_/g, ' ')
    console.log(`✓ ${record.name} (${record.role}) — ${statusLabel}`)
  }

  // ── Generate tasks ────────────────────────────────────────────────────────

  console.log('')

  function addDays(date: Date, days: number): Date {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    result.setHours(9, 0, 0, 0)
    return result
  }

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

  let totalTasks = 0
  for (const record of FAKE_RECORDS) {
    const triggers = STATUS_TRIGGERS[record.status] ?? ['offer_accepted']
    let recordTasks = 0

    for (const trigger of triggers) {
      const templates = getApplicableTemplates(
        trigger,
        record.role,
        record.location ?? null,
      )
      const tasks = templates.map((t) => ({
        onboardingRecordId: record.id,
        templateId: t.id,
        description: t.description,
        assigneeType: t.assigneeType,
        dueDate: addDays(record.startDate, t.daysFromStart),
      }))

      if (tasks.length > 0) {
        await prisma.onboardingTask.createMany({ data: tasks })
        recordTasks += tasks.length
      }
    }

    // Mark some tasks as completed for hires further along
    if (record.status === 'started' || record.status === 'provisioned') {
      const overdueTasks = await prisma.onboardingTask.findMany({
        where: {
          onboardingRecordId: record.id,
          dueDate: { lt: new Date() },
        },
        select: { id: true },
      })
      if (overdueTasks.length > 0) {
        const toComplete = overdueTasks.slice(
          0,
          Math.ceil(overdueTasks.length * 0.75),
        )
        await prisma.onboardingTask.updateMany({
          where: { id: { in: toComplete.map((t) => t.id) } },
          data: { completed: true, completedAt: new Date() },
        })
      }
    }

    console.log(`✓ Generated ${recordTasks} tasks for ${record.name}`)
    totalTasks += recordTasks
  }

  console.log(`\n✅ Done. Visit /onboarding to see all 5 hires with tasks.`)
  console.log(`   ${FAKE_RECORDS.length} hires across all statuses`)
  console.log(`   ${totalTasks} tasks generated`)
  console.log(`\nTo clean up: delete records where id starts with "seed-"`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
