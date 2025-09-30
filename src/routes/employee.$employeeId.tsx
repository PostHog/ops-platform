import { Input } from '@/components/ui/input'
import prisma from '@/db'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useForm } from '@tanstack/react-form'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { Employee, Salary } from 'generated/prisma/client'
import { Priority } from 'generated/prisma/enums'
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import "vercel-toast/dist/vercel-toast.css";
import { createToast } from "vercel-toast";
import { months } from '.'
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"


export const Route = createFileRoute('/employee/$employeeId')({
    component: EmployeeOverview,
    loader: async ({ params }) => await getEmployeeById({ data: { employeeId: params.employeeId } }),
})

const getEmployeeById = createServerFn({
    method: 'GET',
}).inputValidator((d: { employeeId: string }) => d)
    .handler(async ({ data }) => {
        return await prisma.employee.findUnique({
            where: {
                id: data.employeeId,
            },
            include: {
                salaries: {
                    orderBy: {
                        timestamp: 'desc',
                    },
                }
            }
        })
    })

const updateEmployee = createServerFn({
    method: 'POST',
})
    .inputValidator((d: { id: string; name: string; priority: Priority; reviewer: string; reviewd: boolean }) => d)
    .handler(async ({ data }) => {
        return await prisma.employee.update({
            where: { id: data.id },
            data: {
                name: data.name,
                priority: data.priority,
                reviewer: data.reviewer,
                reviewd: data.reviewd,
            },
        })
    })

export function EmployeeOverview() {
    const router = useRouter()
    const employee: Employee & { salaries: Salary[] } = Route.useLoaderData()

    const form = useForm({
        defaultValues: employee,
        onSubmit: async ({ value }) => {
            await updateEmployee({ data: value })
            router.invalidate()
            createToast("Employee updated successfully.", {
                timeout: 3000,
            });
        },
    })

    if (!employee) return null

    const columns: ColumnDef<Salary>[] = [
        {
            accessorKey: "timestamp",
            header: "Last Change (date)",
            cell: ({ row }) => {
                const date = new Date(row.original.timestamp)
                return <div>{months[date.getMonth()]} {date.getFullYear()}</div>
            },
        },
        {
            accessorKey: "locationFactor",
            header: "Location Factor",
            cell: ({ row }) => <div>{row.original.locationFactor}</div>,
        },
        {
            accessorKey: "level",
            header: "Level",
            cell: ({ row }) => <div>{row.original.level}</div>,
        },
        {
            accessorKey: "step",
            header: "Step",
            cell: ({ row }) => <div>{row.original.step}</div>,
        },
        {
            accessorKey: "benchmark",
            header: "Benchmark",
            cell: ({ row }) => <div>{row.original.benchmark}</div>,
        },
        {
            accessorKey: "totalSalary",
            header: "Total Salary ($)",
            cell: ({ row }) => <div>{row.original.totalSalary}</div>,
        },
        {
            accessorKey: "lastChangeAmount",
            header: "Change ($)",
            cell: ({ row }) => <div>{row.original.lastChangeAmount}</div>,
        },
        {
            accessorKey: "lastChangePercentage",
            header: "Change (%)",
            cell: ({ row }) => <div>{row.original.lastChangePercentage * 100}%</div>,
        },
        {
            accessorKey: "exchangeRate",
            header: "Exchange Rate",
            cell: ({ row }) => <div>{row.original.exchangeRate}</div>,
        },
        {
            accessorKey: "totalSalaryLocal",
            header: "Total Salary (local)",
            cell: ({ row }) => <div>{row.original.totalSalaryLocal}</div>,
        },
        {
            accessorKey: "amountTakenInOptions",
            header: "Amount Taken In Options ($)",
            cell: ({ row }) => <div>{row.original.amountTakenInOptions}</div>,
        },
        {
            accessorKey: "actualSalary",
            header: "Actual Salary ($)",
            cell: ({ row }) => <div>{row.original.actualSalary}</div>,
        },
        {
            accessorKey: "actualSalaryLocal",
            header: "Actual Salary (local)",
            cell: ({ row }) => <div>{row.original.actualSalaryLocal}</div>,
        },
        {
            accessorKey: "notes",
            header: "Notes",
            cell: ({ row }) => <div>{row.original.notes}</div>,
        },
        {
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => {
                const salary = row.original

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                                Edit salary
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]

    const table = useReactTable({
        data: employee.salaries,
        columns,
        getCoreRowModel: getCoreRowModel(),
        filterFns: {
            fuzzy: () => true,
        },
    })

    return (
        <div className="w-screen flex justify-center">
            <form
                onSubmit={(e) => {
                    e.preventDefault()
                    form.handleSubmit()
                }}
                className="2xl:w-[80%] max-w-full px-4 flex flex-col gap-5"
            >
                <span className="text-xl font-bold">Edit employee</span>
                <div className="grid grid-cols-2 gap-5">
                    <form.Field
                        name="name"
                        children={(field) => (
                            <div className="grid gap-3">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    name={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                />
                            </div>
                        )}
                    />

                    <form.Field
                        name="priority"
                        children={(field) => (
                            <div className="grid gap-3">
                                <Label htmlFor="priority">Priority</Label>
                                <Select name={field.name} defaultValue={field.state.value} onValueChange={(value) => field.handleChange(value as Priority)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    />

                    <form.Field
                        name="reviewer"
                        children={(field) => (
                            <div className="grid gap-3">
                                <Label htmlFor="reviewer">Reviewer</Label>
                                <Input
                                    name={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                />
                            </div>
                        )}
                    />

                    <form.Field
                        name="reviewd"
                        children={(field) => (
                            <div className="grid gap-3">
                                <Label htmlFor="reviewd">Reviewd</Label>
                                <Switch id="reviewd" name="reviewd" checked={field.state.value} onCheckedChange={(checked) => field.handleChange(checked)} />
                            </div>
                        )}
                    />

                </div>

                <span className="text-md font-bold">Salary history</span>

                <div className="w-full flex-grow">
                    <div className="overflow-hidden rounded-md border">
                        <Table>
                            <TableHeader>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => {
                                            return (
                                                <TableHead key={header.id}>
                                                    {header.isPlaceholder
                                                        ? null
                                                        : flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )}
                                                </TableHead>
                                            )
                                        })}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {table.getRowModel().rows?.length ? (
                                    table.getRowModel().rows.map((row) => (
                                        <TableRow
                                            key={row.id}
                                            data-state={row.getIsSelected() && "selected"}
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell key={cell.id}>
                                                    {flexRender(
                                                        cell.column.columnDef.cell,
                                                        cell.getContext()
                                                    )}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell
                                            colSpan={columns.length}
                                            className="h-24 text-center"
                                        >
                                            No results.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
                <div className='flex gap-2 justify-end'>
                    <Button variant="outline">Cancel</Button>
                    <Button type="submit">Save changes</Button>
                </div>
            </form>
        </div>
    )
}