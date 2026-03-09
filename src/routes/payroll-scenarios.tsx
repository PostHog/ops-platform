import { createFileRoute } from '@tanstack/react-router'
import { useRef, useState, type RefObject } from 'react'
import prisma from '@/db'
import { createAdminFn } from '@/lib/auth-middleware'
import { formatCurrency, sfBenchmark } from '@/lib/utils'

const getActiveEmployeeSalaries = createAdminFn({ method: 'GET' }).handler(
  async () => {
    return await prisma.deelEmployee.findMany({
      where: { startDate: { lte: new Date() } },
      include: {
        employee: {
          select: {
            salaries: {
              orderBy: { timestamp: 'desc' },
              take: 1,
              select: {
                totalSalary: true,
                locationFactor: true,
                area: true,
                country: true,
                benchmark: true,
              },
            },
          },
        },
      },
    })
  },
)

export const Route = createFileRoute('/payroll-scenarios')({
  component: RouteComponent,
  loader: async () => await getActiveEmployeeSalaries(),
})

type ActiveEmployee = {
  locationKey: string
  area: string
  country: string
  locationFactor: number
  benchmark: string
  benchmarkSalary: number | null // sfBenchmark dollar value, null if not found
  totalSalary: number
}

type GroupRow = {
  key: string
  label: string
  currentFactor: number
  employeeCount: number
  currentTotal: number
}

function parseOverride(raw: string | undefined): number | null {
  if (!raw?.trim()) return null
  const parsed = parseFloat(raw)
  return isNaN(parsed) || parsed <= 0 ? null : parsed
}

function RouteComponent() {
  const deelEmployees = Route.useLoaderData()

  const [activeTab, setActiveTab] = useState<'locationFactors' | 'benchmarks'>(
    'locationFactors',
  )
  const [locationOverrides, setLocationOverrides] = useState<
    Record<string, string>
  >({})
  const [benchmarkOverrides, setBenchmarkOverrides] = useState<
    Record<string, string>
  >({})
  const [locationFilter, setLocationFilter] = useState('')
  const [benchmarkFilter, setBenchmarkFilter] = useState('')
  const tableRef = useRef<HTMLDivElement>(null)

  const activeEmployees: ActiveEmployee[] = deelEmployees
    .filter((de) => de.employee?.salaries?.length)
    .map((de) => {
      const salary = de.employee!.salaries[0]
      return {
        locationKey: `${salary.area}|${salary.country}`,
        area: salary.area,
        country: salary.country,
        locationFactor: salary.locationFactor,
        benchmark: salary.benchmark,
        benchmarkSalary: sfBenchmark[salary.benchmark] ?? null,
        totalSalary: salary.totalSalary,
      }
    })

  // Group by location
  const locationMap = new Map<string, GroupRow>()
  for (const emp of activeEmployees) {
    const existing = locationMap.get(emp.locationKey)
    if (existing) {
      existing.employeeCount += 1
      existing.currentTotal += emp.totalSalary
    } else {
      locationMap.set(emp.locationKey, {
        key: emp.locationKey,
        label: `${emp.area} (${emp.country})`,
        currentFactor: emp.locationFactor,
        employeeCount: 1,
        currentTotal: emp.totalSalary,
      })
    }
  }
  const locations = Array.from(locationMap.values()).sort(
    (a, b) => b.currentTotal - a.currentTotal,
  )

  // Group by benchmark (only employees whose benchmark is in sfBenchmark)
  const benchmarkMap = new Map<string, GroupRow>()
  for (const emp of activeEmployees) {
    if (emp.benchmarkSalary === null) continue
    const existing = benchmarkMap.get(emp.benchmark)
    if (existing) {
      existing.employeeCount += 1
      existing.currentTotal += emp.totalSalary
    } else {
      benchmarkMap.set(emp.benchmark, {
        key: emp.benchmark,
        label: emp.benchmark,
        currentFactor: emp.benchmarkSalary,
        employeeCount: 1,
        currentTotal: emp.totalSalary,
      })
    }
  }
  const benchmarks = Array.from(benchmarkMap.values()).sort(
    (a, b) => b.currentTotal - a.currentTotal,
  )

  const getLocNewFactor = (key: string) => parseOverride(locationOverrides[key])
  const getBenchNewFactor = (key: string) =>
    parseOverride(benchmarkOverrides[key])

  // Combined summary: apply both override types per-employee
  const totalCurrentPayroll = activeEmployees.reduce(
    (sum, emp) => sum + emp.totalSalary,
    0,
  )
  const totalProjectedPayroll = activeEmployees.reduce((sum, emp) => {
    const newLoc = getLocNewFactor(emp.locationKey)
    const newBench = getBenchNewFactor(emp.benchmark)
    let salary = emp.totalSalary
    if (newLoc !== null) salary *= newLoc / emp.locationFactor
    if (newBench !== null && emp.benchmarkSalary !== null)
      salary *= newBench / emp.benchmarkSalary
    return sum + salary
  }, 0)
  const netChange = totalProjectedPayroll - totalCurrentPayroll
  const netChangePct =
    totalCurrentPayroll !== 0 ? (netChange / totalCurrentPayroll) * 100 : 0
  const hasAnyOverride =
    locations.some((loc) => getLocNewFactor(loc.key) !== null) ||
    benchmarks.some((b) => getBenchNewFactor(b.key) !== null)

  const filteredLocations = locationFilter.trim()
    ? locations.filter((loc) =>
        loc.label.toLowerCase().includes(locationFilter.toLowerCase()),
      )
    : locations

  const filteredBenchmarks = benchmarkFilter.trim()
    ? benchmarks.filter((b) =>
        b.label.toLowerCase().includes(benchmarkFilter.toLowerCase()),
      )
    : benchmarks

  return (
    <div className="flex justify-center px-4 pt-14 pb-4">
      <div className="w-full max-w-5xl">
        <h1 className="mb-4 text-2xl font-bold">Payroll Scenarios</h1>

        {/* Combined summary bar */}
        <div className="mb-6 grid grid-cols-4 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div>
            <div className="text-xs text-gray-500">Total Active Payroll</div>
            <div className="text-lg font-semibold">
              {formatCurrency(totalCurrentPayroll)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Projected Payroll</div>
            <div className="text-lg font-semibold">
              {hasAnyOverride ? formatCurrency(totalProjectedPayroll) : '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Net Change</div>
            <div
              className={`text-lg font-semibold ${
                !hasAnyOverride
                  ? 'text-gray-400'
                  : netChange > 0
                    ? 'text-green-600'
                    : netChange < 0
                      ? 'text-red-600'
                      : 'text-gray-700'
              }`}
            >
              {hasAnyOverride ? formatCurrency(netChange) : '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Net Change %</div>
            <div
              className={`text-lg font-semibold ${
                !hasAnyOverride
                  ? 'text-gray-400'
                  : netChangePct > 0
                    ? 'text-green-600'
                    : netChangePct < 0
                      ? 'text-red-600'
                      : 'text-gray-700'
              }`}
            >
              {hasAnyOverride ? `${netChangePct.toFixed(2)}%` : '—'}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex border-b border-gray-200">
          <TabButton
            label="Location Factors"
            active={activeTab === 'locationFactors'}
            onClick={() => setActiveTab('locationFactors')}
          />
          <TabButton
            label="Benchmarks"
            active={activeTab === 'benchmarks'}
            onClick={() => setActiveTab('benchmarks')}
          />
        </div>

        {activeTab === 'locationFactors' && (
          <>
            <div className="mb-3">
              <input
                type="text"
                value={locationFilter}
                onChange={(e) => {
                  setLocationFilter(e.target.value)
                  tableRef.current?.scrollTo({ top: 0 })
                }}
                placeholder="Filter locations…"
                className="w-64 rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-400 focus:outline-none"
              />
            </div>
            <ScenarioTable
              tableRef={tableRef}
              rows={filteredLocations}
              columnHeader="Location"
              overrides={locationOverrides}
              onOverrideChange={(key, val) =>
                setLocationOverrides((prev) => ({ ...prev, [key]: val }))
              }
              getNewFactor={getLocNewFactor}
              factorStep="0.01"
              formatFactor={(f) => f.toFixed(2)}
            />
          </>
        )}

        {activeTab === 'benchmarks' && (
          <>
            <div className="mb-3">
              <input
                type="text"
                value={benchmarkFilter}
                onChange={(e) => {
                  setBenchmarkFilter(e.target.value)
                  tableRef.current?.scrollTo({ top: 0 })
                }}
                placeholder="Filter benchmarks…"
                className="w-64 rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-400 focus:outline-none"
              />
            </div>
            <ScenarioTable
              tableRef={tableRef}
              rows={filteredBenchmarks}
              columnHeader="Benchmark"
              overrides={benchmarkOverrides}
              onOverrideChange={(key, val) =>
                setBenchmarkOverrides((prev) => ({ ...prev, [key]: val }))
              }
              getNewFactor={getBenchNewFactor}
              factorStep="1000"
              formatFactor={(f) => formatCurrency(Math.round(f))}
            />
          </>
        )}
      </div>
    </div>
  )
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
        active
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function ScenarioTable({
  rows,
  columnHeader,
  overrides,
  onOverrideChange,
  getNewFactor,
  factorStep,
  formatFactor,
  tableRef,
}: {
  rows: GroupRow[]
  columnHeader: string
  overrides: Record<string, string>
  onOverrideChange: (key: string, value: string) => void
  getNewFactor: (key: string) => number | null
  factorStep: string
  formatFactor: (factor: number) => string
  tableRef: RefObject<HTMLDivElement | null>
}) {
  return (
    <div
      ref={tableRef}
      className="max-h-[60vh] overflow-auto rounded-lg border border-gray-200"
    >
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500">
          <tr>
            <th className="px-4 py-3 text-left font-medium">{columnHeader}</th>
            <th className="px-4 py-3 text-right font-medium">Current Factor</th>
            <th className="px-4 py-3 text-right font-medium">New Factor</th>
            <th className="px-4 py-3 text-right font-medium">Employees</th>
            <th className="px-4 py-3 text-right font-medium">Current Total</th>
            <th className="px-4 py-3 text-right font-medium">
              Projected Total
            </th>
            <th className="px-4 py-3 text-right font-medium">Change</th>
            <th className="px-4 py-3 text-right font-medium">Change %</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => {
            const newFactor = getNewFactor(row.key)
            const hasOverride = newFactor !== null
            const projectedTotal = hasOverride
              ? row.currentTotal * (newFactor / row.currentFactor)
              : row.currentTotal
            const change = projectedTotal - row.currentTotal
            const changePct =
              row.currentTotal !== 0 ? (change / row.currentTotal) * 100 : 0
            const rawInput = overrides[row.key] ?? ''
            const isInvalid =
              rawInput.trim() !== '' &&
              (isNaN(parseFloat(rawInput)) || parseFloat(rawInput) <= 0)

            return (
              <tr
                key={row.key}
                className={hasOverride ? 'bg-yellow-50' : undefined}
              >
                <td className="px-4 py-3 font-medium">{row.label}</td>
                <td className="px-4 py-3 text-right">
                  {formatFactor(row.currentFactor)}
                </td>
                <td className="px-4 py-3 text-right">
                  <input
                    type="number"
                    min="0"
                    step={factorStep}
                    value={rawInput}
                    onChange={(e) => onOverrideChange(row.key, e.target.value)}
                    placeholder="—"
                    className={`w-28 rounded border px-2 py-1 text-right text-sm focus:ring-1 focus:outline-none ${
                      isInvalid
                        ? 'border-red-400 focus:ring-red-400'
                        : 'border-gray-300 focus:ring-blue-400'
                    }`}
                  />
                </td>
                <td className="px-4 py-3 text-right">{row.employeeCount}</td>
                <td className="px-4 py-3 text-right">
                  {formatCurrency(row.currentTotal)}
                </td>
                <td className="px-4 py-3 text-right">
                  {hasOverride ? (
                    formatCurrency(projectedTotal)
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td
                  className={`px-4 py-3 text-right font-medium ${
                    !hasOverride
                      ? 'text-gray-400'
                      : change > 0
                        ? 'text-green-600'
                        : change < 0
                          ? 'text-red-600'
                          : ''
                  }`}
                >
                  {hasOverride ? formatCurrency(change) : '—'}
                </td>
                <td
                  className={`px-4 py-3 text-right font-medium ${
                    !hasOverride
                      ? 'text-gray-400'
                      : changePct > 0
                        ? 'text-green-600'
                        : changePct < 0
                          ? 'text-red-600'
                          : ''
                  }`}
                >
                  {hasOverride ? `${changePct.toFixed(2)}%` : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
