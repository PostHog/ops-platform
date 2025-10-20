import { Prisma } from 'generated/prisma/client'
import { Button } from "./ui/button"
import { Link } from "@tanstack/react-router"

type DeelEmployee = Prisma.DeelEmployeeGetPayload<{
    include: {
        employee: true,
    }
}>

const EmployeePanel = ({ employeeId, employees }: { employeeId: string | null, employees: DeelEmployee[] }) => {
    const employee = employees.find(employee => employee.id === employeeId)

    if (!employee) return null
    return (
        <div className="absolute h-full flex flex-col m-0 p-2 overflow-hidden transition-[width] max-h-full right-0 justify-center w-[36rem]"
        >
            <div className="relative flex flex-col rounded-md overflow-hidden bg-white min-h-48 max-h-full z-10"
                style={{
                    border: '1px solid var(--border)',
                    boxShadow: '0 3px 0 var(--border)',
                }}>
                <div className="p-2">
                    <h1 className="text-lg font-bold mb-4">{employee.name}</h1>
                    <pre className="bg-gray-50 p-4 rounded-lg overflow-auto">
                        {JSON.stringify(employee, null, 2)}
                    </pre>
                    <Link to="/employee/$employeeId" params={{ employeeId: employee.employee?.id ?? '' }}>
                        <Button variant="outline" className="w-full my-4">View employee</Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default EmployeePanel