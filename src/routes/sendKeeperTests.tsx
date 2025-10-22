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

                const employees = await prisma.deelEmployee.findMany({
                    include: {
                        manager: true,
                    },
                    where: {
                        workEmail: {
                            not: null
                        },
                        team: {
                            not: 'Blitzscale'
                        }
                    }
                })

                await prisma.cyclotronJob.createMany({
                    data: employees
                        .filter((emp): emp is typeof emp & { workEmail: string; manager: { id: string; workEmail: string; name: string } } => 
                            emp.workEmail !== null && emp.manager !== null && emp.manager.workEmail !== null
                        )
                        .map(employee => ({
                            queue_name: 'send_keeper_test',
                            data: JSON.stringify({
                                employee: {
                                    id: employee.id,
                                    email: employee.workEmail,
                                    name: employee.name,
                                },
                                manager: {
                                    id: employee.manager.id,
                                    email: employee.manager.workEmail,
                                    name: employee.manager.name,
                                },
                            } satisfies KeeperTestJobPayload),
                        })),
                })

                return new Response(JSON.stringify({
                    success: true,
                    count: employees.length,
                }))
            },
        },
    },
})