import { createFileRoute } from '@tanstack/react-router'
import prisma from '@/db'
import { fetchDeelEmployee } from './syncDeelEmployees'

type BambooEmployee = {
  employeeId: number
  firstName: string
  lastName: string
  email: string
}

export const getBambooEmployees = async (email: string) => {
  const bambooEmployeeResponse = await fetch(
    'https://posthog.bamboohr.com/api/v1/meta/users',
    {
      method: 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.BAMBOO_API_KEY}:x`).toString('base64')}`,
        Accept: 'application/json',
      },
    },
  )

  if (bambooEmployeeResponse.status !== 200) {
    throw new Error(
      `Failed to fetch bamboo employees: ${bambooEmployeeResponse.statusText}`,
    )
  }

  const bambooEmployees = await bambooEmployeeResponse.json()

  const employee = Object.values(bambooEmployees).find(
    (emp: any) => emp.email === email,
  )

  if (!employee) {
    throw new Error(`Employee not found with email: ${email}`)
  }

  return employee as BambooEmployee
}

type BambooCompTable = {
  rate: {
    currency: string
    value: string
  }
}

export const getBambooCompTable = async (employeeId: number) => {
  const compTableResponse = await fetch(
    `https://posthog.bamboohr.com/api/v1/employees/${employeeId}/tables/compensation`,
    {
      method: 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.BAMBOO_API_KEY}:x`).toString('base64')}`,
        Accept: 'application/json',
      },
    },
  )

  if (compTableResponse.status !== 200) {
    throw new Error(
      `Failed to fetch bamboo compensation table: ${compTableResponse.statusText}`,
    )
  }

  const compTable = await compTableResponse.json()

  return compTable as BambooCompTable[]
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
          take: 5,
        })

        const errors: string[] = []
        const results: { salaryId: string; result: any; email: string }[] = []

        for (const salary of salaries) {
          try {
            if (!salary.employee.deelEmployee) {
              throw new Error(`No deel employee found`)
            }
            if (salary.changePercentage > 0.5) {
              throw new Error(`Change percentage is too high`)
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

              const response2 = await fetch(
                `https://api.letsdeel.com/rest/v2/eor/contracts/${contractId}/amendments/${data.data.id}/confirm`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${process.env.DEEL_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    data: {},
                  }),
                },
              )

              if (response2.status !== 200) {
                throw new Error(
                  `Failed to confirm EOR contract amendment: ${response2.statusText}`,
                )
              }

              const data2 = await response2.json()
              results.push({
                salaryId: salary.id,
                result: data2,
                email: salary.employee.email,
              })
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

              const response2 = await fetch(
                `https://api.letsdeel.com/rest/v2/contracts/${contractId}/signatures`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${process.env.DEEL_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    data: {
                      client_signature: process.env.DEEL_SIGNATURE_TEXT,
                    },
                  }),
                },
              )

              if (response2.status !== 201) {
                throw new Error(
                  `Failed to sign contractor contract: ${response2.statusText}`,
                )
              }

              const data2 = await response2.json()
              results.push({
                salaryId: salary.id,
                result: { data, data2 },
                email: salary.employee.email,
              })
            } else if (hiring_type === 'hris_direct_employee') {
              throw new Error(`HRIS direct employee not supported yet`)
            } else if (hiring_type === 'direct_employee') {
              // update the if condition once we moved US payroll over to bamboo
              const employee = await getBambooEmployees(salary.employee.email)
              const compTable = await getBambooCompTable(employee.employeeId)

              if (compTable.length === 0) {
                throw new Error('No compensation table found')
              }

              // only update salary if the previous salary matches
              if (
                Math.abs(
                  Number(compTable[compTable.length - 1].rate.value) /
                    salary.employee.salaries[1].actualSalaryLocal -
                    1,
                ) > 0.001
              ) {
                throw new Error('Previous bamboo salary does not match')
              }

              const salaryUpdateResponse = await fetch(
                `https://posthog.bamboohr.com/api/v1_1/employees/${employee.employeeId}/tables/compensation`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Basic ${Buffer.from(`${process.env.BAMBOO_API_KEY}:x`).toString('base64')}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: null,
                    rate: {
                      currency: 'USD',
                      value:
                        salary.employee.salaries[0].actualSalaryLocal.toString(),
                    },
                    type: 'Salary',
                    exempt: 'Exempt',
                    reason: 'Comp Review',
                    comment: '',
                    paidPer: 'Year',
                    paySchedule: 'Semi Monthly',
                    overtimeRate: {
                      currency: 'USD',
                      value: '',
                    },
                  }),
                },
              )

              if (salaryUpdateResponse.status !== 200) {
                throw new Error(
                  `Failed to update bamboo salary: ${salaryUpdateResponse.statusText}`,
                )
              }

              results.push({
                salaryId: salary.id,
                result: compTable,
                email: salary.employee.email,
              })
            } else {
              throw new Error(`Unknown hiring type: ${hiring_type}`)
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

        for (const { result: _result, salaryId, email: _email } of results) {
          // console.log(_result, _email)
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
