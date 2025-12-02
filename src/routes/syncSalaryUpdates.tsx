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

export const Route = createFileRoute('/syncSalaryUpdates')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get('Authorization')?.split(' ')[1]
        if (token !== process.env.SYNC_ENDPOINT_KEY) {
          return new Response('Unauthorized', { status: 401 })
        }

        const salaries = await prisma.salary.findMany({
          where: {
            synced: false,
            communicated: true,
          },
          include: {
            employee: {
              include: {
                deelEmployee: true,
                salaries: {
                  take: 2,
                  orderBy: {
                    timestamp: 'desc',
                  },
                },
              },
            },
          },
        })

        const errors: string[] = []
        const results: { salaryId: string; result: any; email: string }[] = []

        for (const salary of salaries) {
          try {
            if (!salary.employee.deelEmployee) {
              throw new Error(`No deel employee found`)
            }
            const deelEmployee = await fetchDeelEmployee(
              salary.employee.deelEmployee.id,
            )
            const {
              id: contractId,
              hiring_type,
              payment: compensation_details,
            } = deelEmployee.employments.filter(
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

            // only update salary if the previous salary matches
            if (
              Math.abs(
                getAnnualSalary(compensation_details) /
                  salary.employee.salaries[1].actualSalaryLocal -
                  1,
              ) > 0.001
            ) {
              throw new Error('Previous salary does not match')
            }

            if (hiring_type === 'direct_employee') {
              const response = await fetch(
                `https://api.letsdeel.com/rest/v2/gp/workers/${deelEmployee.id}/compensation`,
                {
                  method: 'PATCH',
                  headers: {
                    Authorization: `Bearer ${process.env.DEEL_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    data: {
                      scale: 'YEAR',
                      effective_date: new Date().toISOString().split('T')[0],
                      salary: salary.employee.salaries[0].actualSalaryLocal,
                    },
                  }),
                },
              )

              if (response.status !== 200) {
                throw new Error(
                  `Failed to update direct employee compensation: ${response.statusText}`,
                )
              }

              const data = await response.json()
              results.push({
                salaryId: salary.id,
                result: data,
                email: salary.employee.email,
              })
            } else if (hiring_type === 'eor') {
              const response = await fetch(
                `https://api.letsdeel.com/rest/v2/eor/contracts/${contractId}/amendments`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${process.env.DEEL_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    data: {
                      salary: salary.employee.salaries[0].actualSalaryLocal,
                      effective_date: new Date().toISOString().split('T')[0],
                    },
                  }),
                },
              )

              if (response.status !== 201) {
                throw new Error(
                  `Failed to update EOR contract: ${response.statusText}`,
                )
              }

              const data = await response.json()
              console.log(data)
            } else if (hiring_type === 'contractor') {
              const response = await fetch(
                `https://api.letsdeel.com/rest/v2/contracts/${contractId}/amendments`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${process.env.DEEL_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    data: {
                      scale: 'monthly',
                      amount:
                        salary.employee.salaries[0].actualSalaryLocal / 12,
                    },
                  }),
                },
              )

              if (response.status !== 201) {
                throw new Error(
                  `Failed to update contractor contract: ${response.statusText}`,
                )
              }

              const data = await response.json()
              console.log(data)
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error'
            errors.push(
              `Error processing employee ${salary.employee.email}: ${errorMessage}`,
            )
          }
        }

        if (errors.length > 0) {
          console.log(errors)
        }

        for (const { result, salaryId, email } of results) {
          console.log(result, email)
          await prisma.salary.update({
            where: { id: salaryId },
            data: { synced: true },
          })
        }

        return new Response('OK')
      },
    },
  },
})
