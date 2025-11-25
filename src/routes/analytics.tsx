import { createFileRoute } from '@tanstack/react-router'
import {
  CartesianGrid,
  Dot,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from 'recharts'

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { formatCurrency } from '@/lib/utils'
import OrgChartPanel from '@/components/OrgChartPanel'
import prisma from '@/db'
import { createAuthenticatedFn } from '@/lib/auth-middleware'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { getReferenceEmployees } from './employee.$employeeId'

const getEmployees = createAuthenticatedFn({
  method: 'GET',
}).handler(async () => {
  const deelEmployees = await prisma.deelEmployee.findMany({
    include: {
      employee: {
        select: {
          id: true,
          email: true,
          salaries: {
            orderBy: {
              timestamp: 'desc',
            },
            take: 1,
          },
        },
      },
    },
    where: {
      startDate: {
        lte: new Date(),
      },
      employee: {
        salaries: {
          some: {},
        },
      },
    },
  })

  return { deelEmployees }
})

export const Route = createFileRoute('/analytics')({
  component: RouteComponent,
  loader: async () => await getEmployees(),
})

function RouteComponent() {
  const { deelEmployees } = Route.useLoaderData()
  const [filterByExec, setFilterByExec] = useState(false)
  const [filterByLevel, setFilterByLevel] = useState(true)
  const [filterByTitle, setFilterByTitle] = useState(true)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  )
  const selectedEmployee = deelEmployees.find(
    (deelEmployee) => deelEmployee.id === selectedEmployeeId,
  )
  const { data: referenceEmployees } = useQuery({
    queryKey: [
      'referenceEmployees',
      selectedEmployeeId,
      filterByExec,
      filterByLevel,
      filterByTitle,
    ],
    queryFn: () =>
      getReferenceEmployees({
        data: {
          level: selectedEmployee?.employee?.salaries[0]?.level ?? 0,
          step: selectedEmployee?.employee?.salaries[0]?.step ?? 0,
          benchmark: selectedEmployee?.employee?.salaries[0]?.benchmark ?? '',
          filterByExec,
          filterByLevel,
          filterByTitle,
          topLevelManagerId: selectedEmployee?.topLevelManagerId ?? null,
        },
      }),
    placeholderData: (prevData) => prevData,
  })

  return (
    <div className="w-screen flex px-4 justify-center">
      <div className="max-w-full 2xl:max-w-[80%] flex-grow">
        <div className="flex flex-row justify-between items-center mt-6">
          <div>
            <OrgChartPanel
              employees={deelEmployees}
              selectedNode={selectedEmployeeId}
              setSelectedNode={setSelectedEmployeeId}
            />
          </div>
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <Switch
                id="filter-by-level"
                checked={filterByLevel}
                onCheckedChange={setFilterByLevel}
              />
              <Label htmlFor="filter-by-level" className="text-sm">
                Filter by level
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="filter-by-exec"
                checked={filterByExec}
                onCheckedChange={setFilterByExec}
              />
              <Label htmlFor="filter-by-exec" className="text-sm">
                Filter by exec
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="filter-by-title"
                checked={filterByTitle}
                onCheckedChange={setFilterByTitle}
              />
              <Label htmlFor="filter-by-title" className="text-sm">
                Filter by title
              </Label>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-8">
          <LevelStepChart
            chartData={
              referenceEmployees?.map((employee) => ({
                name: employee.name,
                level: employee.level,
                step: employee.step,
              })) ?? []
            }
          />
          <LevelStepSalaryChart
            chartData={
              referenceEmployees?.map((employee) => ({
                name: employee.name,
                levelStep: employee.level * employee.step,
                locationFactor: employee.locationFactor,
                location: employee.location,
                salary: employee.salary,
              })) ?? []
            }
          />
        </div>
      </div>
    </div>
  )
}

const LevelStepChart = ({
  chartData,
}: {
  chartData: { name: string; level: number; step: number }[]
}) => {
  const chartConfig = {
    name: {
      label: 'Name',
      color: '#000000',
    },
    level: {
      label: 'Level',
      color: '#2563eb',
    },
    step: {
      label: 'Step',
      color: '#60a5fa',
    },
  } satisfies ChartConfig

  return (
    <div className="flex flex-col justify-between items-center gap-6">
      <span>Step vs Level</span>
      <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
        <ScatterChart accessibilityLayer data={chartData}>
          <CartesianGrid vertical={false} />
          <XAxis
            name="Step"
            dataKey="step"
            type="number"
            domain={[
              (dataMin: number) => dataMin,
              (dataMax: number) => dataMax * 1.05,
            ]}
            tickLine={false}
            tickMargin={10}
            axisLine={false}
          />
          <YAxis
            name="Level"
            dataKey="level"
            type="number"
            ticks={[0.59, 0.78, 1, 1.2, 1.4]}
            domain={[
              (dataMin: number) => dataMin,
              (dataMax: number) => dataMax * 1.05,
            ]}
            tickLine={false}
            tickMargin={10}
            axisLine={false}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => payload?.[0]?.payload?.name}
              />
            }
          />
          <Scatter
            data={chartData}
            fill="#8884d8"
            shape={(props: any) => <CustomizedShape {...props} />}
          />
        </ScatterChart>
      </ChartContainer>
    </div>
  )
}

export const LevelStepSalaryChart = ({
  chartData,
}: {
  chartData: {
    name: string
    levelStep: number
    locationFactor: number
    location: string
    salary: number
  }[]
}) => {
  const chartConfig = {
    name: {
      label: 'Name',
      color: '#000000',
    },
    salary: {
      label: 'Salary',
      color: '#2563eb',
    },
    locationFactor: {
      label: 'Location Factor',
      color: '#60a5fa',
    },
    location: {
      label: 'Location',
      color: '#60a5fa',
    },
  } satisfies ChartConfig

  return (
    <div className="flex flex-col justify-between items-center gap-6">
      <span>Step * Level vs Salary</span>
      <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
        <ScatterChart accessibilityLayer data={chartData}>
          <CartesianGrid vertical={false} />
          <XAxis
            name="Step * Level"
            dataKey="levelStep"
            type="number"
            domain={[
              (dataMin: number) => dataMin,
              (dataMax: number) => dataMax * 1.05,
            ]}
            label={{ value: 'Step * Level', position: 'insideBottom' }}
            tickLine={false}
            tickMargin={10}
            axisLine={false}
          />
          <YAxis
            name="Salary"
            dataKey="salary"
            type="number"
            domain={[
              (dataMin: number) => dataMin,
              (dataMax: number) => dataMax * 1.05,
            ]}
            label={{ value: 'Salary ($)', position: 'insideLeft' }}
            tickFormatter={(value) => formatCurrency(value.toFixed(0), 'USD')}
            width={100}
            tickLine={false}
            tickMargin={10}
            axisLine={false}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => payload?.[0]?.payload?.name}
              />
            }
          />
          <Scatter
            data={chartData}
            fill="#8884d8"
            shape={(props: any) => <CustomizedShape {...props} />}
          />
        </ScatterChart>
      </ChartContainer>
    </div>
  )
}

const CustomizedShape = (props: {
  cx: number
  cy: number
  fill: string
  name: string
}) => {
  const { cx, cy, fill, name } = props
  return (
    <g>
      <Dot cx={cx} cy={cy} r={5} fill={fill} />
      <g transform={`translate(${cx},${cy})`}>
        <text
          x={10}
          y={Math.max(Math.random() * 100) - 50}
          dy={4}
          textAnchor="start"
        >
          {name}
        </text>
      </g>
    </g>
  )
}
