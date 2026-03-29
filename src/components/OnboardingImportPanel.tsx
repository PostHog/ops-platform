import { useState } from 'react'
import Papa from 'papaparse'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createToast } from 'vercel-toast'

// ─── Parsing helpers ─────────────────────────────────────────────────────────

function parseReferral(value: string | undefined): {
  referral: boolean
  referredBy: string | null
} {
  if (!value || value.toLowerCase() === 'no')
    return { referral: false, referredBy: null }
  const lower = value.toLowerCase().trim()
  if (!lower.startsWith('yes')) return { referral: false, referredBy: null }

  // Extract name from patterns: "Yes (Name)", "Yes, Name", "Yes- Name", "yes Name"
  const match = value.match(/yes[,\s\-(\s]*(.+?)\)?$/i)
  return { referral: true, referredBy: match?.[1]?.trim() || null }
}

function parseStatus(
  contractSigned: string | undefined,
  startedChecklist: string | undefined,
): string {
  const cs = (contractSigned || '').toLowerCase().trim()
  if (cs.includes('revoked')) return '__skip__'
  if (cs.includes('signed')) return 'contract_signed'
  if (cs.includes('sent')) return 'contract_sent'
  if ((startedChecklist || '').toLowerCase().trim() === 'yes') return 'started'
  return 'offer_accepted'
}

function parseLaptopStatus(value: string | undefined): string {
  if (!value) return 'Need to order'
  const lower = value.toLowerCase().trim()
  if (lower.includes('delivered')) return 'Delivered'
  if (
    lower.includes('ordered') ||
    lower.includes('assigned') ||
    lower.includes('shipped')
  )
    return 'Ordered'
  return 'Need to order'
}

function parseDate(value: string | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  // Skip non-date text
  if (/offsite|f2f|amsterdam|tbc|n\/a/i.test(trimmed)) return null

  // Try native Date parsing for formats like "April 6, 2026", "Apr 7, 2026"
  const d = new Date(trimmed)
  if (!isNaN(d.getTime()) && d.getFullYear() > 2000) {
    return d.toISOString().split('T')[0]
  }

  // Try DD/MM/YYYY format (European dates like "18/02/2026")
  const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy
    const parsed = new Date(Number(year), Number(month) - 1, Number(day))
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0]
  }

  // Try MM/DD/YY format
  const mmddyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/)
  if (mmddyy) {
    const [, month, day, year] = mmddyy
    const fullYear = Number(year) + 2000
    const parsed = new Date(fullYear, Number(month) - 1, Number(day))
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0]
  }

  return null
}

function parseQuarter(
  value: string | undefined,
  startDate: string | null,
): string | null {
  if (!value) return null
  const q = value.trim().toUpperCase()
  if (!q.match(/^Q[1-4]/)) return null

  // Derive year from start date if available, otherwise current year
  let year: number
  if (startDate) {
    year = new Date(startDate).getFullYear() % 100
  } else {
    year = new Date().getFullYear() % 100
  }
  return `${q.substring(0, 2)} ${year}`
}

type ParsedRow = {
  name: string
  role: string
  team: string
  startDate: string | null
  location: string | null
  quarter: string | null
  referral: boolean
  referredBy: string | null
  contractType: string | null
  status: string
  laptopStatus: string
  welcomeCallDate: string | null
  managerName: string | null
  notes: string | null
  isValid: boolean
  validationError: string | null
  isUpdate: boolean
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim()
}

function parseCSVRow(
  row: Record<string, string>,
  existingNames: Set<string>,
): ParsedRow | null {
  // Find values by normalized header matching
  const get = (patterns: string[]): string | undefined => {
    for (const [key, val] of Object.entries(row)) {
      const norm = normalizeHeader(key)
      if (patterns.some((p) => norm.includes(p))) return val?.trim()
    }
    return undefined
  }

  const name = get(['name']) || ''

  // Skip section headers, empty rows, and referral table rows
  if (
    !name ||
    name.toLowerCase() === 'name' ||
    name.toLowerCase().includes('started recently') ||
    name.toLowerCase().includes('referral')
  )
    return null

  const role = get(['role']) || ''
  const team = get(['team']) || ''
  const startDateRaw = get(['start date', 'start_date'])
  const manager = get(['manager']) || null
  const location =
    get(['time zone', 'timezone', 'time_zone', 'location']) || null
  const quarterRaw = get(['quarter'])
  const contractType = get(['contract type', 'contract_type']) || null
  const referralRaw = get(['referral'])
  const contractSignedRaw = get(['contract signed', 'contract_signed'])
  const startedChecklistRaw = get(['started checklist', 'started_checklist'])
  const laptopRaw = get(['laptop'])
  const welcomeCallRaw = get(['welcome call', 'scott', 'welcome_call'])
  const opsOwner = get(['ops owner', 'ops_owner'])

  if (!name) return null

  const startDate = parseDate(startDateRaw)
  const { referral, referredBy } = parseReferral(referralRaw)
  const status = parseStatus(contractSignedRaw, startedChecklistRaw)
  const laptopStatus = parseLaptopStatus(laptopRaw)
  const welcomeCallDate = parseDate(welcomeCallRaw)
  const quarter = parseQuarter(quarterRaw, startDate)

  if (status === '__skip__') return null

  let notes: string | null = null
  if (opsOwner) notes = `Ops owner: ${opsOwner}`

  const isValid = !!(name && role && team)
  const validationError = !isValid
    ? `Missing: ${[!name && 'name', !role && 'role', !team && 'team'].filter(Boolean).join(', ')}`
    : null

  const isUpdate = existingNames.has(name.toLowerCase().trim())

  return {
    name,
    role,
    team,
    startDate,
    location,
    quarter,
    referral,
    referredBy,
    contractType,
    status,
    laptopStatus,
    welcomeCallDate,
    managerName: manager,
    notes,
    isValid,
    validationError,
    isUpdate,
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function OnboardingImportPanel({
  open,
  onOpenChange,
  existingNames,
  importFn,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingNames: string[]
  importFn: (args: {
    data: { items: any[] }
  }) => Promise<{ created: number; updated: number; errors: string[] }>
  onSuccess: () => void
}) {
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  const existingSet = new Set(existingNames.map((n) => n.toLowerCase().trim()))

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      createToast('File too large (max 10MB)', { type: 'error', timeout: 4000 })
      return
    }

    setFileName(file.name)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = (results.data as Record<string, string>[])
          .map((row) => parseCSVRow(row, existingSet))
          .filter((r): r is ParsedRow => r !== null)

        setRows(parsed)

        if (parsed.length === 0) {
          createToast('No valid rows found in CSV', {
            type: 'error',
            timeout: 4000,
          })
        }
      },
      error: (err) => {
        createToast(`Failed to parse CSV: ${err.message}`, {
          type: 'error',
          timeout: 4000,
        })
      },
    })
  }

  const validRows = rows.filter((r) => r.isValid)
  const newCount = validRows.filter((r) => !r.isUpdate).length
  const updateCount = validRows.filter((r) => r.isUpdate).length

  const handleImport = async () => {
    if (validRows.length === 0) return
    setImporting(true)
    try {
      const result = await importFn({
        data: {
          items: validRows.map((r) => ({
            name: r.name,
            role: r.role,
            team: r.team,
            startDate: r.startDate,
            location: r.location,
            quarter: r.quarter,
            referral: r.referral,
            referredBy: r.referredBy,
            contractType: r.contractType,
            status: r.status,
            laptopStatus: r.laptopStatus,
            welcomeCallDate: r.welcomeCallDate,
            managerName: r.managerName,
            notes: r.notes,
          })),
        },
      })

      const msg = `Import complete: ${result.created} created, ${result.updated} updated${result.errors.length > 0 ? `, ${result.errors.length} errors` : ''}`
      createToast(msg, {
        type: result.errors.length > 0 ? 'error' : 'success',
        timeout: 5000,
      })

      if (result.errors.length > 0) {
        console.error('Import errors:', result.errors)
      }

      onSuccess()
      onOpenChange(false)
      setRows([])
      setFileName(null)
    } catch {
      createToast('Import failed — please try again', {
        type: 'error',
        timeout: 4000,
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) {
          setRows([])
          setFileName(null)
        }
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import onboarding records from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <p className="text-muted-foreground mb-2 text-sm">
              Export your Google Sheet as CSV and upload it here. Records are
              matched by name — existing records will be updated, new ones
              created.
            </p>
            <Input
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="max-w-sm"
            />
            {fileName && (
              <p className="text-muted-foreground mt-1 text-xs">
                File: {fileName}
              </p>
            )}
          </div>

          {rows.length > 0 && (
            <>
              <div className="flex items-center gap-4 text-sm">
                <span>{rows.length} rows parsed</span>
                <span className="font-medium text-green-600">
                  {newCount} new
                </span>
                <span className="font-medium text-amber-600">
                  {updateCount} updates
                </span>
                {rows.filter((r) => !r.isValid).length > 0 && (
                  <span className="font-medium text-red-600">
                    {rows.filter((r) => !r.isValid).length} invalid
                  </span>
                )}
              </div>

              <div className="max-h-[50vh] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="w-16">Status</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Contract</TableHead>
                      <TableHead>Pipeline Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, i) => (
                      <TableRow
                        key={i}
                        className={
                          !row.isValid
                            ? 'bg-red-50'
                            : row.isUpdate
                              ? 'bg-amber-50'
                              : ''
                        }
                      >
                        <TableCell className="text-xs">
                          {!row.isValid ? (
                            <span className="font-medium text-red-600">
                              Invalid
                            </span>
                          ) : row.isUpdate ? (
                            <span className="font-medium text-amber-600">
                              Update
                            </span>
                          ) : (
                            <span className="font-medium text-green-600">
                              New
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {row.name || '—'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.role || '—'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.team || '—'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.startDate || '—'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.managerName || '—'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.location || '—'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.contractType || '—'}
                        </TableCell>
                        <TableCell className="text-xs">{row.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleImport}
            disabled={importing || validRows.length === 0}
          >
            {importing ? 'Importing…' : `Import ${validRows.length} records`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
