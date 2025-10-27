import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import prisma from '@/db'
import ReactMarkdown from 'react-markdown'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useForm, useStore, AnyFormApi } from '@tanstack/react-form'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { Prisma, type Salary } from 'generated/prisma/client'
import { Button } from "@/components/ui/button"
import "vercel-toast/dist/vercel-toast.css";
import { createToast } from "vercel-toast";
import { months } from '.'
import { useMemo, useState } from 'react'
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
import { currencyData, getAreasByCountry, getCountries, locationFactor, sfBenchmark, formatCurrency } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { reviewQueueAtom } from '@/atoms'
import { useAtom } from 'jotai'

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
                feedback: {
                    orderBy: {
                        timestamp: 'desc',
                    },
                },
                salaries: {
                    orderBy: {
                        timestamp: 'desc',
                    },
                },
                deelEmployee: {
                    include: {
                        topLevelManager: true,
                    }
                }
            }
        })
    })

type Employee = Prisma.EmployeeGetPayload<{
    include: {
        salaries: {
            orderBy: {
                timestamp: 'desc',
            },
        },
        deelEmployee: {
            include: {
                topLevelManager: true,
            }
        },
        feedback: true
    }
}>


const updateSalary = createServerFn({
    method: 'POST',
})
    .inputValidator((d: Omit<Salary, 'id' | 'timestamp' | 'communicated'>) => d)
    .handler(async ({ data }) => {
        // Create the salary entry
        const salary = await prisma.salary.create({
            data: {
                ...data,
            },
        })

        // Update the employee's reviewed status to true
        await prisma.employee.update({
            where: { id: data.employeeId },
            data: { reviewd: true }
        })

        return salary
    })

function EmployeeOverview() {
    const [showInlineForm, setShowInlineForm] = useState(true)
    const [showOverrideMode, setShowOverrideMode] = useState(false)
    const [showDetailedColumns, setShowDetailedColumns] = useState(false)

    const router = useRouter()
    const employee: Employee = Route.useLoaderData()
    const [reviewQueue, setReviewQueue] = useAtom(reviewQueueAtom)

    const form = useForm({
        defaultValues: {
            id: employee.id,
        },
        onSubmit: async () => {
            // No longer updating employee data through this form
            createToast("No changes to save.", {
                timeout: 3000,
            });
        },
    })

    if (!employee) return null

    const columns: ColumnDef<Salary>[] = useMemo(() => {
        const baseColumns: ColumnDef<Salary>[] = [
            {
                accessorKey: "timestamp",
                header: "Last Change (date)",
                cell: ({ row }) => {
                    const date = new Date(row.original.timestamp)
                    return <div>{months[date.getMonth()]} {date.getFullYear()}</div>
                },
            },
            {
                accessorKey: "country",
                header: "Country",
                cell: ({ row }) => <div>{row.original.country}</div>,
            },
            {
                accessorKey: "area",
                header: "Area",
                cell: ({ row }) => <div>{row.original.area}</div>,
            },
            {
                accessorKey: "benchmark",
                header: "Benchmark",
                cell: ({ row }) => <div>{row.original.benchmark}</div>,
            },
            {
                accessorKey: "locationFactor",
                header: "Location",
                cell: ({ row }) => <div className="text-right">{row.original.locationFactor}</div>,
            },
            {
                accessorKey: "level",
                header: "Level",
                cell: ({ row }) => <div className="text-right">{row.original.level}</div>,
            },
            {
                accessorKey: "step",
                header: "Step",
                cell: ({ row }) => <div className="text-right">{row.original.step}</div>,
            },
            {
                accessorKey: "totalSalary",
                header: "Total Salary ($)",
                cell: ({ row }) => {
                    const salary = row.original
                    const expectedTotal = salary.locationFactor * salary.level * salary.step * salary.benchmarkFactor
                    const isMismatch = Math.abs(salary.totalSalary - expectedTotal) > 0.01 // Allow for small floating point differences

                    return (
                        <div
                            className={`text-right ${isMismatch ? "text-red-600 font-medium" : ""}`}
                            title={isMismatch ? `Mismatch detected! Expected: ${formatCurrency(expectedTotal)}, Actual: ${formatCurrency(salary.totalSalary)}` : ""}
                        >
                            {formatCurrency(salary.totalSalary)}
                        </div>
                    )
                },
            },
            {
                accessorKey: "changeAmount",
                header: "Change ($)",
                cell: ({ row }) => <div className="text-right">{formatCurrency(row.original.changeAmount)}</div>,
            },
            {
                accessorKey: "changePercentage",
                header: "Change (%)",
                cell: ({ row }) => <div className="text-right">{(row.original.changePercentage * 100).toFixed(2)}%</div>,
            },
            {
                accessorKey: "notes",
                header: "Notes",
                cell: ({ row }) => <div className="min-w-[200px] whitespace-pre-line">{row.original.notes}</div>,
            },
        ]

        const expandIndicator: ColumnDef<Salary> = {
            id: "expandIndicator",
            header: () => (
                <button
                    onClick={() => setShowDetailedColumns(!showDetailedColumns)}
                    className="flex items-center justify-center text-gray-400 hover:text-gray-600 w-full"
                >
                    <span className="text-xs">{showDetailedColumns ? '▶' : '◀'}</span>
                </button>
            ),
            cell: () => null,
        }

        const detailedColumns: ColumnDef<Salary>[] = [
            {
                accessorKey: "exchangeRate",
                header: "Exchange Rate",
                cell: ({ row }) => <div className="text-right">{row.original.exchangeRate}</div>,
            },
            {
                accessorKey: "totalSalaryLocal",
                header: "Total Salary (local)",
                cell: ({ row }) => <div className="text-right">{new Intl.NumberFormat('en-US', { style: 'currency', currency: row.original.localCurrency }).format(row.original.totalSalaryLocal)}</div>,
            },
            {
                accessorKey: "amountTakenInOptions",
                header: "Amount Taken In Options ($)",
                cell: ({ row }) => <div className="text-right">{formatCurrency(row.original.amountTakenInOptions)}</div>,
            },
            {
                accessorKey: "actualSalary",
                header: "Actual Salary ($)",
                cell: ({ row }) => <div className="text-right">{formatCurrency(row.original.actualSalary)}</div>,
            },
            {
                accessorKey: "actualSalaryLocal",
                header: "Actual Salary (local)",
                cell: ({ row }) => <div className="text-right">{new Intl.NumberFormat('en-US', { style: 'currency', currency: row.original.localCurrency }).format(row.original.actualSalaryLocal)}</div>,
            },
        ]

        return showDetailedColumns ? [...baseColumns, expandIndicator, ...detailedColumns] : [...baseColumns, expandIndicator]
    }, [showDetailedColumns])

    const handleMoveToNextEmployee = () => {
        const currentIndex = reviewQueue.indexOf(employee.id)
        const nextEmployee = reviewQueue[currentIndex + 1] ?? null
        if (nextEmployee) {
            router.navigate({ to: '/employee/$employeeId', params: { employeeId: nextEmployee } });
        } else {
            createToast("No more employees in review queue, navigating to overview.", {
                timeout: 3000,
            });
            setReviewQueue([])
            router.navigate({ to: '/' });
        }
    }

    const table = useReactTable({
        data: employee.salaries,
        columns,
        getCoreRowModel: getCoreRowModel(),
        filterFns: {
            fuzzy: () => true,
        },
    })

    return (
        <div className="pt-8 flex justify-center flex flex-col items-center gap-5">
            <form
                onSubmit={(e) => {
                    e.preventDefault()
                    form.handleSubmit()
                }}
                className="2xl:w-[80%] max-w-full px-4 flex flex-col gap-5"
            >
                <div className="flex flex-row justify-between items-center">
                    <div className="flex flex-col">
                        <span className="text-xl font-bold">
                            {employee.deelEmployee?.name || employee.email || 'Edit employee'}
                        </span>
                        <div className="text-sm text-gray-600 mt-1">
                            <span>Priority: {employee.priority}</span>
                            {employee.deelEmployee?.topLevelManager?.name && (
                                <span className="ml-4">Reviewer: {employee.deelEmployee.topLevelManager.name}</span>
                            )}
                            <span className="ml-4">Reviewed: {employee.reviewd ? 'Yes' : 'No'}</span>
                        </div>
                    </div>
                    <div className='flex gap-2 justify-end'>
                        <Button variant="outline" type='button' onClick={() => router.navigate({ to: '/' })}>Back to overview</Button>
                        {reviewQueue.length > 0 && (
                            <Button variant="outline" type='button' onClick={handleMoveToNextEmployee}>Move to next employee</Button>
                        )}
                        <Button type="submit">Save changes</Button>
                    </div>
                </div>

                <div className="flex flex-row gap-2 justify-between items-center mt-2">
                    <span className="text-md font-bold">Feedback</span>
                </div>

                <div className="w-full flex-grow">
                    <div className="mb-4 p-4 border rounded-lg bg-gray-50 max-h-[500px] overflow-y-auto">
                        {employee.feedback.map(({ id, feedback, timestamp }) => (
                            <div key={id} className="mb-4 p-4 border rounded-lg bg-gray-50">
                                <span className="text-sm text-gray-500 w-full text-right list-disc">{new Date(timestamp).toLocaleDateString()}</span>
                                <ReactMarkdown
                                    components={{
                                        h1: ({ children }) => <h1 className="text-2xl font-bold">{children}</h1>,
                                        h2: ({ children }) => <h2 className="text-xl font-bold">{children}</h2>,
                                        h3: ({ children }) => <h3 className="text-lg font-bold">{children}</h3>,
                                        h4: ({ children }) => <h4 className="text-base font-bold">{children}</h4>,
                                        h5: ({ children }) => <h5 className="text-sm font-bold">{children}</h5>,
                                        h6: ({ children }) => <h6 className="text-xs font-bold">{children}</h6>,
                                        ul: ({ children }) => <ul className="list-disc list-inside">{children}</ul>,
                                    }}
                                >
                                    {feedback}
                                </ReactMarkdown>
                            </div>
                        ))}

                        {employee.feedback.length === 0 && (
                            <div className="text-center text-sm text-gray-500">
                                No feedback yet.
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-row gap-2 justify-between items-center mt-2">
                    <span className="text-md font-bold">Salary history</span>
                    <div className="flex gap-2">
                        {showInlineForm ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowOverrideMode(!showOverrideMode)}
                            >
                                {showOverrideMode ? 'Disable override mode' : 'Enable override mode'}
                            </Button>
                        ) : null}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowInlineForm(!showInlineForm)}
                        >
                            {showInlineForm ? 'Cancel' : 'Add New Salary'}
                        </Button>
                    </div>
                </div>

                {employee.salaries[0] && (() => {
                    const benchmarkUpdated = sfBenchmark[employee.salaries[0].benchmark as keyof typeof sfBenchmark] !== employee.salaries[0].benchmarkFactor
                    const locationFactorUpdated = locationFactor.find(l => l.country === employee.salaries[0].country && l.area === employee.salaries[0].area)?.locationFactor !== employee.salaries[0].locationFactor

                    return (
                        <>
                            {benchmarkUpdated && (
                                <Alert variant="default">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>This employee is currently on an old benchmark factor.</AlertTitle>
                                    <AlertDescription>
                                        You can keep it that way by choosing `{employee.salaries[0].benchmark} (old)` as the benchmark, or updated it by choosing `{employee.salaries[0].benchmark.replace(' (old)', '')}` as the benchmark.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {locationFactorUpdated && (
                                <Alert variant="default">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>This employee is currently on an old location factor.</AlertTitle>
                                    <AlertDescription>
                                        The location factor will be updated on the next salary update.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </>
                    )
                })()}

                <div className="w-full flex-grow">
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
                                {showInlineForm && (
                                    <InlineSalaryFormRow
                                        employeeId={employee.id}
                                        showOverrideMode={showOverrideMode}
                                        latestSalary={employee.salaries[0]}
                                        showDetailedColumns={showDetailedColumns}
                                        totalAmountInStockOptions={employee.salaries.reduce((acc, salary) => acc + salary.amountTakenInOptions, 0)}
                                        onSuccess={() => {
                                            setShowInlineForm(false)
                                            router.invalidate()
                                        }}
                                        onCancel={() => setShowInlineForm(false)}
                                    />
                                )}
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
            </form>
        </div>
    )
}

function InlineSalaryFormRow({ employeeId, showOverrideMode, onSuccess, onCancel, latestSalary, showDetailedColumns, totalAmountInStockOptions }: {
    employeeId: string
    showOverrideMode: boolean
    onSuccess: () => void
    onCancel: () => void
    latestSalary: Salary | undefined
    showDetailedColumns: boolean
    totalAmountInStockOptions: number
}) {

    const getDefaultValues = () => ({
        country: latestSalary?.country ?? "United States",
        area: latestSalary?.area ?? "San Francisco Bay Area",
        locationFactor: latestSalary?.locationFactor ?? 0,
        level: latestSalary?.level ?? 1,
        step: latestSalary?.step ?? 1,
        benchmark: latestSalary?.benchmark ?? "Senior Software Engineer",
        benchmarkFactor: latestSalary?.benchmarkFactor ?? 0,
        totalSalary: latestSalary?.totalSalary ?? 0,
        changePercentage: 0, // Always 0 for new entries
        changeAmount: 0, // Always 0 for new entries
        localCurrency: latestSalary?.localCurrency ?? "USD",
        exchangeRate: latestSalary?.exchangeRate ?? 1,
        totalSalaryLocal: latestSalary?.totalSalaryLocal ?? 0,
        amountTakenInOptions: 0,
        actualSalary: latestSalary?.actualSalary ?? 0,
        actualSalaryLocal: latestSalary?.actualSalaryLocal ?? 0,
        notes: "",
        employeeId: employeeId
    })

    const updateFormFields = (formApi: AnyFormApi) => {
        const location = locationFactor.find(l => l.country === formApi.getFieldValue('country') && l.area === formApi.getFieldValue('area'))
        const locationFactorValue = location?.locationFactor ?? 0
        formApi.setFieldValue('locationFactor', Number(locationFactorValue.toFixed(2)))

        const benchmarkValue = formApi.getFieldValue('benchmark')
        const benchmarkFactor = benchmarkValue?.includes('(old)') ? 0 : (sfBenchmark[benchmarkValue?.replace(' (old)', '') as keyof typeof sfBenchmark] ?? 0)
        formApi.setFieldValue('benchmarkFactor', Number(benchmarkFactor.toFixed(2)))

        const currentLocationFactor = formApi.getFieldValue('locationFactor') ?? 0
        const level = formApi.getFieldValue('level') ?? 1
        const step = formApi.getFieldValue('step') ?? 1
        let totalSalary = currentLocationFactor * level * step * benchmarkFactor
        if (!showOverrideMode) {
            formApi.setFieldValue('totalSalary', Number(totalSalary.toFixed(2)))
        } else {
            totalSalary = formApi.getFieldValue('totalSalary') ?? totalSalary
        }

        // Calculate change from the latest salary
        const latestTotalSalary = latestSalary?.totalSalary ?? 0
        const changePercentage = latestTotalSalary > 0 ? (totalSalary / latestTotalSalary) - 1 : 0
        formApi.setFieldValue('changePercentage', Number(changePercentage.toFixed(4)))

        const changeAmount = totalSalary - latestTotalSalary
        formApi.setFieldValue('changeAmount', Number(changeAmount.toFixed(2)))

        const exchangeRate = currencyData[location?.currency ?? ''] ?? 1
        formApi.setFieldValue('exchangeRate', exchangeRate)
        formApi.setFieldValue('localCurrency', currencyData[location?.currency ?? ''] ? location?.currency : 'USD')

        const totalSalaryLocal = totalSalary * exchangeRate
        formApi.setFieldValue('totalSalaryLocal', Number(totalSalaryLocal.toFixed(2)))

        const amountTakenInOptions = formApi.getFieldValue('amountTakenInOptions') ?? 0
        const actualSalary = totalSalary - amountTakenInOptions - totalAmountInStockOptions
        formApi.setFieldValue('actualSalary', Number(actualSalary.toFixed(2)))

        const actualSalaryLocal = actualSalary * exchangeRate
        formApi.setFieldValue('actualSalaryLocal', Number(actualSalaryLocal.toFixed(2)))
    }

    const form = useForm({
        defaultValues: getDefaultValues(),
        onSubmit: async ({ value }) => {
            await updateSalary({ data: value })
            onSuccess()
            createToast("Salary added successfully.", {
                timeout: 3000,
            });
        },
        listeners: {
            onMount({ formApi }) {
                updateFormFields(formApi)
            },
            onChange: ({ formApi, fieldApi }) => {
                if (['country', 'area', 'level', 'step', 'benchmark', 'amountTakenInOptions'].includes(fieldApi.name)) {
                    updateFormFields(formApi)
                } else if (['totalSalary'].includes(fieldApi.name) && showOverrideMode) {
                    updateFormFields(formApi)
                }
            }
        }
    })

    const country = useStore(form.store, (state) => state.values.country)

    return (
        <TableRow className="bg-blue-50">
            <TableCell>
                <div className="text-xs text-gray-500">New Entry</div>
            </TableCell>
            <TableCell>
                <form.Field
                    name="country"
                    children={(field) => (
                        <Select
                            value={field.state.value}
                            onValueChange={(value) => field.handleChange(value)}
                        >
                            <SelectTrigger className="w-full h-6 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {getCountries().map((country) => (
                                    <SelectItem key={country} value={country}>
                                        {country}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
            </TableCell>
            <TableCell>
                <form.Field
                    name="area"
                    children={(field) => (
                        <Select
                            value={field.state.value}
                            onValueChange={(value) => field.handleChange(value)}
                            disabled={!country}
                        >
                            <SelectTrigger className="w-full h-6 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {getAreasByCountry(country).map((area) => (
                                    <SelectItem key={area} value={area}>
                                        {area}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
            </TableCell>
            <TableCell>
                <form.Field
                    name="benchmark"
                    children={(field) => (
                        <Select
                            value={field.state.value}
                            onValueChange={(value) => field.handleChange(value)}
                        >
                            <SelectTrigger className="w-full h-6 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.keys(sfBenchmark).map((benchmark) => (
                                    <SelectItem key={benchmark} value={benchmark}>
                                        {benchmark} ({sfBenchmark[benchmark as keyof typeof sfBenchmark]})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
            </TableCell>
            <TableCell>
                <form.Field
                    name="locationFactor"
                    children={(field) => (
                        <div className="text-xs py-1 px-1 text-right">
                            {field.state.value}
                        </div>
                    )}
                />
            </TableCell>
            <TableCell>
                <form.Field
                    name="level"
                    children={(field) => (
                        <Select
                            value={field.state.value.toString()}
                            onValueChange={(value) => field.handleChange(Number(value))}
                        >
                            <SelectTrigger className="w-full h-6 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0.59">Junior (0.59)</SelectItem>
                                <SelectItem value="0.78">Intermediate (0.78)</SelectItem>
                                <SelectItem value="1">Senior (1)</SelectItem>
                                <SelectItem value="1.2">Staff (1.2)</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                />
            </TableCell>
            <TableCell>
                <form.Field
                    name="step"
                    children={(field) => (
                        <Input
                            className="w-full h-6 text-xs min-w-[70px]"
                            value={field.state.value}
                            type="number"
                            step={0.01}
                            onChange={(e) => field.handleChange(Number(e.target.value))}
                        />
                    )}
                />
            </TableCell>
            <TableCell>
                <form.Field
                    name="totalSalary"
                    children={(field) => {
                        const locationFactor = form.getFieldValue('locationFactor') ?? 0
                        const level = form.getFieldValue('level') ?? 1
                        const step = form.getFieldValue('step') ?? 1
                        const benchmarkFactor = form.getFieldValue('benchmarkFactor') ?? 0
                        const expectedTotal = locationFactor * level * step * benchmarkFactor
                        const isMismatch = Math.abs(field.state.value - expectedTotal) > 0.01

                        if (showOverrideMode) {
                            return (
                                <Input
                                    className="w-full h-6 text-xs min-w-[70px]"
                                    value={field.state.value}
                                    type="number"
                                    step={1}
                                    onChange={(e) => field.handleChange(Number(e.target.value))}
                                />
                            )
                        }

                        return (
                            <div
                                className={`text-xs py-1 px-1 text-right ${isMismatch ? "text-red-600 font-medium" : ""}`}
                                title={isMismatch ? `Mismatch detected! Expected: ${formatCurrency(expectedTotal)}, Actual: ${formatCurrency(field.state.value)}` : ""}
                            >
                                {formatCurrency(field.state.value)}
                            </div>
                        )
                    }}
                />
            </TableCell>
            <TableCell>
                <form.Field
                    name="changeAmount"
                    children={(field) => (
                        <div className="text-xs py-1 px-1 text-right">
                            {formatCurrency(field.state.value)}
                        </div>
                    )}
                />
            </TableCell>
            <TableCell>
                <form.Field
                    name="changePercentage"
                    children={(field) => (
                        <div className="text-xs py-1 px-1 text-right">
                            {(field.state.value * 100).toFixed(2)}%
                        </div>
                    )}
                />
            </TableCell>
            <TableCell>
                <form.Field
                    name="notes"
                    children={(field) => (
                        <Textarea
                            className="w-full min-h-[24px] text-xs !text-xs resize-none"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="Notes..."
                            autoFocus
                        />
                    )}
                />
            </TableCell>
            <TableCell>
                <div className="flex items-center justify-center text-gray-400">
                    <span className="text-xs">{showDetailedColumns ? '▶' : '◀'}</span>
                </div>
            </TableCell>
            {showDetailedColumns && (
                <>
                    <TableCell>
                        <form.Field
                            name="exchangeRate"
                            children={(field) => (
                                <div className="text-xs py-1 px-1 text-right">
                                    {field.state.value}
                                </div>
                            )}
                        />
                    </TableCell>
                    <TableCell>
                        <form.Field
                            name="totalSalaryLocal"
                            children={(field) => {
                                const localCurrency = form.getFieldValue('localCurrency') ?? 'USD'
                                return (
                                    <div className="text-xs py-1 px-1 text-right">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: localCurrency }).format(field.state.value)}
                                    </div>
                                )
                            }}
                        />
                    </TableCell>
                    <TableCell>
                        <form.Field
                            name="amountTakenInOptions"
                            children={(field) => (
                                <Input
                                    className="w-full h-6 text-xs"
                                    value={field.state.value}
                                    type="number"
                                    onChange={(e) => field.handleChange(Number(e.target.value))}
                                />
                            )}
                        />
                    </TableCell>
                    <TableCell>
                        <form.Field
                            name="actualSalary"
                            children={(field) => (
                                <div className="text-xs py-1 px-1 text-right">
                                    {formatCurrency(field.state.value)}
                                </div>
                            )}
                        />
                    </TableCell>
                    <TableCell>
                        <form.Field
                            name="actualSalaryLocal"
                            children={(field) => {
                                const localCurrency = form.getFieldValue('localCurrency') ?? 'USD'
                                return (
                                    <div className="text-xs py-1 px-1 text-right">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: localCurrency }).format(field.state.value)}
                                    </div>
                                )
                            }}
                        />
                    </TableCell>
                </>
            )}
            <TableCell>
                <div className="flex gap-1">
                    <Button
                        type="button"
                        size="sm"
                        onClick={(e) => {
                            e.preventDefault()
                            form.handleSubmit()
                        }}
                        className="h-6 px-2 text-xs"
                    >
                        Save
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={onCancel}
                        className="h-6 px-2 text-xs"
                    >
                        Cancel
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    )
}

