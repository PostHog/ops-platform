import { describe, expect, it } from 'vitest'
import mockPrisma from '../mocks/prisma'
import {
  calculateCompScenario,
  analyzeTeamCompensation,
} from '@/lib/agents/tools/computation'

const mockContext = {
  userId: 'user-1',
  userRole: 'admin',
  userEmail: 'admin@posthog.com',
  conversationId: 'conv-1',
  agentId: 'agent-1',
}

function createEmployeeWithSalary(overrides: Record<string, unknown> = {}) {
  return {
    id: 'emp-1',
    email: 'alice@posthog.com',
    deelEmployee: { firstName: 'Alice', lastName: 'Smith', team: 'Product' },
    salaries: [
      {
        totalSalary: 150000,
        locationFactor: 0.7,
        country: 'Germany',
        area: 'Berlin',
        level: 1,
        step: 1,
        benchmark: 'Product Engineer',
        benchmarkFactor: 1.1,
      },
    ],
    ...overrides,
  }
}

// ─── calculateCompScenario ──────────────────────────────────────────────────

describe('calculateCompScenario', () => {
  it('calculates location_factor_floor scenario', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      createEmployeeWithSalary(),
    ])

    const result = (await calculateCompScenario.execute(
      { scenario: 'location_factor_floor', newLocationFactorFloor: 0.8 },
      mockContext,
    )) as Record<string, unknown>

    expect(result.scenario).toBe('location_factor_floor')
    expect(result.newFloor).toBe(0.8)
    const summary = result.summary as Record<string, unknown>
    expect(summary.employeesAffected).toBe(1)
    expect(summary.totalIncrease).toBeGreaterThan(0)
  })

  it('returns error when newLocationFactorFloor is missing', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([])

    const result = (await calculateCompScenario.execute(
      { scenario: 'location_factor_floor' },
      mockContext,
    )) as Record<string, unknown>

    expect(result.error).toContain('newLocationFactorFloor is required')
  })

  it('only includes employees below the floor', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      createEmployeeWithSalary({ id: 'emp-1' }),
      createEmployeeWithSalary({
        id: 'emp-2',
        salaries: [{ ...createEmployeeWithSalary().salaries[0], locationFactor: 0.9 }],
      }),
    ])

    const result = (await calculateCompScenario.execute(
      { scenario: 'location_factor_floor', newLocationFactorFloor: 0.8 },
      mockContext,
    )) as Record<string, unknown>

    const summary = result.summary as Record<string, unknown>
    expect(summary.employeesAffected).toBe(1) // only emp-1 (0.7 < 0.8)
  })

  it('filters by targetBenchmark', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      createEmployeeWithSalary(),
      createEmployeeWithSalary({
        id: 'emp-2',
        salaries: [{ ...createEmployeeWithSalary().salaries[0], benchmark: 'Data Engineer' }],
      }),
    ])

    const result = (await calculateCompScenario.execute(
      { scenario: 'location_factor_floor', newLocationFactorFloor: 0.8, targetBenchmark: 'Product' },
      mockContext,
    )) as Record<string, unknown>

    const summary = result.summary as Record<string, unknown>
    expect(summary.totalEmployeesAnalyzed).toBe(1)
  })

  it('filters by targetCountry', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      createEmployeeWithSalary(),
      createEmployeeWithSalary({
        id: 'emp-2',
        salaries: [{ ...createEmployeeWithSalary().salaries[0], country: 'United States' }],
      }),
    ])

    const result = (await calculateCompScenario.execute(
      { scenario: 'location_factor_floor', newLocationFactorFloor: 0.8, targetCountry: 'Germany' },
      mockContext,
    )) as Record<string, unknown>

    const summary = result.summary as Record<string, unknown>
    expect(summary.totalEmployeesAnalyzed).toBe(1)
  })

  it('skips employees without salaries', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      { id: 'emp-no-sal', email: 'x@posthog.com', deelEmployee: null, salaries: [] },
      createEmployeeWithSalary(),
    ])

    const result = (await calculateCompScenario.execute(
      { scenario: 'location_factor_floor', newLocationFactorFloor: 0.8 },
      mockContext,
    )) as Record<string, unknown>

    const summary = result.summary as Record<string, unknown>
    expect(summary.totalEmployeesAnalyzed).toBe(1)
  })

  it('returns error for unimplemented scenarios', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([])

    const result = (await calculateCompScenario.execute(
      { scenario: 'level_change' },
      mockContext,
    )) as Record<string, unknown>

    expect(result.error).toContain('not yet implemented')
  })

  it('sorts affected employees by increase descending', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      createEmployeeWithSalary({
        id: 'emp-low',
        salaries: [{ ...createEmployeeWithSalary().salaries[0], locationFactor: 0.5 }],
      }),
      createEmployeeWithSalary({
        id: 'emp-mid',
        salaries: [{ ...createEmployeeWithSalary().salaries[0], locationFactor: 0.7 }],
      }),
    ])

    const result = (await calculateCompScenario.execute(
      { scenario: 'location_factor_floor', newLocationFactorFloor: 0.8 },
      mockContext,
    )) as Record<string, unknown>

    const affected = result.affectedEmployees as Array<Record<string, number>>
    expect(affected[0].increase).toBeGreaterThanOrEqual(affected[1].increase)
  })
})

// ─── analyzeTeamCompensation ────────────────────────────────────────────────

describe('analyzeTeamCompensation', () => {
  it('groups employees by team', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      createEmployeeWithSalary(),
      createEmployeeWithSalary({
        id: 'emp-2',
        deelEmployee: { firstName: 'Bob', lastName: 'B', team: 'Infrastructure' },
        salaries: [{ ...createEmployeeWithSalary().salaries[0], totalSalary: 200000 }],
      }),
    ])

    const result = (await analyzeTeamCompensation.execute(
      { groupBy: 'team' },
      mockContext,
    )) as Record<string, unknown>

    expect(result.totalEmployees).toBe(2)
    const groups = result.groups as Array<Record<string, unknown>>
    expect(groups.length).toBe(2)
  })

  it('groups by level', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      createEmployeeWithSalary(),
    ])

    const result = (await analyzeTeamCompensation.execute(
      { groupBy: 'level' },
      mockContext,
    )) as Record<string, unknown>

    const groups = result.groups as Array<Record<string, unknown>>
    expect(groups[0].group).toContain('Level')
  })

  it('groups by location', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      createEmployeeWithSalary(),
    ])

    const result = (await analyzeTeamCompensation.execute(
      { groupBy: 'location' },
      mockContext,
    )) as Record<string, unknown>

    const groups = result.groups as Array<Record<string, unknown>>
    expect(groups[0].group).toBe('Germany')
  })

  it('groups by benchmark', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      createEmployeeWithSalary(),
    ])

    const result = (await analyzeTeamCompensation.execute(
      { groupBy: 'benchmark' },
      mockContext,
    )) as Record<string, unknown>

    const groups = result.groups as Array<Record<string, unknown>>
    expect(groups[0].group).toBe('Product Engineer')
  })

  it('calculates correct statistics per group', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      createEmployeeWithSalary({ salaries: [{ ...createEmployeeWithSalary().salaries[0], totalSalary: 100000 }] }),
      createEmployeeWithSalary({ id: 'emp-2', salaries: [{ ...createEmployeeWithSalary().salaries[0], totalSalary: 200000 }] }),
    ])

    const result = (await analyzeTeamCompensation.execute(
      { groupBy: 'team' },
      mockContext,
    )) as Record<string, unknown>

    const groups = result.groups as Array<Record<string, unknown>>
    const group = groups[0]
    expect(group.employeeCount).toBe(2)
    expect(group.averageSalary).toBe(150000)
    expect(group.minSalary).toBe(100000)
    expect(group.maxSalary).toBe(200000)
  })

  it('filters by team name', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([])

    await analyzeTeamCompensation.execute(
      { team: 'Product', groupBy: 'team' },
      mockContext,
    )

    expect(mockPrisma.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deelEmployee: expect.objectContaining({
            team: { contains: 'Product', mode: 'insensitive' },
          }),
        }),
      }),
    )
  })

  it('skips employees without salaries', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      { id: 'emp-no-sal', email: 'x@posthog.com', deelEmployee: null, salaries: [] },
      createEmployeeWithSalary(),
    ])

    const result = (await analyzeTeamCompensation.execute(
      { groupBy: 'team' },
      mockContext,
    )) as Record<string, unknown>

    expect(result.totalEmployees).toBe(1)
  })

  it('sorts groups by total compensation descending', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      createEmployeeWithSalary({
        deelEmployee: { firstName: 'A', lastName: 'A', team: 'Small' },
        salaries: [{ ...createEmployeeWithSalary().salaries[0], totalSalary: 50000 }],
      }),
      createEmployeeWithSalary({
        id: 'emp-2',
        deelEmployee: { firstName: 'B', lastName: 'B', team: 'Big' },
        salaries: [{ ...createEmployeeWithSalary().salaries[0], totalSalary: 300000 }],
      }),
    ])

    const result = (await analyzeTeamCompensation.execute(
      { groupBy: 'team' },
      mockContext,
    )) as Record<string, unknown>

    const groups = result.groups as Array<Record<string, unknown>>
    expect((groups[0].totalCompensation as number)).toBeGreaterThan(groups[1].totalCompensation as number)
  })
})
