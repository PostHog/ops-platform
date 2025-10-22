import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { ColumnDef, useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import { createServerFn } from '@tanstack/react-start'
import prisma from '@/db'
import { Prisma } from 'generated/prisma/client'
import { useMemo } from 'react'

type Salary = Prisma.SalaryGetPayload<{
    include: {
        employee: {
            include: {
                deelEmployee: {
                    include: {
                        topLevelManager: true
                    }
                }
            }
        },
    }
  }>

const getUpdatedSalaries = createServerFn({
    method: 'GET',
})
    .handler(async () => {
        return await prisma.salary.findMany({
            where: {
                timestamp: {
                    gte: new Date(new Date().setDate(new Date().getDate() - 30)),
                }
            },
            include: {
                employee: {
                    include: {
                        deelEmployee: {
                            include: {
                                topLevelManager: true
                            }
                        }
                    }
                },
            },
            orderBy: {
                timestamp: 'desc',
            }
        })
    })

const updateCommunicated = createServerFn({
    method: 'POST',
})
    .inputValidator((d: { id: string; communicated: boolean }) => d)
    .handler(async ({ data }) => {
        return await prisma.salary.update({
            where: { id: data.id },
            data: { communicated: data.communicated },
        })
})

export const Route = createFileRoute('/actions')({
    component: App,
    loader: async () => await getUpdatedSalaries(),
})

function App() {
    const salaries: Salary[] = Route.useLoaderData()
    const router = useRouter()
    const columns: ColumnDef<Salary>[] = useMemo(() => [
        {
            accessorKey: "name",
            header: "Name",
            cell: ({ row }) => (
                <div>{row.original.employee.deelEmployee?.name}</div>
            ),
        },
        {
            accessorKey: "notes",
            header: "Notes",
            cell: ({ row }) => <div>{row.original.notes}</div>,
        },
        {
            accessorKey: "totalSalary",
            header: "Total Salary",
            cell: ({ row }) => <div>{row.original.totalSalary}</div>,
        },
        {
            accessorKey: "reviewer",
            header: "Reviewer",
            cell: ({ row }) => <div>{row.original.employee.deelEmployee?.topLevelManager?.name}</div>,
        },
        {
            accessorKey: "communicated",
            header: "Communicated",
            cell: ({ row }) => <div>{row.original.communicated ? "Yes" : "No"}</div>,
        },
        {
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => {
                const { communicated, id} = row.original
    
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={async () => {
                                    await updateCommunicated({ data: { id, communicated: !communicated } })
                                    router.invalidate()
                                }}
                            >
                                Toggle communicated
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ], [])

    const table = useReactTable({
        data: salaries,
        columns,
        getCoreRowModel: getCoreRowModel(),
        filterFns: {
            fuzzy: () => true,
        },
    })

    return (
        <div className="w-full h-full pt-8 flex justify-center">
            <div className="max-w-[80%] flex-grow">
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
        </div>
    )
}