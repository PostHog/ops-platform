import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getAuditLogsFn } from '@/routes/audit-logs'
import type { AuditLogEntry, AuditLogEntityType } from '@/lib/audit-log'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

function formatTimestamp(timestamp: Date): string {
  const date = dayjs(timestamp)
  const now = dayjs()
  const diffDays = now.diff(date, 'day')

  if (diffDays < 7) {
    return date.fromNow()
  }

  return date.format('MMM D, YYYY h:mm A')
}

export function AuditLogHistoryDialog({
  entityType,
  entityId,
  title,
  open,
  onOpenChange,
}: {
  entityType: AuditLogEntityType
  entityId: string
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const getAuditLogs = useServerFn(getAuditLogsFn)
  const { data: auditLogs, isLoading } = useQuery<AuditLogEntry[]>({
    queryKey: ['auditLogs', entityType, entityId],
    queryFn: () => getAuditLogs({ data: { entityType, entityId } }),
    enabled: open,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">Loading...</div>
          ) : !auditLogs || auditLogs.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No history available.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Changed by</TableHead>
                  <TableHead>Old value</TableHead>
                  <TableHead>New value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {formatTimestamp(log.timestamp)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>
                        <div className="font-medium">{log.actor.name}</div>
                        <div className="text-xs text-gray-500">
                          {log.actor.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.oldValue ?? (
                        <span className="text-gray-400 italic">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.newValue ?? (
                        <span className="text-gray-400 italic">None</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
