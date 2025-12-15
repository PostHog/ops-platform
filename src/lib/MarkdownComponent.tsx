import ReactMarkdown from 'react-markdown'
import type { ReactNode } from 'react'
import remarkBreaks from 'remark-breaks'

export default function MarkdownComponent({
  children,
}: {
  children: ReactNode
}): ReactNode {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold">{children}</h1>
        ),
        h2: ({ children }) => <h2 className="text-xl font-bold">{children}</h2>,
        h3: ({ children }) => <h3 className="text-lg font-bold">{children}</h3>,
        h4: ({ children }) => (
          <h4 className="text-base font-bold">{children}</h4>
        ),
        h5: ({ children }) => <h5 className="text-sm font-bold">{children}</h5>,
        h6: ({ children }) => <h6 className="text-xs font-bold">{children}</h6>,
        ul: ({ children }) => (
          <ul className="list-inside list-disc">{children}</ul>
        ),
        ol: ({ children }) => (
          <ul className="list-inside list-decimal">{children}</ul>
        ),
        br: ({ children }) => <br>{children}</br>,
      }}
      remarkPlugins={[remarkBreaks]}
    >
      {String(children).replaceAll(/(?<=\n\n)(?![*-])\n/gi, '&nbsp;\n')}
    </ReactMarkdown>
  )
}
