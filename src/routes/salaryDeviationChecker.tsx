import { createFileRoute } from '@tanstack/react-router'
import prisma from '@/db'
import { fetchDeelEmployees } from './syncDeelEmployees'

const fetchDeelContract = async (id: string) => {
  const response = await fetch(
    `https://api.letsdeel.com/rest/v2/contracts/${id}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.DEEL_API_KEY}`,
      },
    },
  )

  if (response.status !== 200) {
    throw new Error(`Failed to fetch contract: ${response.statusText}`)
  }

  const data = await response.json()

  return data.data
}

export const Route = createFileRoute('/salaryDeviationChecker')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get('Authorization')?.split(' ')[1]
        if (token !== process.env.SYNC_ENDPOINT_KEY) {
          return new Response('Unauthorized', { status: 401 })
        }

        const deelEmployees = await fetchDeelEmployees()
        const employees = await prisma.employee.findMany({
          where: {
            salaries: { some: {} },
            deelEmployee: { isNot: null },
          },
          include: {
            salaries: {
              orderBy: {
                timestamp: 'desc',
              },
            },
          },
          orderBy: {
            salaryDeviationCheckedAt: 'asc',
          },
          take: 20,
        })

        const results: Array<{
          id: string
          email: string
          salary: number
          deelSalary: number
          deviation: number
          deviationPercentage: number
          compensation_details: any
          team: string
        }> = []
        const errors: Array<string> = []

        for (const employee of employees) {
          try {
            const localDeelEmployee = deelEmployees.find(
              (x) => x.workEmail === employee.email,
            )
            const { compensation_details } = await fetchDeelContract(
              localDeelEmployee?.contractId ?? '',
            )

            const calcDeelSalary = (compensation_details: any) => {
              if (compensation_details.gross_annual_salary != 0) {
                return Number(compensation_details.gross_annual_salary)
              }

              if (compensation_details.scale === 'monthly') {
                return Number(compensation_details.amount) * 12
              }
              return Number(compensation_details.amount)
            }

            results.push({
              id: employee.id,
              email: employee.email,
              salary: employee.salaries[0].actualSalaryLocal,
              deelSalary: calcDeelSalary(compensation_details),
              deviation:
                employee.salaries[0].actualSalaryLocal -
                calcDeelSalary(compensation_details),
              deviationPercentage:
                Math.abs(
                  employee.salaries[0].actualSalaryLocal -
                    calcDeelSalary(compensation_details),
                ) / employee.salaries[0].actualSalaryLocal,
              compensation_details: compensation_details,
              team: localDeelEmployee?.team ?? '',
            })
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error'
            errors.push(
              `Error processing employee ${employee.email}: ${errorMessage}`,
            )
          }
        }

        const checkedAt = new Date()
        await prisma.$transaction(
          results.map((result) => {
            const salaryDeviation =
              result.deviationPercentage > 0.001 &&
              result.compensation_details.currency_code !== 'GBP'

            return prisma.employee.update({
              where: { id: result.id },
              data: {
                salaryDeviationStatus: salaryDeviation ? 'DEVIATED' : 'IN_SYNC',
                salaryDeviationCheckedAt: checkedAt,
              },
            })
          }),
        )

        // console.log({
        //   filteredResults: results
        //     .filter(
        //       (x) =>
        //         x.deviationPercentage > 0.001 &&
        //         x.compensation_details.currency_code !== 'GBP',
        //     )
        //     .map((x) => ({
        //       deelSalary: x.deelSalary,
        //       deviation: x.deviation,
        //       deviationPercentage: x.deviationPercentage,
        //       email: x.email,
        //       salary: x.salary,
        //       currency: x.compensation_details.currency_code,
        //       team: x.team,
        //     })),
        //   errors,
        // })

        return new Response('OK')
      },
    },
  },
})
