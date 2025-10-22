import { createFileRoute } from '@tanstack/react-router'
import prisma from '@/db'
import { KeeperTestJobPayload } from './runScheduledJobs'

export const Route = createFileRoute('/sendKeeperTests')({
    server: {
        handlers: {
            POST: async ({ request }) => {
                const token = request.headers.get('Authorization')?.split(' ')[1]
                if (token !== process.env.SYNC_ENDPOINT_KEY) {
                    return new Response('Unauthorized' + token, { status: 401 })
                }

                const employees = await prisma.employee.findMany({
                    include: {
                        deelEmployee: {
                            include: {
                                manager: true,
                            }
                        }
                    },
                    where: {
                        deelEmployee: {
                            team: {
                                not: 'Blitzscale'
                            }
                        }
                    }
                })

                await prisma.cyclotronJob.createMany({
                    data: employees
                        .map(employee => {
                            if (!employee.deelEmployee?.manager || !employee.deelEmployee?.manager?.workEmail) {
                                return null
                            }
                            return {
                                queue_name: 'send_keeper_test',
                                data: JSON.stringify({
                                    employee: {
                                        id: employee.id,
                                        email: employee.email,
                                        name: employee.deelEmployee?.name,
                                    },
                                    manager: {
                                        id: employee.deelEmployee?.manager?.id,
                                        email: employee.deelEmployee?.manager?.workEmail,
                                        name: employee.deelEmployee?.manager?.name,
                                    },
                                } satisfies KeeperTestJobPayload),
                            }
                        }).filter(emp => emp !== null),
                })

                return new Response(JSON.stringify({
                    success: true,
                    count: employees.length,
                }))
            },
        },
    },
})