import { memo, useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { getProofFileUrl } from '@/routes/employee.$employeeId'

interface InlineProofImageProps {
  fileId: string
  fileName: string
}

export const InlineProofImage = memo(function InlineProofImage({
  fileId,
  fileName,
}: InlineProofImageProps) {
  const [url, setUrl] = useState<string | null>(null)
  const getFileUrl = useServerFn(getProofFileUrl)

  useEffect(() => {
    getFileUrl({ data: { proofFileId: fileId } })
      .then((result) => {
        try {
          const parsed = new URL(result.url)
          if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
            setUrl(result.url)
          }
        } catch {
          // Invalid URL, ignore
        }
      })
      .catch(() => {})
  }, [fileId])

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
