import { createFileRoute } from '@tanstack/react-router'
import { useRef, useState, type RefObject } from 'react'
import prisma from '@/db'
import { createAdminFn } from '@/lib/auth-middleware'
import { formatCurrency, sfBenchmark } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const getPayrollScenariosData = createAdminFn({ method: 'GET' }).handler(
  async () => {
    const [employees, scenarios] = await Promise.all([
      prisma.deelEmployee.findMany({
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
      }),
      prisma.payrollScenario.findMany({
        orderBy: { updatedAt: 'desc' },
        include: { createdBy: { select: { name: true } } },
      }),
    ])
    return { employees, scenarios }
  },
)

const savePayrollScenario = createAdminFn({ method: 'POST' })
  .inputValidator(
    (d: {
      name: string
      locationOverrides: Record<string, string>
      benchmarkOverrides: Record<string, string>
    }) => d,
  )
  .handler(async ({ data, context }) => {
    return await prisma.payrollScenario.create({
      data: {
        name: data.name,
        locationOverrides: data.locationOverrides,
        benchmarkOverrides: data.benchmarkOverrides,
        createdByUserId: context.user.id,
      },
      include: { createdBy: { select: { name: true } } },
    })
  })

const deletePayrollScenario = createAdminFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    return await prisma.payrollScenario.delete({ where: { id: data.id } })
  })

export const Route = createFileRoute('/payroll-scenarios')({
  component: RouteComponent,
  loader: async () => await getPayrollScenariosData(),
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

type SavedScenario = {
  id: string
  name: string
  locationOverrides: Record<string, string>
  benchmarkOverrides: Record<string, string>
  createdBy: { name: string }
  createdAt: Date | string
  updatedAt: Date | string
}

function parseOverride(raw: string | undefined): number | null {
  if (!raw?.trim()) return null
  const parsed = parseFloat(raw)
  return isNaN(parsed) || parsed <= 0 ? null : parsed
}

function relativeTime(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime()
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`
  const years = Math.floor(months / 12)
  return `${years} year${years === 1 ? '' : 's'} ago`
}

function overridesMatch(
  a: Record<string, string>,
  b: Record<string, string>,
): boolean {
  const aKeys = Object.keys(a).filter((k) => a[k].trim() !== '')
  const bKeys = Object.keys(b).filter((k) => b[k].trim() !== '')
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every((k) => a[k] === b[k])
}

function RouteComponent() {
  const { employees: deelEmployees, scenarios: initialScenarios } =
    Route.useLoaderData()

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

  const [scenarios, setScenarios] = useState<SavedScenario[]>(
    initialScenarios as SavedScenario[],
  )
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)
  const [panelOpen, setPanelOpen] = useState(initialScenarios.length > 0)

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

  // Per-row projection helpers — location tab
  const getLocTabLocProjection = (locationKey: string) => {
    const row = locationMap.get(locationKey)!
    const newFactor = getLocNewFactor(locationKey)
    return newFactor !== null
      ? row.currentTotal * (newFactor / row.currentFactor)
      : row.currentTotal
  }
  const getLocTabBenchProjection = (locationKey: string) =>
    activeEmployees
      .filter((emp) => emp.locationKey === locationKey)
      .reduce((sum, emp) => {
        const newBench = getBenchNewFactor(emp.benchmark)
        return (
          sum +
          (newBench !== null && emp.benchmarkSalary !== null
            ? emp.totalSalary * (newBench / emp.benchmarkSalary)
            : emp.totalSalary)
        )
      }, 0)
  const getLocTabTotalProjection = (locationKey: string) => {
    const newLoc = getLocNewFactor(locationKey)
    return activeEmployees
      .filter((emp) => emp.locationKey === locationKey)
      .reduce((sum, emp) => {
        let s = emp.totalSalary
        if (newLoc !== null) s *= newLoc / emp.locationFactor
        const newBench = getBenchNewFactor(emp.benchmark)
        if (newBench !== null && emp.benchmarkSalary !== null)
          s *= newBench / emp.benchmarkSalary
        return sum + s
      }, 0)
  }

  // Per-row projection helpers — benchmark tab
  const getBenchTabLocProjection = (benchmarkKey: string) =>
    activeEmployees
      .filter((emp) => emp.benchmark === benchmarkKey)
      .reduce((sum, emp) => {
        const newLoc = getLocNewFactor(emp.locationKey)
        return (
          sum +
          (newLoc !== null
            ? emp.totalSalary * (newLoc / emp.locationFactor)
            : emp.totalSalary)
        )
      }, 0)
  const getBenchTabBenchProjection = (benchmarkKey: string) => {
    const row = benchmarkMap.get(benchmarkKey)!
    const newFactor = getBenchNewFactor(benchmarkKey)
    return newFactor !== null
      ? row.currentTotal * (newFactor / row.currentFactor)
      : row.currentTotal
  }
  const getBenchTabTotalProjection = (benchmarkKey: string) => {
    const newBench = getBenchNewFactor(benchmarkKey)
    return activeEmployees
      .filter(
        (emp) => emp.benchmark === benchmarkKey && emp.benchmarkSalary !== null,
      )
      .reduce((sum, emp) => {
        let s = emp.totalSalary
        const newLoc = getLocNewFactor(emp.locationKey)
        if (newLoc !== null) s *= newLoc / emp.locationFactor
        if (newBench !== null && emp.benchmarkSalary !== null)
          s *= newBench / emp.benchmarkSalary
        return sum + s
      }, 0)
  }

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

  async function handleSave() {
    const name = saveName.trim()
    if (!name) return
    setSaving(true)
    try {
      const created = await savePayrollScenario({
        data: { name, locationOverrides, benchmarkOverrides },
      })
      setScenarios((prev) => [created as SavedScenario, ...prev])
      setActiveScenarioId((created as SavedScenario).id)
      setSaveDialogOpen(false)
      setSaveName('')
      setPanelOpen(true)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await deletePayrollScenario({ data: { id } })
    setScenarios((prev) => prev.filter((s) => s.id !== id))
    if (activeScenarioId === id) setActiveScenarioId(null)
  }

  function handleLoad(scenario: SavedScenario) {
    setLocationOverrides(scenario.locationOverrides)
    setBenchmarkOverrides(scenario.benchmarkOverrides)
    setActiveScenarioId(scenario.id)
  }

  const activeScenario = scenarios.find((s) => s.id === activeScenarioId)
  const isModified =
    activeScenario !== undefined &&
    (!overridesMatch(locationOverrides, activeScenario.locationOverrides) ||
      !overridesMatch(benchmarkOverrides, activeScenario.benchmarkOverrides))

  return (
    <div className="px-6 pt-14 pb-4">
      <div className="mx-auto w-full max-w-screen-2xl">
        <h1 className="mb-4 text-2xl font-bold">Payroll Scenarios</h1>

        {/* Saved Scenarios panel */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50">
          <button
            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
            onClick={() => setPanelOpen((o) => !o)}
          >
            <span>
              Saved Scenarios{' '}
              {scenarios.length > 0 && (
                <span className="ml-1 rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                  {scenarios.length}
                </span>
              )}
            </span>
            <span className="text-gray-400">{panelOpen ? '▲' : '▼'}</span>
          </button>

          {panelOpen && (
            <div className="border-t border-gray-200 px-4 pt-3 pb-4">
              {scenarios.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No scenarios saved yet. Enter some overrides below and click
                  "Save as…" to save your first scenario.
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {scenarios.map((scenario) => {
                    const isActive = scenario.id === activeScenarioId
                    return (
                      <div
                        key={scenario.id}
                        className={`flex items-center justify-between py-2.5 ${
                          isActive ? 'text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-medium">{scenario.name}</span>
                          {isActive && isModified && (
                            <span className="ml-2 rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700">
                              modified
                            </span>
                          )}
                          <span className="ml-2 text-xs text-gray-400">
                            by {scenario.createdBy.name} ·{' '}
                            {relativeTime(scenario.updatedAt)}
                          </span>
                        </div>
                        <div className="ml-4 flex shrink-0 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLoad(scenario)}
                          >
                            Load
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(scenario.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSaveName('')
                    setSaveDialogOpen(true)
                  }}
                >
                  Save as…
                </Button>
              </div>
            </div>
          )}
        </div>

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
              getLocProjection={getLocTabLocProjection}
              getBenchProjection={getLocTabBenchProjection}
              getTotalProjection={getLocTabTotalProjection}
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
              getLocProjection={getBenchTabLocProjection}
              getBenchProjection={getBenchTabBenchProjection}
              getTotalProjection={getBenchTabTotalProjection}
              showAvgSalary
              factorStep="1000"
              formatFactor={(f) => formatCurrency(Math.round(f))}
            />
          </>
        )}
      </div>

      {/* Save dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save scenario</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Label htmlFor="scenario-name">Name</Label>
            <Input
              id="scenario-name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
              }}
              placeholder="e.g. Q3 planning — location bump"
              autoFocus
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={!saveName.trim() || saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  getLocProjection,
  getBenchProjection,
  getTotalProjection,
  factorStep,
  formatFactor,
  showAvgSalary = false,
  tableRef,
}: {
  rows: GroupRow[]
  columnHeader: string
  overrides: Record<string, string>
  onOverrideChange: (key: string, value: string) => void
  getLocProjection: (key: string) => number
  getBenchProjection: (key: string) => number
  getTotalProjection: (key: string) => number
  factorStep: string
  formatFactor: (factor: number) => string
  showAvgSalary?: boolean
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
            <th className="px-3 py-2 text-left font-medium">{columnHeader}</th>
            <th className="px-3 py-2 text-right font-medium">Current Factor</th>
            <th className="px-3 py-2 text-right font-medium">New Factor</th>
            <th className="px-3 py-2 text-right font-medium">Employees</th>
            <th className="px-3 py-2 text-right font-medium">Current Total</th>
            {showAvgSalary && (
              <th className="px-3 py-2 text-right font-medium">Avg. Salary</th>
            )}
            <th className="px-3 py-2 text-right font-medium">Proj. Location</th>
            <th className="px-3 py-2 text-right font-medium">
              Proj. Benchmark
            </th>
            <th className="px-3 py-2 text-right font-medium">
              Total Projection
            </th>
            <th className="px-3 py-2 text-right font-medium">Change</th>
            <th className="px-3 py-2 text-right font-medium">Change %</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => {
            const rawInput = overrides[row.key] ?? ''
            const isInvalid =
              rawInput.trim() !== '' &&
              (isNaN(parseFloat(rawInput)) || parseFloat(rawInput) <= 0)

            const locProj = getLocProjection(row.key)
            const benchProj = getBenchProjection(row.key)
            const totalProj = getTotalProjection(row.key)
            const change = totalProj - row.currentTotal
            const changePct =
              row.currentTotal !== 0 ? (change / row.currentTotal) * 100 : 0

            const hasLocEffect = Math.abs(locProj - row.currentTotal) > 0.01
            const hasBenchEffect = Math.abs(benchProj - row.currentTotal) > 0.01
            const hasAnyEffect = Math.abs(totalProj - row.currentTotal) > 0.01

            return (
              <tr
                key={row.key}
                className={hasAnyEffect ? 'bg-yellow-50' : undefined}
              >
                <td className="px-3 py-2 font-medium">{row.label}</td>
                <td className="px-3 py-2 text-right">
                  {formatFactor(row.currentFactor)}
                </td>
                <td className="px-3 py-2 text-right">
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
                <td className="px-3 py-2 text-right">{row.employeeCount}</td>
                <td className="px-3 py-2 text-right">
                  {formatCurrency(row.currentTotal)}
                </td>
                {showAvgSalary && (
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(
                      row.employeeCount > 0
                        ? row.currentTotal / row.employeeCount
                        : 0,
                    )}
                  </td>
                )}
                <td className="px-3 py-2 text-right">
                  {hasLocEffect ? (
                    formatCurrency(locProj)
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {hasBenchEffect ? (
                    formatCurrency(benchProj)
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {hasAnyEffect ? (
                    formatCurrency(totalProj)
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td
                  className={`px-3 py-2 text-right font-medium ${
                    !hasAnyEffect
                      ? 'text-gray-400'
                      : change > 0
                        ? 'text-green-600'
                        : change < 0
                          ? 'text-red-600'
                          : ''
                  }`}
                >
                  {hasAnyEffect ? formatCurrency(change) : '—'}
                </td>
                <td
                  className={`px-3 py-2 text-right font-medium ${
                    !hasAnyEffect
                      ? 'text-gray-400'
                      : changePct > 0
                        ? 'text-green-600'
                        : changePct < 0
                          ? 'text-red-600'
                          : ''
                  }`}
                >
                  {hasAnyEffect ? `${changePct.toFixed(2)}%` : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
