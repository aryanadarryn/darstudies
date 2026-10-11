import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { MasteryRing, PageHeader } from '../components/ui'
import { SUBJECTS } from '../content'
import { db } from '../db/db'
import { useT } from '../i18n/useT'
import { useMastery } from '../lib/hooks'

export const SUBJECT_EMOJI: Record<string, string> = { phy: '⚛️', chem: '🧪', bio: '🧬', addmath: '📐', math: '🔢' }

export default function Learn() {
  const { t, L, L2 } = useT()
  const mastery = useMastery()
  const intros = useLiveQuery(() => db.intros.toArray(), [])
  const seen = new Set((intros ?? []).filter((i) => i.completedAt).map((i) => i.chapterId))

  return (
    <div>
      <PageHeader title={t('learn.title')} subtitle="Form 4 KSSM · DLP" />
      <div className="grid grid-cols-2 gap-3 desk:grid-cols-3 desk:xl:grid-cols-5">
        {SUBJECTS.map((s) => {
          const seenCount = s.chapters.filter((c) => seen.has(c.id)).length
          return (
            <Link key={s.id} to={`/learn/${s.id}`} className="card flex flex-col gap-2 transition active:scale-[.98]" style={{ borderTop: `4px solid ${s.color}` }}>
              <div className="flex items-start justify-between">
                <span className="text-3xl" aria-hidden>{SUBJECT_EMOJI[s.id]}</span>
                <MasteryRing value={mastery?.subject.get(s.id) ?? 0} size={40} />
              </div>
              <div>
                <div className="font-bold leading-tight">{L(s.name)}</div>
                <div className="text-xs muted">{L2(s.name)}</div>
              </div>
              <div className="text-xs muted">{seenCount}/{s.chapters.length} {t('learn.chapters')}</div>
              <div className="flex gap-0.5">
                {s.chapters.map((c) => (
                  <span key={c.id} className={`h-1.5 flex-1 rounded-full ${seen.has(c.id) ? '' : 'bg-slate-200 dark:bg-slate-700'}`}
                    style={seen.has(c.id) ? { backgroundColor: s.color } : undefined} />
                ))}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
