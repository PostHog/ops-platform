import { z } from 'zod'
import prisma from '@/db'
import { defineTool } from '../types'
import { sfBenchmark, SALARY_LEVEL_OPTIONS } from '@/lib/utils'

export const calculateCompScenario = defineTool({
  name: 'calculateCompScenario',
  description:
    'Calculate the compensation impact of changing location factors or other parameters. Use this to model "what if" scenarios like raising the location factor floor.',
  parameters: z.object({
    scenario: z
      .enum(['location_factor_floor', 'level_change', 'benchmark_update'])
      .describe('The type of scenario to model'),
    newLocationFactorFloor: z
      .number()
      .min(0.5)
      .max(1.0)
      .optional()
      .describe(
        'For location_factor_floor scenario: the new minimum location factor (e.g., 0.8)',
      ),
    targetBenchmark: z
      .string()
      .optional()
      .describe('Filter to employees with this benchmark/role'),
    targetCountry: z
      .string()
      .optional()
      .describe('Filter to employees in this country'),
    levelChange: z
      .number()
      .optional()
      .describe('For level_change scenario: the level multiplier change'),
  }),
  execute: async (params) => {
    // Get all employees with their latest salaries
    const employees = await prisma.employee.findMany({
      include: {
        deelEmployee: {
          select: { firstName: true, lastName: true, team: true },
        },
        salaries: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    })

    const employeesWithSalary = employees.filter((e) => e.salaries.length > 0)

    // Apply filters
    let filtered = employeesWithSalary
    if (params.targetBenchmark) {
      filtered = filtered.filter((e) =>
        e.salaries[0].benchmark
          .toLowerCase()
          .includes(params.targetBenchmark!.toLowerCase()),
      )
    }
    if (params.targetCountry) {
      filtered = filtered.filter((e) =>
        e.salaries[0].country
          .toLowerCase()
          .includes(params.targetCountry!.toLowerCase()),
      )
    }

    if (params.scenario === 'location_factor_floor') {
      if (!params.newLocationFactorFloor) {
        return { error: 'newLocationFactorFloor is required for this scenario' }
      }

      const floor = params.newLocationFactorFloor
      const affected = filtered.filter(
        (e) => e.salaries[0].locationFactor < floor,
      )

      const breakdown = affected.map((e) => {
        const salary = e.salaries[0]
        const currentFactor = salary.locationFactor
        const sfBenchmarkAmount =
          sfBenchmark[salary.benchmark as keyof typeof sfBenchmark] || 0

        // Calculate new salary with the floor factor
        const levelMultiplier =
          SALARY_LEVEL_OPTIONS.find((l) => l.value === salary.level)?.value ||
          salary.level
        const currentSalary = salary.totalSalary
        const newSalary =
          sfBenchmarkAmount *
          levelMultiplier *
          salary.benchmarkFactor *
          floor *
          salary.step

        return {
          employeeId: e.id,
          name: e.deelEmployee
            ? `${e.deelEmployee.firstName} ${e.deelEmployee.lastName}`
            : e.email,
          team: e.deelEmployee?.team,
          benchmark: salary.benchmark,
          country: salary.country,
          currentLocationFactor: currentFactor,
          newLocationFactor: floor,
          currentSalary: Math.round(currentSalary),
          newSalary: Math.round(newSalary),
          increase: Math.round(newSalary - currentSalary),
          increasePercentage:
            Math.round(((newSalary - currentSalary) / currentSalary) * 10000) /
            100,
        }
      })

      const totalCurrentCost = breakdown.reduce(
        (sum, e) => sum + e.currentSalary,
        0,
      )
      const totalNewCost = breakdown.reduce((sum, e) => sum + e.newSalary, 0)

      return {
        scenario: 'location_factor_floor',
        newFloor: floor,
        summary: {
          totalEmployeesAnalyzed: filtered.length,
          employeesAffected: affected.length,
          totalCurrentCost,
          totalNewCost,
          totalIncrease: totalNewCost - totalCurrentCost,
          averageIncreasePerEmployee:
            affected.length > 0
              ? Math.round((totalNewCost - totalCurrentCost) / affected.length)
              : 0,
        },
        affectedEmployees: breakdown.sort((a, b) => b.increase - a.increase),
      }
    }

    return { error: `Scenario '${params.scenario}' not yet implemented` }
  },
})

export const analyzeTeamCompensation = defineTool({
  name: 'analyzeTeamCompensation',
  description:
    'Analyze compensation distribution for a team or the entire organization. Groups data by level, location, or benchmark.',
  parameters: z.object({
    team: z.string().optional().describe('Filter to a specific team'),
    groupBy: z
      .enum(['level', 'location', 'benchmark', 'team'])
      .default('team')
      .describe('How to group the analysis'),
  }),
  execute: async (params) => {
    const employees = await prisma.employee.findMany({
      where: params.team
        ? {
            deelEmployee: {
              team: { contains: params.team, mode: 'insensitive' },
            },
          }
        : undefined,
      include: {
        deelEmployee: {
          select: { firstName: true, lastName: true, team: true },
        },
        salaries: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    })

    const employeesWithSalary = employees.filter((e) => e.salaries.length > 0)

    const groupKey = (e: (typeof employeesWithSalary)[0]): string => {
      const salary = e.salaries[0]
      switch (params.groupBy) {
        case 'level':
          return `Level ${salary.level}`
        case 'location':
          return salary.country
        case 'benchmark':
          return salary.benchmark
        case 'team':
          return e.deelEmployee?.team || 'Unknown'
        default:
          return 'All'
      }
    }

    const groups: Record<
      string,
      {
        count: number
        totalSalary: number
        salaries: number[]
        locationFactors: number[]
      }
    > = {}

    for (const emp of employeesWithSalary) {
      const key = groupKey(emp)
      if (!groups[key]) {
        groups[key] = { count: 0, totalSalary: 0, salaries: [], locationFactors: [] }
      }
      groups[key].count++
      groups[key].totalSalary += emp.salaries[0].totalSalary
      groups[key].salaries.push(emp.salaries[0].totalSalary)
      groups[key].locationFactors.push(emp.salaries[0].locationFactor)
    }

    const analysis = Object.entries(groups)
      .map(([group, data]) => {
        const sortedSalaries = [...data.salaries].sort((a, b) => a - b)
        const median =
          sortedSalaries.length % 2 === 0
            ? (sortedSalaries[sortedSalaries.length / 2 - 1] +
                sortedSalaries[sortedSalaries.length / 2]) /
              2
            : sortedSalaries[Math.floor(sortedSalaries.length / 2)]

        return {
          group,
          employeeCount: data.count,
          totalCompensation: Math.round(data.totalSalary),
          averageSalary: Math.round(data.totalSalary / data.count),
          medianSalary: Math.round(median),
          minSalary: Math.round(Math.min(...data.salaries)),
          maxSalary: Math.round(Math.max(...data.salaries)),
          averageLocationFactor:
            Math.round(
              (data.locationFactors.reduce((a, b) => a + b, 0) /
                data.locationFactors.length) *
                100,
            ) / 100,
        }
      })
      .sort((a, b) => b.totalCompensation - a.totalCompensation)

    return {
      groupedBy: params.groupBy,
      teamFilter: params.team || 'All',
      totalEmployees: employeesWithSalary.length,
      totalCompensation: Math.round(
        employeesWithSalary.reduce((sum, e) => sum + e.salaries[0].totalSalary, 0),
      ),
      groups: analysis,
    }
  },
})

export const computationTools = {
  calculateCompScenario,
  analyzeTeamCompensation,
}
