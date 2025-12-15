import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import MarkdownComponent from '@/lib/MarkdownComponent'

export const Route = createFileRoute('/process')({
  component: RouteComponent,
})

function RouteComponent() {
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useLocalStorage<string>(
    'pay-review-process',
    '',
  )
  const [localContent, setLocalContent] = useState('')

  const handleEdit = () => {
    setLocalContent(content)
    setIsEditing(true)
  }

  const handleSave = () => {
    setContent(localContent)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setLocalContent(content)
    setIsEditing(false)
  }

  return (
    <div className="flex w-screen justify-center px-4">
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
            {content ? (
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
