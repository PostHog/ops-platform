import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createToast } from 'vercel-toast'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import {
  calculateCommissionBonus,
  getPreviousQuarter,
  validateQuarterFormat,
  validateQuota,
  validateAttainment,
  calculateQuarterBreakdown,
  type QuarterBreakdown,
} from '@/lib/commission-calculator'
import {
  importCommissionBonuses,
  getEmployeesForImport,
} from '@/routes/management'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type ImportRow = {
  email: string
  quota: number
  attainment: number
  quarter: string
  employeeId?: string
  bonusAmount?: number
  calculatedAmount?: number
  attainmentPercentage?: number
  quarterBreakdown?: QuarterBreakdown
  notes?: string
  error?: string
}

export function CommissionImportPanel() {
  const [file, setFile] = useState<File | null>(null)
  const [quarter, setQuarter] = useState(getPreviousQuarter())
  const [previewData, setPreviewData] = useState<ImportRow[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const getEmployeesFn = useServerFn(getEmployeesForImport)
  const importBonusesFn = useServerFn(importCommissionBonuses)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validate file type
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]
    const validExtensions = ['.csv', '.xls', '.xlsx']

    const fileExtension = selectedFile.name
      .toLowerCase()
      .substring(selectedFile.name.lastIndexOf('.'))
    const isValidType =
      validTypes.includes(selectedFile.type) ||
      validExtensions.includes(fileExtension)

    if (!isValidType) {
      createToast('Please upload a CSV or Excel file', { timeout: 3000 })
      return
    }

    // Validate file size (10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      createToast('File size exceeds 10MB limit', { timeout: 3000 })
      return
    }

    setFile(selectedFile)
    setPreviewData([])
  }

  const parseFile = async () => {
    if (!file) return

    setIsProcessing(true)
    try {
      let rows: any[] = []

      if (file.name.endsWith('.csv')) {
        // Parse CSV
        const text = await file.text()
        const result = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header: string) => header.trim().toLowerCase(),
        })

        if (result.errors.length > 0) {
          throw new Error(
            `CSV parsing errors: ${result.errors.map((e: Papa.ParseError) => e.message).join(', ')}`,
          )
        }

        rows = result.data
      } else {
        // Parse Excel
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        rows = XLSX.utils.sheet_to_json(worksheet, {
          defval: '',
          raw: false,
        })

        // Normalize headers
        rows = rows.map((row: any) => {
          const normalized: any = {}
          for (const key in row) {
            normalized[key.trim().toLowerCase()] = row[key]
          }
          return normalized
        })
      }

      // Validate required columns
      const firstRow = rows[0]
      if (!firstRow) {
        throw new Error('File is empty')
      }

      const hasEmail =
        'email' in firstRow ||
        'employee email' in firstRow ||
        'work email' in firstRow
      const hasQuota = 'quota' in firstRow || 'sales quota' in firstRow
      const hasAttainment =
        'attainment' in firstRow ||
        'sales attainment' in firstRow ||
        'actual attainment' in firstRow

      if (!hasEmail || !hasQuota || !hasAttainment) {
        throw new Error(
          'File must contain columns: email, quota, and attainment.',
        )
      }

      // Get employee data for matching
      const employees = await getEmployeesFn()

      // Process rows
      const processedRows: ImportRow[] = []
      const errors: string[] = []

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rowNumber = i + 2 // +2 because 1-indexed and header row

        try {
          // Extract email (try multiple column names)
          const email =
            row.email ||
            row['employee email'] ||
            row['work email'] ||
            row['e-mail'] ||
            ''

          if (!email || typeof email !== 'string') {
            throw new Error('Email is required')
          }

          const normalizedEmail = email.trim().toLowerCase()

          // Find employee
          const employee = employees.find(
            (emp: { email: string }) =>
              emp.email.toLowerCase() === normalizedEmail,
          )

          if (!employee) {
            throw new Error(`Employee not found with email: ${email}`)
          }

          // Extract quota
          const quotaStr =
            row.quota || row['sales quota'] || row['quota amount'] || ''
          const quota = parseFloat(String(quotaStr).replace(/[,$]/g, ''))

          if (isNaN(quota)) {
            throw new Error('Invalid quota value')
          }

          if (!validateQuota(quota)) {
            throw new Error('Quota must be greater than 0')
          }

          // Extract attainment
          const attainmentStr =
            row.attainment ||
            row['sales attainment'] ||
            row['actual attainment'] ||
            ''
          const attainment = parseFloat(
            String(attainmentStr).replace(/[,$]/g, ''),
          )

          if (isNaN(attainment)) {
            throw new Error('Invalid attainment value')
          }

          if (!validateAttainment(attainment)) {
            throw new Error('Attainment must be greater than or equal to 0')
          }

          // Use default quarter (always use the quarter from the input field)
          if (!validateQuarterFormat(quarter)) {
            throw new Error(
              `Invalid quarter format: ${quarter}. Expected format: YYYY-QN (e.g., 2025-Q1)`,
            )
          }

          // Get latest salary bonus amount (annual) and divide by 4 for quarterly
          const latestSalary = employee.salaries?.[0]
          const annualBonusAmount = latestSalary?.bonusAmount || 0

          if (annualBonusAmount <= 0) {
            throw new Error(
              'Employee has no bonus amount in their latest salary record',
            )
          }

          // Convert annual bonus to quarterly bonus
          const quarterlyBonusAmount = annualBonusAmount / 4

          // Calculate quarter breakdown (not employed, ramp-up, post ramp-up)
          const startDate = employee.deelEmployee?.startDate
            ? new Date(employee.deelEmployee.startDate)
            : null
          const quarterBreakdown = calculateQuarterBreakdown(startDate, quarter)

          // Calculate commission bonus using quarterly bonus amount
          // Pro-rated: ramp-up portion gets 100% OTE, post ramp-up gets attainment%
          const calculatedAmount = calculateCommissionBonus(
            attainment,
            quota,
            quarterlyBonusAmount,
            quarterBreakdown,
          )

          // Calculate attainment percentage
          const attainmentPercentage = (attainment / quota) * 100

          // Extract notes (optional)
          const notes: string = row.notes || ''

          processedRows.push({
            email: normalizedEmail,
            quota,
            attainment,
            quarter: quarter,
            employeeId: employee.id,
            bonusAmount: quarterlyBonusAmount,
            calculatedAmount,
            attainmentPercentage,
            quarterBreakdown,
            notes: notes.trim(),
          })
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
          errors.push(`Row ${rowNumber}: ${errorMessage}`)
          processedRows.push({
            email:
              row.email || row['employee email'] || row['work email'] || '',
            quota: 0,
            attainment: 0,
            quarter: quarter,
            error: errorMessage,
          })
        }
      }

      if (errors.length > 0) {
        createToast(
          `Found ${errors.length} error(s) in the file. Please review the preview.`,
          { timeout: 5000 },
        )
      }

      setPreviewData(processedRows)
    } catch (error) {
      createToast(
        error instanceof Error ? error.message : 'Failed to parse file',
        { timeout: 3000 },
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImport = async () => {
    if (previewData.length === 0) {
      createToast('No data to import', { timeout: 3000 })
      return
    }

    const validRows = previewData.filter((row) => !row.error && row.employeeId)
    if (validRows.length === 0) {
      createToast('No valid rows to import', { timeout: 3000 })
      return
    }

    setIsImporting(true)
    try {
      const result = await importBonusesFn({
        data: {
          bonuses: validRows.map((row) => ({
            employeeId: row.employeeId!,
            quarter: row.quarter,
            quota: row.quota,
            attainment: row.attainment,
            bonusAmount: row.bonusAmount!,
            calculatedAmount: row.calculatedAmount!,
            notes: row.notes,
          })),
        },
      })

      createToast(
        `Successfully imported ${result.successCount} commission bonus(es). ${result.errorCount > 0 ? `${result.errorCount} error(s) occurred.` : ''}`,
        {
          timeout: 5000,
        },
      )
      console.log(result)

      // Reset form
      setFile(null)
      setPreviewData([])
      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }
    } catch (error) {
      createToast(
        error instanceof Error ? error.message : 'Failed to import bonuses',
        { timeout: 3000 },
      )
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commission Bonus Import</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="quarter">Quarter (YYYY-QN format)</Label>
          <Input
            id="quarter"
            type="text"
            value={quarter}
            onChange={(e) => setQuarter(e.target.value)}
            placeholder="2025-Q1"
          />
          <p className="text-muted-foreground text-sm">
            Defaults to previous quarter.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="file">Upload CSV or Excel File</Label>
          <Input
            id="file"
            type="file"
            accept=".csv,.xls,.xlsx"
            onChange={handleFileChange}
          />
          <p className="text-muted-foreground text-sm">
            Expected columns: email, quota, attainment, notes (optional).
          </p>
        </div>

        {file && (
          <Button onClick={parseFile} disabled={isProcessing}>
            {isProcessing ? 'Processing...' : 'Parse & Preview'}
          </Button>
        )}

        {previewData.length > 0 && (
          <div className="space-y-4">
            <div className="text-sm font-medium">
              Preview ({previewData.filter((r) => !r.error).length} valid,{' '}
              {previewData.filter((r) => r.error).length} errors)
            </div>
            <div className="max-h-96 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Quota</TableHead>
                    <TableHead>Attainment</TableHead>
                    <TableHead>Attainment %</TableHead>
                    <TableHead>Bonus Amount</TableHead>
                    <TableHead>Calculated Bonus</TableHead>
                    <TableHead>Quarter Breakdown</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>
                        {row.quota > 0
                          ? new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'USD',
                            }).format(row.quota)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {row.attainment > 0
                          ? new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'USD',
                            }).format(row.attainment)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {row.attainmentPercentage !== undefined
                          ? `${row.attainmentPercentage.toFixed(1)}%`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {row.bonusAmount
                          ? new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'USD',
                            }).format(row.bonusAmount)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {row.calculatedAmount
                          ? new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'USD',
                            }).format(row.calculatedAmount)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {row.quarterBreakdown ? (
                          <div className="space-y-0.5 text-xs">
                            {row.quarterBreakdown.notEmployedMonths > 0 && (
                              <div className="text-muted-foreground">
                                {row.quarterBreakdown.notEmployedMonths} not
                                employed
                              </div>
                            )}
                            {row.quarterBreakdown.rampUpMonths > 0 && (
                              <div className="text-blue-600">
                                {row.quarterBreakdown.rampUpMonths} ramp-up
                                (100% OTE)
                              </div>
                            )}
                            {row.quarterBreakdown.postRampUpMonths > 0 && (
                              <div className="text-green-600">
                                {row.quarterBreakdown.postRampUpMonths} post
                                ramp-up
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.notes ? (
                          <span className="text-muted-foreground max-w-[200px] truncate text-xs">
                            {row.notes}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.error ? (
                          <span className="text-destructive text-xs">
                            {row.error}
                          </span>
                        ) : (
                          <span className="text-xs text-green-600">
                            ✓ Valid
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button
              onClick={handleImport}
              disabled={
                isImporting ||
                previewData.filter((r) => !r.error && r.employeeId).length === 0
              }
            >
              {isImporting
                ? 'Importing...'
                : `Import ${previewData.filter((r) => !r.error && r.employeeId).length} Valid Bonus(es)`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
