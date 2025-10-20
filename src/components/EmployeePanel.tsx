import { DeelEmployee } from 'generated/prisma/client'
import { Button } from "./ui/button"
import prisma from "@/db"
import { createServerFn } from "@tanstack/react-start"
import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"

const getEmployeeByEmail = createServerFn({
    method: 'GET',
}).inputValidator((d: { email: string }) => d)
    .handler(async ({ data }) => {
        return await prisma.employee.findUnique({
            where: {
                email: data.email,
            },
        })
    })

const EmployeePanel = ({ employeeId, employees }: { employeeId: string | null, employees: DeelEmployee[] }) => {
    const employee = employees.find(employee => employee.id === employeeId)

    const { data: employeeRecord } = useQuery({
        queryKey: ['employee', employee?.workEmail],
        queryFn: async () => await getEmployeeByEmail({ data: { email: employee?.workEmail ?? '' } }),
        enabled: !!employee?.workEmail,
    })

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
                    <Link to="/employee/$employeeId" params={{ employeeId: employeeRecord?.id ?? '' }}>
                        <Button variant="outline" className="w-full my-4">View employee</Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default EmployeePanel