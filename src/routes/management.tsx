import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { createToast } from 'vercel-toast'
import type { ColumnDef } from '@tanstack/react-table'
import type { User } from 'generated/prisma/client'
import prisma from '@/db'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/management')({
  component: RouteComponent,
})

const getUsers = createServerFn({
  method: 'GET',
}).handler(async () => {
  return await prisma.user.findMany({})
})

const updateUserRole = createServerFn({
  method: 'POST',
})
  .inputValidator((d: { id: string; role: string }) => d)
  .handler(async ({ data }) => {
    return await prisma.user.update({
      where: {
        id: data.id,
      },
      data: {
        role: data.role,
      },
    })
  })

const startReviewCycle = createServerFn({
  method: 'POST',
}).handler(async () => {
  return await prisma.employee.updateMany({
    data: {
      reviewed: false,
    },
  })
})

function RouteComponent() {
  const router = useRouter()
  const { data: users, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
  })

  const columns: Array<ColumnDef<User>> = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <div>{row.original.name}</div>,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => <div>{row.original.email}</div>,
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const handleRoleChange = async (value: string) => {
          await updateUserRole({ data: { id: row.original.id, role: value } })
          refetch()
          createToast('Role updated successfully.', {
            timeout: 3000,
          })
        }

        return (
          <Select
            value={row.original.role ?? 'error'}
            onValueChange={handleRoleChange}
          >
            <SelectTrigger className="w-24 h-6 text-xs px-1 py-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin (full access)</SelectItem>
              <SelectItem value="user">User (no access)</SelectItem>
            </SelectContent>
          </Select>
        )
      },
    },
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
                              header.getContext(),
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
                  <TableRow key={row.id} className="hover:bg-gray-50">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-1 px-1">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
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
          <Button
            onClick={async () => {
              await startReviewCycle()
              router.invalidate()
              createToast('Review cycle started successfully.', {
                timeout: 3000,
              })
            }}
          >
            Start review cycle (set reviewed to false for all employees)
          </Button>
        </div>
      </div>
    </div>
  )
}
