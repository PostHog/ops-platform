import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Table, TableCell, TableRow, TableBody, TableHeader, TableHead } from '@/components/ui/table'
import prisma from '@/db'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useReactTable, getCoreRowModel, flexRender, ColumnDef } from '@tanstack/react-table'
import { User } from 'generated/prisma/client'
import { createToast } from 'vercel-toast'

export const Route = createFileRoute('/management')({
    component: RouteComponent,
})

const getUsers = createServerFn({
    method: 'GET',
}).handler(async () => {
    return await prisma.user.findMany({})
})

const updateUserRole = createServerFn({
    method: 'POST'
})
    .inputValidator((d: { id: string; role: string }) => d)
    .handler(async ({ data }) => {
        return await prisma.user.update({
            where: {
                id: data.id
            },
            data: {
                role: data.role
            }
        })
    })

function RouteComponent() {
    const { data: users, refetch } = useQuery({
        queryKey: ['users'],
        queryFn: () => getUsers(),
    })

    const columns: ColumnDef<User>[] = [
        {
            accessorKey: "name",
            header: "Name",
            cell: ({ row }) => (
                <div>{row.original.name}</div>
            ),
        },
        {
            accessorKey: "email",
            header: "Email",
            cell: ({ row }) => (
                <div>{row.original.email}</div>
            ),
        },
        {
            accessorKey: "role",
            header: "Role",
            cell: ({ row }) => {
                const handleRoleChange = async (value: string) => {
                    await updateUserRole({ data: { id: row.original.id, role: value } })
                    refetch()
                    createToast("Role updated successfully.", {
                        timeout: 3000,
                    })
                }

                return (
                    <Select value={row.original.role ?? 'error'} onValueChange={handleRoleChange}>
                        <SelectTrigger className="w-24 h-6 text-xs px-1 py-0">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                        </SelectContent>
                    </Select>
                )
            },
        }
    ]

    const table = useReactTable({
        data: users || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        filterFns: {},
    })

    return (
        <div className="w-screen flex justify-center">
            <div className="max-w-[80%] flex-grow">
                <div className="flex justify-between py-4">
                    <div className="text-lg font-bold">User management</div>
                </div>
                <div className="overflow-hidden rounded-md border">
                    <Table className="text-xs">
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
                                        className="hover:bg-gray-50"
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className="py-1 px-1">
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
                <div className="flex justify-between py-4">
                    <div className="text-lg font-bold">Review cycle</div>
                </div>
                <div className="overflow-hidden">
                    <Button>Start review cycle (set revied to false for all employees)</Button>
                </div>
            </div>
        </div>
    )
}
