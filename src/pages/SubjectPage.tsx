import { useLiveQuery } from 'dexie-react-hooks'
import { Link, Navigate, useParams } from 'react-router-dom'
import { MasteryRing, PageHeader, Pill } from '../components/ui'
import { subjectById } from '../content'
import type { SubjectId } from '../content/schema'
import { db } from '../db/db'
import { useT } from '../i18n/useT'
import { useMastery } from '../lib/hooks'
import { SUBJECT_EMOJI } from './Learn'
import { useCan } from '../auth/account'
import { LockBadge } from '../auth/Locked'

export default function SubjectPage() {
  const { subjectId } = useParams()
  const { t, L, L2 } = useT()
  const mastery = useMastery()
  const can = useCan()
  const intros = useLiveQuery(() => db.intros.toArray(), [])
  const subject = subjectById[subjectId as SubjectId]
  if (!subject) return <Navigate to="/learn" replace />
  const seen = new Set((intros ?? []).filter((i) => i.completedAt).map((i) => i.chapterId))

  let lastTheme = ''
  return (
    <div>
      <PageHeader back="/learn" title={`${SUBJECT_EMOJI[subject.id]} ${L(subject.name)}`} subtitle={L2(subject.name)} />
      <ul className="space-y-2">
        {subject.chapters.map((c) => {
          const theme = c.theme ? L(c.theme) : ''
          const showTheme = theme && theme !== lastTheme
          lastTheme = theme
          return (
            <li key={c.id}>
              {showTheme && <h2 className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide muted">{theme}</h2>}
              <Link to={`/learn/${subject.id}/${c.id}`} className="card flex items-center gap-3 !py-3 transition active:scale-[.99]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ backgroundColor: subject.color, opacity: seen.has(c.id) ? 1 : 0.55 }}>
                  {c.number}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold leading-snug">{L(c.title)}</div>
                  <div className="truncate text-xs muted">{L2(c.title)}</div>
                  <div className="mt-1 flex gap-1">
                    {c.written ? <Pill color={subject.color}>{t('learn.written')}</Pill> : <Pill>{t('common.preview')}</Pill>}
                    {seen.has(c.id) && <Pill className="!bg-green-100 !text-green-800 dark:!bg-green-900/50 dark:!text-green-200">✓</Pill>}
                  </div>
                </div>
                {can('learn', subject.id) ? <MasteryRing value={mastery?.chapter.get(c.id) ?? 0} /> : <LockBadge className="text-lg" />}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
