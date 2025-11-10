import { Link } from '@tanstack/react-router'
import { Button } from './ui/button'
import type { Prisma } from '@prisma/client'
import AddProposedHirePanel from './AddProposedHirePanel'
import { ROLES } from '@/lib/consts'
import { useSession } from '@/lib/auth-client'

type DeelEmployee = Prisma.DeelEmployeeGetPayload<{
  include: {
    employee: true
  }
}>

type ProposedHire = Prisma.ProposedHireGetPayload<{
  include: {
    manager: {
      include: {
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
          <pre className="bg-gray-50 p-4 rounded-lg overflow-auto">
            {JSON.stringify(employee || proposedHire, null, 2)}
          </pre>
          {employee && user?.role === ROLES.ADMIN ? (
            <Link
              to="/employee/$employeeId"
              params={{ employeeId: employee.employee?.id ?? '' }}
            >
              <Button variant="outline" className="w-full my-4">
                View employee
              </Button>
            </Link>
          ) : null}
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
