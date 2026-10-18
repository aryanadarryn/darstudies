import { Link } from 'react-router-dom'
import { PageHeader, Pill } from '../components/ui'
import { chapterById, subjectById } from '../content'
import { TOOLS } from '../content/toolIds'
import { useT } from '../i18n/useT'

export default function ToolsPage() {
  const { t, L } = useT()
  return (
    <div>
      <PageHeader back="/practice" title={`🧪 ${t('tools.title')}`} />
      <ul className="space-y-2 desk:grid desk:grid-cols-2 desk:gap-3 desk:space-y-0">
        {TOOLS.map((tool) => {
          const chips = tool.chapters.map((id) => {
            const c = chapterById[id]
            return <Pill key={id} color={subjectById[c.subjectId].color}>{L(subjectById[c.subjectId].name)} {c.number}</Pill>
          })
          const inner = (
            <>
              <div className="flex-1">
                <div className="font-semibold">{L(tool.name)}</div>
                <div className="mt-1 flex flex-wrap gap-1">{chips}</div>
              </div>
              {tool.built ? <span className="text-violet-700 dark:text-violet-300">→</span> : <Pill>{t('common.comingSoon')}</Pill>}
            </>
          )
          return (
            <li key={tool.id}>
              {tool.built
                ? <Link to={`/practice/tools/${tool.id}`} className="card flex items-center gap-3">{inner}</Link>
                : <div className="card flex items-center gap-3 opacity-60">{inner}</div>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
