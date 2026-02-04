import { z } from 'zod'
import prisma from '@/db'
import { defineTool } from '../types'

export const readEmployees = defineTool({
  name: 'readEmployees',
  description:
    'Retrieve employee data with optional filters. Returns employee information including their latest salary, location factor, and team.',
  parameters: z.object({
    team: z.string().optional().describe('Filter by team name'),
    benchmark: z.string().optional().describe('Filter by salary benchmark/role'),
    country: z.string().optional().describe('Filter by country'),
    managerId: z.string().optional().describe('Filter by manager employee ID'),
    limit: z
      .number()
      .max(100)
      .default(50)
      .describe('Maximum number of employees to return'),
  }),
  execute: async (params) => {
    const employees = await prisma.employee.findMany({
      where: {
        deelEmployee: params.team
          ? { team: { contains: params.team, mode: 'insensitive' } }
          : undefined,
      },
      include: {
        deelEmployee: {
          select: {
            firstName: true,
            lastName: true,
            title: true,
            team: true,
            workEmail: true,
            startDate: true,
            managerId: true,
          },
        },
        salaries: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
      take: params.limit,
    })

    // Filter by salary-level criteria after fetch
    let filtered = employees
    if (params.benchmark) {
      filtered = filtered.filter((e) =>
        e.salaries[0]?.benchmark
          ?.toLowerCase()
          .includes(params.benchmark!.toLowerCase()),
      )
    }
    if (params.country) {
      filtered = filtered.filter((e) =>
        e.salaries[0]?.country
          ?.toLowerCase()
          .includes(params.country!.toLowerCase()),
      )
    }

    return filtered.map((e) => ({
      id: e.id,
      email: e.email,
      name: e.deelEmployee
        ? `${e.deelEmployee.firstName} ${e.deelEmployee.lastName}`
        : e.email,
      title: e.deelEmployee?.title,
      team: e.deelEmployee?.team,
      startDate: e.deelEmployee?.startDate,
      latestSalary: e.salaries[0]
        ? {
            totalSalary: e.salaries[0].totalSalary,
            locationFactor: e.salaries[0].locationFactor,
            country: e.salaries[0].country,
            area: e.salaries[0].area,
            level: e.salaries[0].level,
            step: e.salaries[0].step,
            benchmark: e.salaries[0].benchmark,
            benchmarkFactor: e.salaries[0].benchmarkFactor,
            localCurrency: e.salaries[0].localCurrency,
            totalSalaryLocal: e.salaries[0].totalSalaryLocal,
          }
        : null,
    }))
  },
})

export const readSalaryHistory = defineTool({
  name: 'readSalaryHistory',
  description:
    'Get salary history for a specific employee. Returns all salary records ordered by date.',
  parameters: z.object({
    employeeId: z.string().describe('The employee ID to get salary history for'),
    limit: z
      .number()
      .max(20)
      .default(10)
      .describe('Maximum number of salary records to return'),
  }),
  execute: async (params) => {
    const salaries = await prisma.salary.findMany({
      where: { employeeId: params.employeeId },
      orderBy: { timestamp: 'desc' },
      take: params.limit,
      include: {
        employee: {
          include: {
            deelEmployee: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    })

    if (salaries.length === 0) {
      return { error: 'No salary records found for this employee' }
    }

    const employee = salaries[0].employee
    return {
      employee: {
        id: employee.id,
        email: employee.email,
        name: employee.deelEmployee
          ? `${employee.deelEmployee.firstName} ${employee.deelEmployee.lastName}`
          : employee.email,
      },
      salaryHistory: salaries.map((s) => ({
        id: s.id,
        timestamp: s.timestamp,
        totalSalary: s.totalSalary,
        locationFactor: s.locationFactor,
        country: s.country,
        area: s.area,
        level: s.level,
        step: s.step,
        benchmark: s.benchmark,
        benchmarkFactor: s.benchmarkFactor,
        changePercentage: s.changePercentage,
        changeAmount: s.changeAmount,
        notes: s.notes,
      })),
    }
  },
})

export const readProposedHires = defineTool({
  name: 'readProposedHires',
  description:
    'Get proposed hires with optional filters. Returns information about planned hiring positions.',
  parameters: z.object({
    managerId: z
      .string()
      .optional()
      .describe('Filter by hiring manager employee ID'),
    priority: z
      .enum(['low', 'medium', 'high', 'pushed_to_next_quarter', 'filled'])
      .optional()
      .describe('Filter by priority level'),
    limit: z
      .number()
      .max(50)
      .default(20)
      .describe('Maximum number of proposed hires to return'),
  }),
  execute: async (params) => {
    const hires = await prisma.proposedHire.findMany({
      where: {
        managerId: params.managerId,
        priority: params.priority,
      },
      include: {
        manager: {
          include: {
            deelEmployee: {
              select: { firstName: true, lastName: true, team: true },
            },
          },
        },
        talentPartners: {
          include: {
            deelEmployee: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: params.limit,
    })

    return hires.map((h) => ({
      id: h.id,
      title: h.title,
      priority: h.priority,
      hiringProfile: h.hiringProfile,
      createdAt: h.createdAt,
      manager: {
        id: h.manager.id,
        name: h.manager.deelEmployee
          ? `${h.manager.deelEmployee.firstName} ${h.manager.deelEmployee.lastName}`
          : h.manager.email,
        team: h.manager.deelEmployee?.team,
      },
      talentPartners: h.talentPartners.map((tp) => ({
        id: tp.id,
        name: tp.deelEmployee
          ? `${tp.deelEmployee.firstName} ${tp.deelEmployee.lastName}`
          : tp.email,
      })),
    }))
  },
})

export const readOrgStructure = defineTool({
  name: 'readOrgStructure',
  description:
    'Get organizational hierarchy. Returns the org structure with manager relationships.',
  parameters: z.object({
    rootManagerId: z
      .string()
      .optional()
      .describe('Start from this manager (DeelEmployee ID). If not provided, returns top-level managers.'),
    depth: z
      .number()
      .max(5)
      .default(2)
      .describe('How many levels deep to traverse'),
  }),
  execute: async (params) => {
    const buildOrgTree = async (
      managerId: string | null,
      currentDepth: number,
    ): Promise<unknown[]> => {
      if (currentDepth > params.depth) return []

      const employees = await prisma.deelEmployee.findMany({
        where: managerId
          ? { managerId }
          : { managerId: null, topLevelManagerId: null },
        include: {
          employee: {
            include: {
              salaries: {
                orderBy: { timestamp: 'desc' },
                take: 1,
              },
            },
          },
        },
      })

      const result = []
      for (const emp of employees) {
        const directReports = await buildOrgTree(emp.id, currentDepth + 1)
        result.push({
          deelEmployeeId: emp.id,
          employeeId: emp.employee?.id,
          name: `${emp.firstName} ${emp.lastName}`,
          title: emp.title,
          team: emp.team,
          startDate: emp.startDate,
          salary: emp.employee?.salaries[0]?.totalSalary,
          locationFactor: emp.employee?.salaries[0]?.locationFactor,
          directReports,
        })
      }
      return result
    }

    return await buildOrgTree(params.rootManagerId ?? null, 0)
  },
})

export const readCompensationBenchmarks = defineTool({
  name: 'readCompensationBenchmarks',
  description:
    'Get compensation benchmark data including SF benchmarks and location factors. Useful for understanding the compensation framework.',
  parameters: z.object({
    benchmark: z
      .string()
      .optional()
      .describe('Filter to a specific role benchmark'),
    country: z
      .string()
      .optional()
      .describe('Filter location factors to a specific country'),
  }),
  execute: async (params) => {
    // Import the benchmark data from utils
    const {
      sfBenchmark,
      locationFactor,
      SALARY_LEVEL_OPTIONS,
      stepModifier,
      roleType,
    } = await import('@/lib/utils')

    let benchmarks = Object.entries(sfBenchmark).map(([role, amount]) => ({
      role,
      sfBenchmarkAmount: amount,
      roleType: roleType[role as keyof typeof roleType],
    }))

    if (params.benchmark) {
      benchmarks = benchmarks.filter((b) =>
        b.role.toLowerCase().includes(params.benchmark!.toLowerCase()),
      )
    }

    let locations = locationFactor
    if (params.country) {
      locations = locations.filter((l) =>
        l.country.toLowerCase().includes(params.country!.toLowerCase()),
      )
    }

    return {
      benchmarks,
      levels: SALARY_LEVEL_OPTIONS,
      steps: stepModifier,
      locationFactors: locations.slice(0, 50), // Limit to avoid huge response
      locationFactorRange: {
        min: Math.min(...locationFactor.map((l) => l.locationFactor)),
        max: Math.max(...locationFactor.map((l) => l.locationFactor)),
      },
    }
  },
})

export const dataAccessTools = {
  readEmployees,
  readSalaryHistory,
  readProposedHires,
  readOrgStructure,
  readCompensationBenchmarks,
}
