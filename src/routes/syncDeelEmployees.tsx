import { createFileRoute } from '@tanstack/react-router'
import type { DeelEmployee } from '@prisma/client'
import prisma from '@/db'

type FetchedDeelEmployee = DeelEmployee & {
  customFields: {
    level: string
    step: string
    country: string
    area: string
    role: string
  }
  contractId: string
}

export const fetchDeelEmployees = async () => {
  let cursor = 1
  let allUsers: Array<FetchedDeelEmployee> = []
  let hasMore = true

  while (hasMore) {
    const response = await fetch(
      `https://api.letsdeel.com/scim/v2/Users?startIndex=${cursor}&count=100`,
      {
        headers: {
          Authorization: `Bearer ${process.env.DEEL_API_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    )
    if (response.status !== 200) {
      throw new Error(`Failed to fetch employees: ${response.statusText}`)
    }
    const data = await response.json()
    allUsers = [
      ...allUsers,
      ...data.Resources.filter(
        (employee: any) =>
          employee.active &&
          employee['urn:ietf:params:scim:schemas:extension:enterprise:2.0:User']
            .customFields.full_time_headcount === 'Full-Time' &&
          !['inactive', 'no_active_contracts'].includes(
            employee['urn:ietf:params:scim:schemas:extension:2.0:User']
              .hiringStatus,
          ),
      ).map((employee: any) => ({
        id: employee.id,
        name:
          (employee['urn:ietf:params:scim:schemas:extension:2.0:User']
            ?.preferredFirstName || employee.name.givenName) +
          ' ' +
          (employee['urn:ietf:params:scim:schemas:extension:2.0:User']
            ?.preferredLastName || employee.name.familyName),
        title: employee.title,
        workEmail: employee.emails.find(
          (email: { type: string; value: string }) => email.type === 'work',
        )?.value,
        team:
          employee[
            'urn:ietf:params:scim:schemas:extension:2.0:User'
          ].organizationalStructures.filter(
            (structure: { name: string }) =>
              !['S&M', 'R&D/Tech', 'G&A'].includes(structure.name),
          )[0]?.name ?? '',
        managerId:
          employee['urn:ietf:params:scim:schemas:extension:enterprise:2.0:User']
            .manager.value,
        startDate: new Date(
          employee['urn:ietf:params:scim:schemas:extension:2.0:User'].startDate,
        ),
        customFields:
          employee['urn:ietf:params:scim:schemas:extension:enterprise:2.0:User']
            .customFields,
        contractId:
          employee['urn:ietf:params:scim:schemas:extension:2.0:User']
            .employments[0].contractId,
      })),
    ]
    hasMore = data.totalResults > 100
    cursor += 100
  }

  const getManager = (id: string | null) => {
    const employee = allUsers.find((employee) => employee.id === id)
    if (employee?.managerId && employee.team !== 'Blitzscale') {
      return getManager(employee.managerId)
    }
    return employee
  }

  allUsers = allUsers.map((employee) => ({
    ...employee,
    topLevelManagerId: getManager(employee.managerId)?.id ?? '',
  }))

  return allUsers
}

export const Route = createFileRoute('/syncDeelEmployees')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get('Authorization')?.split(' ')[1]
        if (token !== process.env.SYNC_ENDPOINT_KEY) {
          return new Response('Unauthorized' + token, { status: 401 })
        }

        const deelEmployees = await fetchDeelEmployees()

        await prisma.employee.createMany({
          data: deelEmployees
            .filter(({ workEmail }) => workEmail)
            .map(({ workEmail, startDate }) => ({
              email: workEmail ?? '',
              priority: 'low',
              reviewed: false,
              checkIn30DaysScheduled:
                startDate < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              checkIn60DaysScheduled:
                startDate < new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
              checkIn80DaysScheduled:
                startDate < new Date(Date.now() - 80 * 24 * 60 * 60 * 1000),
            })),
          skipDuplicates: true,
        })

        await prisma.deelEmployee.deleteMany({})

        await prisma.deelEmployee.createMany({
          data: deelEmployees.map((emp) => ({
            id: emp.id,
            name: emp.name,
            title: emp.title,
            team: emp.team,
            workEmail: emp.workEmail,
            managerId: null,
            topLevelManagerId: null,
            startDate: emp.startDate,
          })),
        })

        await Promise.allSettled(
          deelEmployees.map((emp) =>
            prisma.deelEmployee.update({
              where: { id: emp.id },
              data: {
                managerId: emp.managerId,
                topLevelManagerId: emp.topLevelManagerId,
              },
            }),
          ),
        )

        return new Response('OK')
      },
    },
  },
})
