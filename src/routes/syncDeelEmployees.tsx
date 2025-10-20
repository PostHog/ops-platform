import { createFileRoute } from '@tanstack/react-router'
import prisma from '@/db'
import { DeelEmployee } from 'generated/prisma/client'

const getDeelEmployees = async () => {
    let cursor = 1
    let allUsers: DeelEmployee[] = []
    let hasMore = true

    while (hasMore) {
        const response = await fetch(`https://api.letsdeel.com/scim/v2/Users?startIndex=${cursor}&count=100`, {
            headers: {
                'Authorization': `Bearer ${process.env.DEEL_API_KEY}`,
                'Content-Type': 'application/json',
            },
        })
        if (response.status !== 200) {
            throw new Error(`Failed to fetch employees: ${response.statusText}`)
        }
        const data = await response.json()
        allUsers = [
            ...allUsers,
            ...data.Resources
                .filter((employee: any) => employee.active && employee['urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'].customFields.full_time_headcount === 'Full-Time')
                .map((employee: any) => ({
                    id: employee.id,
                    name: employee.name.givenName + " " + employee.name.familyName,
                    title: employee.title,
                    workEmail: employee.emails.find((email: { type: string, value: string }) => email.type === 'work')?.value,
                    team: employee["urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"].department,
                    managerId: employee["urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"].manager.value,
                }))]
        hasMore = data.totalResults > 100
        cursor += 100
    }

    const getManager = (id: string | null) => {
        const employee = allUsers.find(employee => employee.id === id)
        if (employee?.managerId && employee.team !== 'Blitzscale') {
            return getManager(employee.managerId)
        }
        return employee
    }

    allUsers = allUsers.map(employee => ({
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

                const deelEmployees = await getDeelEmployees()

                const emailsToUpsert = Array.from(new Set(
                    deelEmployees
                        .map(emp => emp.workEmail)
                        .filter((email) => email != null)
                ))

                await Promise.all(
                    emailsToUpsert.map(email =>
                        prisma.employee.upsert({
                            where: { email },
                            create: {
                                email,
                                priority: 'low',
                                reviewd: false,
                            },
                            update: {},
                        })
                    )
                )

                await prisma.deelEmployee.deleteMany({})

                await prisma.deelEmployee.createMany({
                    data: deelEmployees.map(emp => ({
                        id: emp.id,
                        name: emp.name,
                        title: emp.title,
                        team: emp.team,
                        workEmail: emp.workEmail,
                        managerId: null,
                        topLevelManagerId: null,
                    })),
                })

                Promise.allSettled(deelEmployees.map(emp =>
                    prisma.deelEmployee.update({
                        where: { id: emp.id },
                        data: {
                            managerId: emp.managerId,
                            topLevelManagerId: emp.topLevelManagerId,
                        }
                    })
                ))

                return new Response('OK')
            },
        },
    },
})