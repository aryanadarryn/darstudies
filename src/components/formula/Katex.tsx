import katex from 'katex'
import { useMemo } from 'react'

export default function Katex({ tex, block = false, className = '' }: { tex: string; block?: boolean; className?: string }) {
  const html = useMemo(() => katex.renderToString(tex, { throwOnError: false, displayMode: block }), [tex, block])
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
}
