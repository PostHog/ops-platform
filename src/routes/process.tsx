import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import MarkdownComponent from '@/lib/MarkdownComponent'
import { createAuthenticatedFn } from '@/lib/auth-middleware'
import prisma from '@/db'

const getProcessDocument = createAuthenticatedFn({
  method: 'GET',
}).handler(async () => {
  const document = await prisma.processDocument.findUnique({
    where: { id: 'process' },
  })
  return document?.content || ''
})

const saveProcessDocument = createAuthenticatedFn({
  method: 'POST',
})
  .inputValidator((d: { content: string }) => d)
  .handler(async ({ data }) => {
    await prisma.processDocument.upsert({
      where: { id: 'process' },
      update: { content: data.content },
      create: { id: 'process', content: data.content },
    })
    return { success: true }
  })

export const Route = createFileRoute('/process')({
  component: RouteComponent,
})

function RouteComponent() {
  const [isEditing, setIsEditing] = useState(false)
  const [localContent, setLocalContent] = useState('')

  const getProcessDocumentFn = useServerFn(getProcessDocument)
  const saveProcessDocumentFn = useServerFn(saveProcessDocument)

  const {
    data: content = '',
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['process-document'],
    queryFn: () => getProcessDocumentFn(),
  })

  const handleEdit = () => {
    setLocalContent(content)
    setIsEditing(true)
  }

  const handleSave = async () => {
    await saveProcessDocumentFn({ data: { content: localContent } })
    await refetch()
    setIsEditing(false)
  }

  const handleCancel = () => {
    setLocalContent(content)
    setIsEditing(false)
  }

  return (
    <div className="flex justify-center px-4 pb-4">
      <div className="max-w-full flex-grow 2xl:max-w-[80%]">
        <div className="flex justify-between py-4">
          <div className="text-lg font-bold">Pay Review Process</div>
          {!isEditing && (
            <Button onClick={handleEdit} variant="outline">
              Edit
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="flex flex-col gap-4">
            <Textarea
              value={localContent}
              onChange={(e) => setLocalContent(e.target.value)}
              placeholder="Enter markdown content here..."
              className="min-h-[600px] font-mono text-sm"
            />
            <div className="flex gap-2">
              <Button onClick={handleSave}>Save</Button>
              <Button onClick={handleCancel} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-gray-50 p-6">
            {isFetching ? (
              <div className="text-center text-gray-500">Loading...</div>
            ) : content ? (
              <MarkdownComponent>{content}</MarkdownComponent>
            ) : (
              <div className="text-center text-gray-500">
                No content yet. Click Edit to add process documentation.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
