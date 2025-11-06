import { createFileRoute } from '@tanstack/react-router'
import prisma from '@/db'
import { KeeperTestJobPayload } from './runScheduledJobs'

export const Route = createFileRoute('/scheduleCheckIns')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get('Authorization')?.split(' ')[1]
        if (token !== process.env.SYNC_ENDPOINT_KEY) {
          return new Response('Unauthorized' + token, { status: 401 })
        }

        const checkIn30DaysEmployees = await prisma.employee.findMany({
          include: {
            deelEmployee: {
              include: {
                manager: true,
              },
            },
          },
          where: {
            checkIn30DaysScheduled: false,
            deelEmployee: {
              startDate: {
                lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
              team: {
                not: 'Blitzscale',
              },
            },
          },
        })

        const checkIn60DaysEmployees = await prisma.employee.findMany({
          include: {
            deelEmployee: {
              include: {
                manager: true,
              },
            },
          },
          where: {
            checkIn60DaysScheduled: false,
            deelEmployee: {
              startDate: {
                lte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
              },
              team: {
                not: 'Blitzscale',
              },
            },
          },
        })

        const checkIn80DaysEmployees = await prisma.employee.findMany({
          include: {
            deelEmployee: {
              include: {
                manager: true,
              },
            },
          },
          where: {
            checkIn80DaysScheduled: false,
            deelEmployee: {
              startDate: {
                lte: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000),
              },
              team: {
                not: 'Blitzscale',
              },
            },
          },
        })

        const employees = [
          ...checkIn30DaysEmployees.map((employee) => ({
            ...employee,
            title: '30 Day check-in',
          })),
          ...checkIn60DaysEmployees.map((employee) => ({
            ...employee,
            title: '60 Day check-in',
          })),
          ...checkIn80DaysEmployees.map((employee) => ({
            ...employee,
            title: '80 Day check-in',
          })),
        ]

        const result = await prisma.cyclotronJob.createMany({
          data: employees
            .map((employee) => {
              if (
                !employee.deelEmployee?.manager ||
                !employee.deelEmployee?.manager?.workEmail
              ) {
                return null
              }
              return {
                queue_name: 'send_keeper_test' as const,
                data: JSON.stringify({
                  title: employee.title,
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
            })
            .filter((emp) => emp !== null),
        })

        await prisma.employee.updateMany({
          where: {
            id: {
              in: checkIn30DaysEmployees.map((employee) => employee.id),
            },
          },
          data: {
            checkIn30DaysScheduled: true,
          },
        })

        await prisma.employee.updateMany({
          where: {
            id: {
              in: checkIn60DaysEmployees.map((employee) => employee.id),
            },
          },
          data: {
            checkIn60DaysScheduled: true,
          },
        })

        await prisma.employee.updateMany({
          where: {
            id: {
              in: checkIn80DaysEmployees.map((employee) => employee.id),
            },
          },
          data: {
            checkIn80DaysScheduled: true,
          },
        })

        return new Response(
          JSON.stringify({
            success: true,
            count: result.count,
          }),
        )
      },
    },
  },
})
