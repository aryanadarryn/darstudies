import { useEffect } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { ToolEmbed, hasToolComponent } from '../components/tools/registry'
import { PageHeader } from '../components/ui'
import { TOOLS } from '../content/toolIds'
import { useT } from '../i18n/useT'
import { completeMatching } from '../lib/actions'

export default function ToolPage() {
  const { toolId = '' } = useParams()
  const [params] = useSearchParams()
  const { L } = useT()
  const tool = TOOLS.find((x) => x.id === toolId)
  const taskId = params.get('task')

  // Opening a scheduled tool task counts as doing it.
  useEffect(() => { if (taskId) void completeMatching(taskId, 'tool', toolId) }, [taskId, toolId])

  if (!tool || !hasToolComponent(toolId)) return <Navigate to="/practice/tools" replace />
  return (
    <div className="desk:mx-auto desk:max-w-3xl">
      <PageHeader back title={`🧪 ${L(tool.name)}`} />
      <ToolEmbed id={toolId} />
    </div>
  )
}
