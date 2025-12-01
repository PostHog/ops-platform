import { Link } from '@tanstack/react-router'
import { Button } from './ui/button'
import type { Prisma } from '@prisma/client'
import AddProposedHirePanel from './AddProposedHirePanel'
import { ROLES } from '@/lib/consts'
import { useSession } from '@/lib/auth-client'
import { TeamEditPanel } from './TeamEditPanel'
import { ManagerEditPanel } from './ManagerEditPanel'

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
        name: true
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
            {employee?.name || proposedHire?.title}
          </h1>
          <pre className="max-h-[80vh] overflow-auto rounded-lg bg-gray-50 p-4">
            {JSON.stringify(employee || proposedHire, null, 2)}
          </pre>
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
                    <span>{employee?.manager?.name ?? 'None'}</span>
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
