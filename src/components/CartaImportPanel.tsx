import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createToast } from 'vercel-toast'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  importCartaOptionGrants,
  getEmployeesForCartaImport,
} from '@/routes/management'

type ImportRow = {
  stakeholderEmail: string
  stakeholderId: string
  stakeholderName: string
  securityId: string
  issuedQuantity: number
  exercisedQuantity: number
  vestedQuantity: number
  expiredQuantity: number
  exercisePrice: number
  vestingSchedule: string
  vestingStartDate: string
  employeeId?: string
  cartaStakeholderId?: string
  error?: string
}

export function CartaImportPanel() {
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<ImportRow[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const getEmployeesFn = useServerFn(getEmployeesForCartaImport)
  const importGrantsFn = useServerFn(importCartaOptionGrants)

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
      createToast('Please upload a CSV or Excel file (.csv, .xlsx, or .xls)', {
        timeout: 3000,
      })
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

        // Normalize headers (lowercase and trim)
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

      const hasStakeholderEmail = 'stakeholder email' in firstRow
      const hasStakeholderId = 'stakeholder id' in firstRow
      const hasQuantityIssued = 'quantity issued' in firstRow

      if (!hasStakeholderEmail || !hasStakeholderId || !hasQuantityIssued) {
        throw new Error(
          'File must contain columns: Stakeholder Email, Stakeholder ID, and Quantity Issued.',
        )
      }

      // Get employee data for matching
      const employees = await getEmployeesFn()

      // Process rows
      const processedRows: ImportRow[] = []

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rowNumber = i + 2 // +2 because 1-indexed and header row

        const stakeholderEmail = row['stakeholder email'] || ''
        const stakeholderId = row['stakeholder id'] || ''
        const stakeholderName = row['stakeholder name'] || ''
        const securityId =
          row['security id'] || row['formatted security id'] || ''

        // Skip rows without stakeholder ID or email
        if (!stakeholderId || !stakeholderEmail) {
          continue
        }

        const normalizedEmail = stakeholderEmail.trim().toLowerCase()

        try {
          // Parse quantities
          const issuedQuantity =
            parseInt(
              String(row['quantity issued'] || '0').replace(/[,]/g, ''),
              10,
            ) || 0
          const exercisedQuantity =
            parseInt(
              String(row['quantity exercised'] || '0').replace(/[,]/g, ''),
              10,
            ) || 0
          const vestedQuantity =
            parseInt(
              String(row['total vested quantity'] || '0').replace(/[,]/g, ''),
              10,
            ) || 0
          const expiredQuantity =
            parseInt(
              String(row['quantity expired'] || '0').replace(/[,]/g, ''),
              10,
            ) || 0

          // Parse exercise price (remove $ and commas)
          const exercisePriceStr = row['exercise price'] || '0'
          const exercisePrice =
            parseFloat(String(exercisePriceStr).replace(/[$,]/g, '')) || 0

          // Parse vesting info
          const vestingSchedule = row['vesting schedule'] || ''
          const vestingStartDate = row['vesting start date'] || ''

          // Skip rows with no issued options
          if (issuedQuantity === 0) {
            continue
          }

          // Find employee by work email or personal email
          const employee = employees.find(
            (emp: {
              email: string
              deelEmployee: { personalEmail: string | null } | null
            }) =>
              emp.email.toLowerCase() === normalizedEmail ||
              emp.deelEmployee?.personalEmail?.toLowerCase() ===
                normalizedEmail,
          )

          if (!employee) {
            processedRows.push({
              stakeholderEmail: normalizedEmail,
              stakeholderId: stakeholderId.trim(),
              stakeholderName: stakeholderName.trim(),
              securityId: securityId.trim(),
              issuedQuantity,
              exercisedQuantity,
              vestedQuantity,
              expiredQuantity,
              exercisePrice,
              vestingSchedule: vestingSchedule.trim(),
              vestingStartDate: vestingStartDate.trim(),
              error: `Employee not found with email: ${stakeholderEmail}`,
            })
            continue
          }

          processedRows.push({
            stakeholderEmail: normalizedEmail,
            stakeholderId: stakeholderId.trim(),
            stakeholderName: stakeholderName.trim(),
            securityId: securityId.trim(),
            issuedQuantity,
            exercisedQuantity,
            vestedQuantity,
            expiredQuantity,
            exercisePrice,
            vestingSchedule: vestingSchedule.trim(),
            vestingStartDate: vestingStartDate.trim(),
            employeeId: employee.id,
            cartaStakeholderId:
              employee.cartaStakeholderId || stakeholderId.trim(),
          })
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
          processedRows.push({
            stakeholderEmail: normalizedEmail,
            stakeholderId: stakeholderId.trim(),
            stakeholderName: stakeholderName.trim(),
            securityId: securityId.trim(),
            issuedQuantity: 0,
            exercisedQuantity: 0,
            vestedQuantity: 0,
            expiredQuantity: 0,
            exercisePrice: 0,
            vestingSchedule: '',
            vestingStartDate: '',
            error: `Row ${rowNumber}: ${errorMessage}`,
          })
        }
      }

      const errors = processedRows.filter((r) => r.error)
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
      const result = await importGrantsFn({
        data: {
          grants: validRows.map((row) => ({
            employeeId: row.employeeId!,
            stakeholderId: row.stakeholderId,
            grantId:
              row.securityId || `import-${row.stakeholderId}-${Date.now()}`,
            issuedQuantity: row.issuedQuantity,
            exercisedQuantity: row.exercisedQuantity,
            vestedQuantity: row.vestedQuantity,
            expiredQuantity: row.expiredQuantity,
            exercisePrice: row.exercisePrice,
            vestingSchedule: row.vestingSchedule || undefined,
            vestingStartDate: row.vestingStartDate || undefined,
          })),
        },
      })

      createToast(
        `Successfully imported ${result.successCount} option grant(s). All previous grants have been deleted. ${result.errorCount > 0 ? `${result.errorCount} error(s) occurred.` : ''}`,
        {
          timeout: 5000,
        },
      )
      console.log(result)

      // Reset form
      setFile(null)
      setPreviewData([])
      const fileInput = document.querySelector(
        'input[type="file"][accept=".csv,.xls,.xlsx"]',
      ) as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }
    } catch (error) {
      createToast(
        error instanceof Error
          ? error.message
          : 'Failed to import option grants',
        { timeout: 3000 },
      )
    } finally {
      setIsImporting(false)
    }
  }

  const validRowCount = previewData.filter(
    (r) => !r.error && r.employeeId,
  ).length
  const errorRowCount = previewData.filter((r) => r.error).length

  return (
    <Card>
      <CardHeader>
        <CardTitle>Carta Option Grants Import</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="carta-file">Upload Carta Export (CSV or Excel)</Label>
          <Input
            id="carta-file"
            type="file"
            accept=".csv,.xls,.xlsx"
            onChange={handleFileChange}
          />
          <p className="text-muted-foreground text-sm">
            Expect an "Equity Plan Granted" report from Carta. You'll need to
            remove the extra header rows manually.
          </p>
        </div>

        {file && (
          <Button onClick={parseFile} disabled={isProcessing}>
            {isProcessing ? 'Processing…' : 'Parse & Preview'}
          </Button>
        )}

        {previewData.length > 0 && (
          <div className="space-y-4">
            <div className="text-sm font-medium">
              Preview ({validRowCount} valid, {errorRowCount} errors)
            </div>
            <div className="max-h-96 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stakeholder Email</TableHead>
                    <TableHead>Stakeholder Name</TableHead>
                    <TableHead>Security ID</TableHead>
                    <TableHead className="text-right">Qty Issued</TableHead>
                    <TableHead className="text-right">Exercised</TableHead>
                    <TableHead className="text-right">Vested</TableHead>
                    <TableHead className="text-right">Expired</TableHead>
                    <TableHead className="text-right">Exercise Price</TableHead>
                    <TableHead>Vesting Schedule</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.stakeholderEmail}</TableCell>
                      <TableCell>{row.stakeholderName || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.securityId || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.issuedQuantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.exercisedQuantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.vestedQuantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.expiredQuantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.exercisePrice > 0
                          ? `$${row.exercisePrice.toFixed(2)}`
                          : '-'}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-xs">
                        {row.vestingSchedule || '-'}
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
              disabled={isImporting || validRowCount === 0}
            >
              {isImporting ? 'Importing…' : `Import ${validRowCount} Grant(s)`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
