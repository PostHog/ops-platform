import { Link } from '@tanstack/react-router'
import { Button } from './ui/button'
import type { Prisma } from '@prisma/client'
import AddProposedHirePanel from './AddProposedHirePanel'
import { ROLES } from '@/lib/consts'
import { useSession } from '@/lib/auth-client'
import { TeamEditPanel } from './TeamEditPanel'
import { ManagerEditPanel } from './ManagerEditPanel'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { getFullName } from '@/lib/utils'

dayjs.extend(relativeTime)

type DeelEmployee = Prisma.DeelEmployeeGetPayload<{
  include: {
    employee: {
      select: {
        id: true
        email: true
      }
    }
    manager: {
      select: {
        id: true
        firstName: true
        lastName: true
      }
    }
  }
}>

type ProposedHire = Prisma.ProposedHireGetPayload<{
  include: {
    manager: {
      select: {
        id: true
        email: true
        deelEmployee: true
      }
    }
    talentPartners: {
      select: {
        id: true
        email: true
        deelEmployee: true
      }
    }
  }
}>

const EmployeePanel = ({
  selectedNode,
  employees,
  proposedHires,
}: {
  selectedNode: string | null
  employees: Array<DeelEmployee>
  proposedHires: Array<ProposedHire>
}) => {
  const { data: session } = useSession()
  const user = session?.user
  const employee = employees.find((employee) => employee.id === selectedNode)
  const proposedHire = proposedHires.find(
    (proposedHire) => proposedHire.id === selectedNode,
  )

  if (!employee && !proposedHire) return null
  return (
    <div className="absolute right-0 m-0 flex h-full max-h-full w-[36rem] flex-col justify-center overflow-hidden p-2 transition-[width]">
      <div
        className="relative z-10 flex max-h-full min-h-48 flex-col overflow-hidden rounded-md bg-white"
        style={{
          border: '1px solid var(--border)',
          boxShadow: '0 3px 0 var(--border)',
        }}
      >
        <div className="p-2">
          <h1 className="mb-4 text-lg font-bold">
            {employee
              ? getFullName(employee.firstName, employee.lastName)
              : proposedHire?.title}
          </h1>
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="space-y-3">
              {employee ? (
                <>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">ID:</span>
                    <span className="text-gray-900">
                      {employee.employee?.id || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Deel ID:</span>
                    <span className="text-gray-900">{employee.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Email:</span>
                    <span className="text-gray-900">
                      {employee.employee?.email || employee.workEmail || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">
                      Start Date:
                    </span>
                    <span className="text-gray-900">
                      {employee.startDate
                        ? `${dayjs(employee.startDate).format('M/D/YYYY')} (${dayjs(employee.startDate).fromNow()})`
                        : 'N/A'}
                    </span>
                  </div>
                </>
              ) : proposedHire ? (
                <>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">ID:</span>
                    <span className="text-gray-900">{proposedHire.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Title:</span>
                    <span className="text-gray-900">{proposedHire.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Manager:</span>
                    <span className="text-gray-900">
                      {getFullName(
                        proposedHire.manager?.deelEmployee?.firstName,
                        proposedHire.manager?.deelEmployee?.lastName,
                      ) || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Team:</span>
                    <span className="text-gray-900">
                      {proposedHire.manager?.deelEmployee?.team || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">
                      Talent Partners:
                    </span>
                    <span className="text-gray-900">
                      {proposedHire.talentPartners
                        .map((tp) =>
                          getFullName(
                            tp.deelEmployee?.firstName,
                            tp.deelEmployee?.lastName,
                          ),
                        )
                        .filter(Boolean)
                        .join(', ') || 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">
                      Hiring Profile:
                    </span>
                    <span className="text-gray-900">
                      {proposedHire.hiringProfile || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Priority:</span>
                    <span className="text-gray-900">
                      {proposedHire.priority || 'N/A'}
                    </span>
                  </div>
                </>
              ) : null}
            </div>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {employee && user?.role === ROLES.ADMIN ? (
              <Link
                to="/employee/$employeeId"
                params={{ employeeId: employee.employee?.id ?? '' }}
              >
                <Button variant="outline" className="w-full">
                  View employee
                </Button>
              </Link>
            ) : null}
            {employee ? (
              <>
                <div className="flex flex-row items-center justify-between gap-2 px-2">
                  <span>Manager</span>
                  <div className="flex flex-row items-center gap-2">
                    <span>
                      {employee?.manager
                        ? getFullName(
                            employee.manager.firstName,
                            employee.manager.lastName,
                          )
                        : 'None'}
                    </span>
                    {employee ? (
                      <ManagerEditPanel
                        employees={employees}
                        employee={employee}
                      />
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-row items-center justify-between gap-2 px-2">
                  <span>Team</span>
                  <div className="flex flex-row items-center gap-2">
                    <span>{employee?.team || 'None'}</span>
                    {employee ? <TeamEditPanel employee={employee} /> : null}
                  </div>
                </div>
              </>
            ) : null}
          </div>
          {proposedHire ? (
            <div className="my-4 w-full">
              <AddProposedHirePanel
                employees={employees}
                proposedHire={proposedHire}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default EmployeePanel
