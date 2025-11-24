import { createFileRoute } from '@tanstack/react-router'
import { CartesianGrid, Scatter, ScatterChart, XAxis, YAxis } from 'recharts'

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { getEmployees } from '.'
import type { Prisma } from '@prisma/client'

type Employee = Prisma.EmployeeGetPayload<{
  include: {
    salaries: {
      orderBy: {
        timestamp: 'desc'
      }
    }
    deelEmployee: {
      include: {
        topLevelManager: true
      }
    }
  }
}>

export const Route = createFileRoute('/analytics')({
  component: RouteComponent,
  loader: async () => await getEmployees(),
})

function RouteComponent() {
  const deelEmployees = Route.useLoaderData()

  return (
    <div className="w-screen flex px-4 justify-center">
      <div className="max-w-full 2xl:max-w-[80%] flex-grow">
        <div className="flex flex-col gap-16">
          {/* <LevelStepChart deelEmployees={deelEmployees} /> */}
          <LevelStepSalaryChart deelEmployees={deelEmployees} />
        </div>
      </div>
    </div>
  )
}

const LevelStepChart = ({ deelEmployees }: { deelEmployees: Employee[] }) => {
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

  const chartData = deelEmployees.map((employee) => ({
    name: employee.deelEmployee?.name ?? employee.email,
    level: employee.salaries[0]?.level,
    step: employee.salaries[0]?.step,
  }))

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
            domain={[0.85, 1.2]}
            tickLine={false}
            tickMargin={10}
            axisLine={false}
          />
          <YAxis
            name="Level"
            dataKey="level"
            type="number"
            ticks={[0.59, 0.78, 1, 1.2, 1.4]}
            domain={[0.59, 1.4]}
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
          <ChartLegend content={<ChartLegendContent />} />
          <Scatter data={chartData} fill="#8884d8" />
        </ScatterChart>
      </ChartContainer>
    </div>
  )
}

const LevelStepSalaryChart = ({
  deelEmployees,
}: {
  deelEmployees: Employee[]
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

  const chartData = deelEmployees.map((employee) => ({
    name: employee.deelEmployee?.name ?? employee.email,
    levelStep: employee.salaries[0]?.level * employee.salaries[0]?.step,
    locationFactor: employee.salaries[0]?.locationFactor,
    location: employee.salaries[0]?.country + ', ' + employee.salaries[0]?.area,
    salary: employee.salaries[0]?.totalSalary,
  }))

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
            domain={[0.85, 1.2]}
            tickLine={false}
            tickMargin={10}
            axisLine={false}
          />
          <YAxis
            name="Salary"
            dataKey="salary"
            type="number"
            domain={['dataMin', 'dataMax']}
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
          <ChartLegend content={<ChartLegendContent />} />
          <Scatter data={chartData} fill="#8884d8" />
        </ScatterChart>
      </ChartContainer>
    </div>
  )
}
