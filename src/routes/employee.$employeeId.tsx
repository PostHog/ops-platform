import { Input } from '@/components/ui/input'
import prisma from '@/db'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useForm, useStore } from '@tanstack/react-form'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn, useServerFn } from '@tanstack/react-start'
import { Employee, Salary } from 'generated/prisma/client'
import { Priority } from 'generated/prisma/enums'
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import "vercel-toast/dist/vercel-toast.css";
import { createToast } from "vercel-toast";
import { getEmployees, months } from '.'
import { useEffect, useMemo } from 'react'
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { currencyData, getAreasByCountry, getCountries, locationFactor, sfBenchmark, stepModifier } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

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

const updateSalary = createServerFn({
    method: 'POST',
})
    .inputValidator((d: Omit<Salary, 'id' | 'timestamp' | 'communicated'>) => d)
    .handler(async ({ data }) => {
        return await prisma.salary.create({
            data: {
                ...data,
            },
        })
    })

function EmployeeOverview() {
    const getEmployeesFn = useServerFn(getEmployees)

    const { data: employees } = useQuery({
        queryKey: ['employees'],
        queryFn: () => getEmployeesFn(),
    })
    const router = useRouter()
    const employee: Employee & { salaries: Salary[] } = Route.useLoaderData()
    const [updateSalaryModalOpen, setUpdateSalaryModalOpen] = useState(false)

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

    const columns: ColumnDef<Salary>[] = useMemo(() => [
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
            accessorKey: "changeAmount",
            header: "Change ($)",
            cell: ({ row }) => <div>{row.original.changeAmount}</div>,
        },
        {
            accessorKey: "changePercentage",
            header: "Change (%)",
            cell: ({ row }) => <div>{row.original.changePercentage * 100}%</div>,
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
        // {
        //     id: "actions",
        //     enableHiding: false,
        //     cell: ({ row }) => {
        //         const salary = row.original

        //         return (
        //             <DropdownMenu>
        //                 <DropdownMenuTrigger asChild>
        //                     <Button variant="ghost" className="h-8 w-8 p-0">
        //                         <span className="sr-only">Open menu</span>
        //                         <MoreHorizontal />
        //                     </Button>
        //                 </DropdownMenuTrigger>
        //                 <DropdownMenuContent align="end">
        //                     <DropdownMenuItem>
        //                         Edit salary
        //                     </DropdownMenuItem>
        //                 </DropdownMenuContent>
        //             </DropdownMenu>
        //         )
        //     },
        // },
    ], [])

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

                <div className="flex flex-row gap-2 justify-between items-center">
                    <span className="text-md font-bold">Salary history</span>
                    <Button type="button" variant="outline" onClick={() => setUpdateSalaryModalOpen(true)}>Update salary</Button>
                </div>

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
                    <Button variant="outline" type='button' onClick={() => router.navigate({ to: '/' })}>Back to overview</Button>
                    <Button variant="outline" type='button' onClick={() => {
                        const currentIndex = employees?.findIndex(e => e.id === employee.id) ?? -1;
                        const nextEmployee = employees?.[currentIndex + 1];
                        if (nextEmployee) {
                            router.navigate({ to: '/employee/$employeeId', params: { employeeId: nextEmployee.id } });
                        } else {
                            createToast("No more employees found, navigating to overview.", {
                                timeout: 3000,
                            });
                            router.navigate({ to: '/' });
                        }
                    }}>Move to next employee</Button>
                    <Button type="submit">Save changes</Button>
                </div>
            </form>

            <SalaryUpdateModal open={updateSalaryModalOpen} salary={employee.salaries[0]} handleClose={() => setUpdateSalaryModalOpen(false)} />
        </div>
    )
}

export function SalaryUpdateModal({ open, salary, handleClose }: { open: boolean, salary: Salary, handleClose: () => void }) {
    const router = useRouter()
    const benchmarkUpdated = sfBenchmark[salary.benchmark as keyof typeof sfBenchmark] !== salary.benchmarkFactor

    const form = useForm({
        defaultValues: {
            country: salary.country,
            area: salary.area,
            locationFactor: salary.locationFactor,
            level: salary.level,
            step: salary.step,
            benchmark: salary.benchmark,
            benchmarkFactor: salary.benchmark.includes('(old)') ? salary.benchmarkFactor : sfBenchmark[salary.benchmark as keyof typeof sfBenchmark],
            totalSalary: salary.totalSalary,
            changePercentage: 0,
            changeAmount: 0,
            localCurrency: salary.localCurrency,
            exchangeRate: salary.exchangeRate,
            totalSalaryLocal: salary.totalSalaryLocal,
            amountTakenInOptions: salary.amountTakenInOptions,
            actualSalary: salary.actualSalary,
            actualSalaryLocal: salary.actualSalaryLocal,
            notes: salary.notes,
            employeeId: salary.employeeId
        },
        onSubmit: async ({ value }) => {
            await updateSalary({ data: value })
            router.invalidate()
            handleClose()
            createToast("Salary updated successfully.", {
                timeout: 3000,
            });
        },
        listeners: {
            onChange: ({ formApi, fieldApi }) => {
                if (['country', 'area', 'level', 'step', 'benchmark', 'amountTakenInOptions'].includes(fieldApi.name)) {
                    const location = locationFactor.find(l => l.country === formApi.getFieldValue('country') && l.area === formApi.getFieldValue('area'))
                    formApi.setFieldValue('locationFactor', Number(location?.locationFactor?.toFixed(2)))

                    const benchmarkFactor = formApi.getFieldValue('benchmark').includes('(old)') ? salary.benchmarkFactor : sfBenchmark[formApi.getFieldValue('benchmark').replace(' (old)', '') as keyof typeof sfBenchmark]
                    formApi.setFieldValue('benchmarkFactor', Number(benchmarkFactor.toFixed(2)))

                    const totalSalary = formApi.getFieldValue('locationFactor') * formApi.getFieldValue('level') * formApi.getFieldValue('step') * benchmarkFactor
                    formApi.setFieldValue('totalSalary', Number(totalSalary.toFixed(2)))

                    const changePercentage = (totalSalary / salary.totalSalary) - 1
                    formApi.setFieldValue('changePercentage', Number(changePercentage.toFixed(4)))

                    const changeAmount = totalSalary - salary.totalSalary
                    formApi.setFieldValue('changeAmount', Number(changeAmount.toFixed(2)))

                    formApi.setFieldValue('exchangeRate', currencyData[location?.currency ?? ''])
                    formApi.setFieldValue('localCurrency', location?.currency ?? '')

                    const totalSalaryLocal = totalSalary * formApi.getFieldValue('exchangeRate')
                    formApi.setFieldValue('totalSalaryLocal', Number(totalSalaryLocal.toFixed(2)))

                    const actualSalary = totalSalary - formApi.getFieldValue('amountTakenInOptions')
                    formApi.setFieldValue('actualSalary', Number(actualSalary.toFixed(2)))

                    const actualSalaryLocal = actualSalary * formApi.getFieldValue('exchangeRate')
                    formApi.setFieldValue('actualSalaryLocal', Number(actualSalaryLocal.toFixed(2)))
                }
            }
        }
    })

    useEffect(() => {
        form.reset({
            country: salary.country,
            area: salary.area,
            locationFactor: salary.locationFactor,
            level: salary.level,
            step: salary.step,
            benchmark: salary.benchmark,
            benchmarkFactor: salary.benchmark.includes('(old)') ? salary.benchmarkFactor : sfBenchmark[salary.benchmark as keyof typeof sfBenchmark],
            totalSalary: salary.totalSalary,
            changePercentage: 0,
            changeAmount: 0,
            localCurrency: salary.localCurrency,
            exchangeRate: salary.exchangeRate,
            totalSalaryLocal: salary.totalSalaryLocal,
            amountTakenInOptions: salary.amountTakenInOptions,
            actualSalary: salary.actualSalary,
            actualSalaryLocal: salary.actualSalaryLocal,
            notes: salary.notes,
            employeeId: salary.employeeId
        })
    }, [open])

    const country = useStore(form.store, (state) => state.values.country)

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-3xl">
                <form
                    className="grid gap-4"
                    onSubmit={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        form.handleSubmit()
                    }}>
                    <DialogHeader>
                        <DialogTitle>Edit salary</DialogTitle>
                    </DialogHeader>

                    {benchmarkUpdated && (
                        <Alert variant="default">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>This employee is currently on an old benchmark factor. </AlertTitle>
                            <AlertDescription>
                                You can keep it that way by choosing `{salary.benchmark} (old)` as the benchmark, or updated it by choosing `{salary.benchmark.replace(' (old)', '')}` as the benchmark.
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <form.Field
                            name="country"
                            children={(field) => (
                                <div className="grid gap-3">
                                    <Label htmlFor="country">Country</Label>
                                    <Select name={field.name} defaultValue={field.state.value} onValueChange={(value) => field.handleChange(value)}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select a country" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {getCountries().map((country) => (
                                                <SelectItem key={country} value={country}>
                                                    {country}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        />
                        <form.Field
                            name="area"
                            children={(field) => (
                                <div className="grid gap-3">
                                    <Label htmlFor="area">Area</Label>
                                    <Select name={field.name} defaultValue={field.state.value} onValueChange={(value) => field.handleChange(value)} disabled={!country}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select an area" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {getAreasByCountry(country).map((area) => (
                                                <SelectItem key={area} value={area}>
                                                    {area}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        />
                        <form.Field
                            name="locationFactor"
                            children={(field) => (
                                <div className="grid gap-3">
                                    <Label htmlFor="locationFactor">Location Factor</Label>
                                    <Input
                                        readOnly
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        type='number'
                                        onChange={(e) => field.handleChange(Number(e.target.value))}
                                    />
                                </div>
                            )}
                        />
                        <form.Field
                            name="level"
                            children={(field) => (
                                <div className="grid gap-3">
                                    <Label htmlFor="level">Level</Label>
                                    <Select name={field.name} defaultValue={field.state.value.toString()} onValueChange={(value) => field.handleChange(Number(value))}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select a level" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0.59">Junior (0.59)</SelectItem>
                                            <SelectItem value="0.78">Intermediate (0.78)</SelectItem>
                                            <SelectItem value="1">Senior (1)</SelectItem>
                                            <SelectItem value="1.2">Staff (1.2)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        />
                        <form.Field
                            name="step"
                            validators={{
                                onChange: ({ value }) => {
                                    const isValid = Object.values(stepModifier).some(range =>
                                        value >= range[0] && value <= range[1]
                                    )
                                    if (!isValid) {
                                        const ranges = Object.entries(stepModifier)
                                            .map(([name, range]) => `${name} (${range[0]}-${range[1]})`)
                                            .join(', ')
                                        return `Step must be within one of these ranges: ${ranges}`
                                    }
                                }
                            }}
                            children={(field) => (
                                <div className="grid gap-3">
                                    <Label htmlFor="step">Step</Label>
                                    <Input
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        step={0.01}
                                        type='number'
                                        onChange={(e) => field.handleChange(Number(e.target.value))}
                                    />
                                    {!field.state.meta.isValid && (
                                        <span className="text-red-500 text-sm">{field.state.meta.errors.join(', ')}</span>
                                    )}
                                </div>
                            )}
                        />
                        <form.Field
                            name="benchmark"
                            children={(field) => (
                                <div className="grid gap-3">
                                    <Label htmlFor="benchmark">Benchmark</Label>
                                    <Select name={field.name} defaultValue={field.state.value} onValueChange={(value) => field.handleChange(value)}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select a benchmark" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {benchmarkUpdated && (
                                                <SelectItem value={`${salary.benchmark.replace(' (old)', '')} (old)`} key="old-benchmark">{salary.benchmark.replace(' (old)', '')} (old) ({salary.benchmarkFactor})</SelectItem>
                                            )}
                                            {Object.keys(sfBenchmark).map((benchmark) => (
                                                <SelectItem key={benchmark} value={benchmark}>
                                                    {benchmark} ({sfBenchmark[benchmark as keyof typeof sfBenchmark]})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        />
                        <form.Field
                            name="benchmarkFactor"
                            children={(field) => (
                                <div className="grid gap-3">
                                    <Label htmlFor="benchmarkFactor">Benchmark Factor</Label>
                                    <Input
                                        readOnly
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        type='number'
                                        onChange={(e) => field.handleChange(Number(e.target.value))}
                                    />
                                </div>
                            )}
                        />
                        <form.Field
                            name="totalSalary"
                            children={(field) => (
                                <div className="grid gap-3">
                                    <Label htmlFor="totalSalary">Total Salary</Label>
                                    <Input
                                        readOnly
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        type='number'
                                        onChange={(e) => field.handleChange(Number(e.target.value))}
                                    />
                                </div>
                            )}
                        />
                        <form.Field
                            name="changePercentage"
                            children={(field) => (
                                <div className="grid gap-3">
                                    <Label htmlFor="changePercentage">Change (%)</Label>
                                    <Input
                                        readOnly
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        type='number'
                                        onChange={(e) => field.handleChange(Number(e.target.value))}
                                    />
                                </div>
                            )}
                        />
                        <form.Field
                            name="changeAmount"
                            children={(field) => (
                                <div className="grid gap-3">
                                    <Label htmlFor="changeAmount">Change ($)</Label>
                                    <Input
                                        readOnly
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        type='number'
                                        onChange={(e) => field.handleChange(Number(e.target.value))}
                                    />
                                </div>
                            )}
                        />
                        <form.Field
                            name="exchangeRate"
                            children={(field) => (
                                <div className="grid gap-3">
                                    <Label htmlFor="exchangeRate">Exchange Rate</Label>
                                    <Input
                                        readOnly
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        type='number'
                                        onChange={(e) => field.handleChange(Number(e.target.value))}
                                    />
                                </div>
                            )}
                        />
                        <form.Field
                            name="localCurrency"
                            children={(field) => (
                                <div className="grid gap-3">
                                    <Label htmlFor="localCurrency">Local Currency</Label>
                                    <Input
                                        readOnly
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        type='text'
                                        onChange={(e) => field.handleChange(e.target.value)}
                                    />
                                </div>
                            )}
                        />
                        <form.Field
                            name="totalSalaryLocal"
                            children={(field) => (
                                <div className="grid gap-3">
                                    <Label htmlFor="totalSalaryLocal">Total Salary (local)</Label>
                                    <Input
                                        readOnly
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        type='number'
                                        onChange={(e) => field.handleChange(Number(e.target.value))}
                                    />
                                </div>
                            )}
                        />
                        <form.Field
                            name="amountTakenInOptions"
                            children={(field) => (
                                <div className="grid gap-3">
                                    <Label htmlFor="amountTakenInOptions">Amount Taken In Options ($)</Label>
                                    <Input
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        type='number'
                                        onChange={(e) => field.handleChange(Number(e.target.value))}
                                    />
                                </div>
                            )}
                        />
                        <form.Field
                            name="actualSalary"
                            children={(field) => (
                                <div className="grid gap-3">
                                    <Label htmlFor="actualSalary">Actual Salary ($)</Label>
                                    <Input
                                        readOnly
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        type='number'
                                        onChange={(e) => field.handleChange(Number(e.target.value))}
                                    />
                                </div>
                            )}
                        />
                        <form.Field
                            name="actualSalaryLocal"
                            children={(field) => (
                                <div className="grid gap-3">
                                    <Label htmlFor="actualSalaryLocal">Actual Salary (local)</Label>
                                    <Input
                                        readOnly
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        type='number'
                                        onChange={(e) => field.handleChange(Number(e.target.value))}
                                    />
                                </div>
                            )}
                        />
                        <form.Field
                            name="notes"
                            children={(field) => (
                                <div className="grid gap-3 col-span-2">
                                    <Label htmlFor="notes">Notes</Label>
                                    <Input
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                    />
                                </div>
                            )}
                        />
                    </div>

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit">Submit</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
