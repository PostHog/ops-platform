import { createFileRoute } from '@tanstack/react-router'
import prisma from '@/db'

const fetchDeelEmployee = async (id: string) => {
  const response = await fetch(
    `https://api.letsdeel.com/rest/v2/people/${id}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.DEEL_API_KEY}`,
      },
    },
  )

  if (response.status !== 200) {
    throw new Error(`Failed to fetch employee: ${response.statusText}`)
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
            deelEmployee: true,
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
            if (!employee.deelEmployee) {
              throw new Error(`No deel employee found`)
            }
            const deelEmployee = await fetchDeelEmployee(
              employee.deelEmployee.id,
            )

            const { payment: compensation_details } =
              deelEmployee.employments.filter(
                (x: any) => x.hiring_status === 'active',
              )[0]

            const getAnnualSalary = (compensation_details: {
              rate: number
              scale: 'annual' | 'monthly'
              currency: string
            }) => {
              if (compensation_details.scale === 'annual') {
                return compensation_details.rate
              }
              return compensation_details.rate * 12
            }

            results.push({
              id: employee.id,
              email: employee.email,
              salary: employee.salaries[0].actualSalaryLocal,
              deelSalary: getAnnualSalary(compensation_details),
              deviation:
                employee.salaries[0].actualSalaryLocal -
                getAnnualSalary(compensation_details),
              deviationPercentage:
                Math.abs(
                  employee.salaries[0].actualSalaryLocal -
                    getAnnualSalary(compensation_details),
                ) / employee.salaries[0].actualSalaryLocal,
              compensation_details: compensation_details,
              team: employee.deelEmployee.team,
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
            console.log(result)
            const salaryDeviation = result.deviationPercentage > 0.001

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
        //         x.deviationPercentage > 0.001
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

        if (errors.length > 0) {
          console.log(errors)
        }

        return new Response('OK')
      },
    },
  },
})
