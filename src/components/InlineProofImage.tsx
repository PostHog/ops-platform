import { memo, useCallback, useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useServerFn } from '@tanstack/react-start'
import { getProofFileUrl } from '@/routes/employee.$employeeId'

interface InlineProofImageProps {
  fileId: string
  fileName: string
}

function isSafeUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

export const InlineProofImage = memo(function InlineProofImage({
  fileId,
  fileName,
}: InlineProofImageProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const getFileUrl = useServerFn(getProofFileUrl)

  const fetchUrl = useCallback(() => {
    setError(false)
    setUrl(null)
    getFileUrl({ data: { proofFileId: fileId } })
      .then((result) => {
        if (isSafeUrl(result.url)) {
          setUrl(result.url)
        } else {
          setError(true)
        }
      })
      .catch(() => {
        setError(true)
      })
  }, [fileId])

  useEffect(() => {
    fetchUrl()
  }, [fetchUrl])

  if (error) {
    return (
      <button
        type="button"
        onClick={fetchUrl}
        className="flex h-32 w-full items-center justify-center gap-2 rounded border border-gray-200 bg-gray-50 text-sm text-gray-500 hover:bg-gray-100"
      >
        <AlertTriangle className="h-4 w-4" />
        Failed to load {fileName}
        <RefreshCw className="h-3.5 w-3.5" />
      </button>
    )
  }

  if (!url) {
    return (
      <div className="h-32 w-full animate-pulse rounded border border-gray-200 bg-gray-100" />
    )
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <img
        src={url}
        alt={fileName}
        className="max-h-[300px] max-w-full cursor-pointer rounded border border-gray-200 transition-colors hover:border-gray-400"
      />
    </a>
  )
})

export function isImageFile(
  fileName: string,
  mimeType?: string | null,
): boolean {
  if (mimeType?.startsWith('image/')) return true
  const ext = fileName.toLowerCase().split('.').pop()
  return ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')
}
