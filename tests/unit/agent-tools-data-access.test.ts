import { describe, expect, it } from 'vitest'
import mockPrisma from '../mocks/prisma'
import {
  readEmployees,
  readSalaryHistory,
  readProposedHires,
  readOrgStructure,
  readCompensationBenchmarks,
} from '@/lib/agents/tools/data-access'

const mockContext = {
  userId: 'user-1',
  userRole: 'admin',
  userEmail: 'admin@posthog.com',
  conversationId: 'conv-1',
  agentId: 'agent-1',
}

// ─── readEmployees ──────────────────────────────────────────────────────────

describe('readEmployees', () => {
  it('returns mapped employee data', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      {
        id: 'emp-1',
        email: 'alice@posthog.com',
        deelEmployee: {
          firstName: 'Alice',
          lastName: 'Smith',
          title: 'Engineer',
          team: 'Product',
          startDate: new Date(),
          managerId: null,
        },
        salaries: [
          {
            totalSalary: 150000,
            locationFactor: 1.0,
            country: 'US',
            area: 'SF',
            level: 1,
            step: 1,
            benchmark: 'Product Engineer',
            benchmarkFactor: 1,
            localCurrency: 'USD',
            totalSalaryLocal: 150000,
          },
        ],
      },
    ])

    const result = await readEmployees.execute({ limit: 50 }, mockContext)

    expect(result).toHaveLength(1)
    expect((result as Array<Record<string, unknown>>)[0]).toEqual(
      expect.objectContaining({
        id: 'emp-1',
        name: 'Alice Smith',
        team: 'Product',
      }),
    )
  })

  it('uses email as name when no deelEmployee', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      {
        id: 'emp-2',
        email: 'bob@posthog.com',
        deelEmployee: null,
        salaries: [],
      },
    ])

    const result = (await readEmployees.execute(
      { limit: 50 },
      mockContext,
    )) as Array<Record<string, unknown>>
    expect(result[0].name).toBe('bob@posthog.com')
  })

  it('filters by team name', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([])

    await readEmployees.execute({ team: 'Engineering', limit: 50 }, mockContext)

    expect(mockPrisma.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deelEmployee: expect.objectContaining({
            team: { contains: 'Engineering', mode: 'insensitive' },
          }),
        }),
      }),
    )
  })

  it('filters by benchmark after fetch', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      {
        id: 'emp-1',
        email: 'a@posthog.com',
        deelEmployee: null,
        salaries: [{ benchmark: 'Product Engineer', country: 'US' }],
      },
      {
        id: 'emp-2',
        email: 'b@posthog.com',
        deelEmployee: null,
        salaries: [{ benchmark: 'Data Engineer', country: 'US' }],
      },
    ])

    const result = (await readEmployees.execute(
      { benchmark: 'Product', limit: 50 },
      mockContext,
    )) as unknown[]
    expect(result).toHaveLength(1)
  })

  it('filters by country after fetch', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      {
        id: 'emp-1',
        email: 'a@posthog.com',
        deelEmployee: null,
        salaries: [{ benchmark: 'Engineer', country: 'United States' }],
      },
      {
        id: 'emp-2',
        email: 'b@posthog.com',
        deelEmployee: null,
        salaries: [{ benchmark: 'Engineer', country: 'Germany' }],
      },
    ])

    const result = (await readEmployees.execute(
      { country: 'germany', limit: 50 },
      mockContext,
    )) as unknown[]
    expect(result).toHaveLength(1)
  })

  it('returns empty array when managerId has no deel record', async () => {
    mockPrisma.deelEmployee.findFirst.mockResolvedValue(null)

    const result = await readEmployees.execute(
      { managerId: 'emp-99', limit: 50 },
      mockContext,
    )
    expect(result).toEqual([])
  })

  it('filters by managerId when deel record exists', async () => {
    mockPrisma.deelEmployee.findFirst.mockResolvedValue({ id: 'deel-mgr' })
    mockPrisma.employee.findMany.mockResolvedValue([])

    await readEmployees.execute({ managerId: 'emp-1', limit: 50 }, mockContext)

    expect(mockPrisma.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deelEmployee: expect.objectContaining({
            managerId: 'deel-mgr',
          }),
        }),
      }),
    )
  })

  it('returns null for latestSalary when no salaries', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      { id: 'emp-1', email: 'a@posthog.com', deelEmployee: null, salaries: [] },
    ])

    const result = (await readEmployees.execute(
      { limit: 50 },
      mockContext,
    )) as Array<Record<string, unknown>>
    expect(result[0].latestSalary).toBeNull()
  })
})

// ─── readSalaryHistory ──────────────────────────────────────────────────────

describe('readSalaryHistory', () => {
  it('returns salary history with employee info', async () => {
    mockPrisma.salary.findMany.mockResolvedValue([
      {
        id: 'sal-1',
        timestamp: new Date(),
        totalSalary: 150000,
        locationFactor: 1.0,
        country: 'US',
        area: 'SF',
        level: 1,
        step: 1,
        benchmark: 'Engineer',
        benchmarkFactor: 1,
        changePercentage: 0,
        changeAmount: 0,
        notes: '',
        employee: {
          id: 'emp-1',
          email: 'alice@posthog.com',
          deelEmployee: { firstName: 'Alice', lastName: 'Smith' },
        },
      },
    ])

    const result = (await readSalaryHistory.execute(
      { employeeId: 'emp-1', limit: 10 },
      mockContext,
    )) as Record<string, unknown>

    expect(result.employee).toEqual(
      expect.objectContaining({ name: 'Alice Smith' }),
    )
    expect((result.salaryHistory as unknown[]).length).toBe(1)
  })

  it('returns error when no salary records found', async () => {
    mockPrisma.salary.findMany.mockResolvedValue([])

    const result = (await readSalaryHistory.execute(
      { employeeId: 'emp-99', limit: 10 },
      mockContext,
    )) as Record<string, unknown>

    expect(result.error).toBe('No salary records found for this employee')
  })
})

// ─── readProposedHires ──────────────────────────────────────────────────────

describe('readProposedHires', () => {
  it('returns mapped proposed hires', async () => {
    mockPrisma.proposedHire.findMany.mockResolvedValue([
      {
        id: 'ph-1',
        title: 'Senior Engineer',
        priority: 'high',
        hiringProfile: 'Full stack',
        createdAt: new Date(),
        manager: {
          id: 'emp-1',
          email: 'mgr@posthog.com',
          deelEmployee: { firstName: 'Bob', lastName: 'Jones', team: 'Eng' },
        },
        talentPartners: [
          {
            id: 'tp-1',
            email: 'tp@posthog.com',
            deelEmployee: { firstName: 'Carol', lastName: 'Lee' },
          },
        ],
      },
    ])

    const result = (await readProposedHires.execute(
      { limit: 20 },
      mockContext,
    )) as Array<Record<string, unknown>>

    expect(result).toHaveLength(1)
    expect(result[0].manager).toEqual(
      expect.objectContaining({ name: 'Bob Jones', team: 'Eng' }),
    )
    expect(
      (result[0].talentPartners as Array<Record<string, unknown>>)[0].name,
    ).toBe('Carol Lee')
  })

  it('filters by managerId and priority', async () => {
    mockPrisma.proposedHire.findMany.mockResolvedValue([])

    await readProposedHires.execute(
      { managerId: 'emp-1', priority: 'high', limit: 20 },
      mockContext,
    )

    expect(mockPrisma.proposedHire.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { managerId: 'emp-1', priority: 'high' },
      }),
    )
  })
})

// ─── readOrgStructure ───────────────────────────────────────────────────────

describe('readOrgStructure', () => {
  it('builds org tree from top-level managers', async () => {
    // Top-level: no managerId, no topLevelManagerId
    mockPrisma.deelEmployee.findMany
      .mockResolvedValueOnce([
        {
          id: 'deel-1',
          firstName: 'Alice',
          lastName: 'CEO',
          title: 'CEO',
          team: 'Exec',
          startDate: new Date(),
          employee: {
            id: 'emp-1',
            salaries: [{ totalSalary: 300000, locationFactor: 1.0 }],
          },
        },
      ])
      // Direct reports of deel-1 at depth 1
      .mockResolvedValueOnce([])

    const result = (await readOrgStructure.execute(
      { depth: 2 },
      mockContext,
    )) as Array<Record<string, unknown>>

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Alice CEO')
    expect(result[0].directReports).toEqual([])
  })

  it('respects depth limit', async () => {
    // With depth 0, shouldn't recurse
    mockPrisma.deelEmployee.findMany.mockResolvedValueOnce([
      {
        id: 'deel-1',
        firstName: 'A',
        lastName: 'B',
        title: 'CEO',
        team: 'X',
        startDate: null,
        employee: null,
      },
    ])
    // Should NOT query for reports at depth 1 when depth limit is 0
    // But the code checks currentDepth > params.depth, so depth=0 means it will
    // build at depth 0 but not recurse to depth 1
    mockPrisma.deelEmployee.findMany.mockResolvedValueOnce([])

    const result = (await readOrgStructure.execute(
      { depth: 0, rootManagerId: undefined },
      mockContext,
    )) as unknown[]

    expect(result).toHaveLength(1)
  })
})

// ─── readCompensationBenchmarks ─────────────────────────────────────────────

describe('readCompensationBenchmarks', () => {
  it('returns benchmark data without filters', async () => {
    const result = (await readCompensationBenchmarks.execute(
      {},
      mockContext,
    )) as Record<string, unknown>

    expect(result.benchmarks).toBeDefined()
    expect((result.benchmarks as unknown[]).length).toBeGreaterThan(0)
    expect(result.levels).toBeDefined()
    expect(result.steps).toBeDefined()
    expect(result.locationFactors).toBeDefined()
    expect(result.locationFactorRange).toBeDefined()
  })

  it('filters benchmarks by name', async () => {
    const result = (await readCompensationBenchmarks.execute(
      { benchmark: 'product engineer' },
      mockContext,
    )) as Record<string, unknown>

    const benchmarks = result.benchmarks as Array<Record<string, unknown>>
    expect(benchmarks.length).toBeGreaterThan(0)
    for (const b of benchmarks) {
      expect((b.role as string).toLowerCase()).toContain('product engineer')
    }
  })

  it('filters location factors by country', async () => {
    const result = (await readCompensationBenchmarks.execute(
      { country: 'germany' },
      mockContext,
    )) as Record<string, unknown>

    const locations = result.locationFactors as Array<Record<string, unknown>>
    for (const l of locations) {
      expect((l.country as string).toLowerCase()).toContain('germany')
    }
  })

  it('limits location factors to 50 entries', async () => {
    const result = (await readCompensationBenchmarks.execute(
      { country: 'united states' },
      mockContext,
    )) as Record<string, unknown>

    expect((result.locationFactors as unknown[]).length).toBeLessThanOrEqual(50)
  })
})
