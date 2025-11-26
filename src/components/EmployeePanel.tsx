import { Link } from '@tanstack/react-router'
import { Button } from './ui/button'
import type { Prisma } from '@prisma/client'
import AddProposedHirePanel from './AddProposedHirePanel'
import { ROLES } from '@/lib/consts'
import { useSession } from '@/lib/auth-client'
import { TeamEditPanel } from './TeamEditPanel'

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
    <div className="absolute h-full flex flex-col m-0 p-2 overflow-hidden transition-[width] max-h-full right-0 justify-center w-[36rem]">
      <div
        className="relative flex flex-col rounded-md overflow-hidden bg-white min-h-48 max-h-full z-10"
        style={{
          border: '1px solid var(--border)',
          boxShadow: '0 3px 0 var(--border)',
        }}
      >
        <div className="p-2">
          <h1 className="text-lg font-bold mb-4">
            {employee?.name || proposedHire?.title}
          </h1>
          <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-[80vh]">
            {JSON.stringify(employee || proposedHire, null, 2)}
          </pre>
          <div className="flex flex-col gap-2 mt-2">
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
            <div className="flex flex-row justify-between items-center gap-2 px-2">
              <span>Manager</span>
              <div className="flex flex-row items-center gap-2">
                <span>{employee?.manager?.name ?? 'None'}</span>
                <Button variant="outline">Edit</Button>
              </div>
            </div>
            <div className="flex flex-row justify-between items-center gap-2 px-2">
              <span>Team</span>
              <div className="flex flex-row items-center gap-2">
                <span>{employee?.team ?? 'None'}</span>
                {employee ? <TeamEditPanel employee={employee} /> : null}
              </div>
            </div>
          </div>
          {proposedHire ? (
            <div className="w-full my-4">
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
