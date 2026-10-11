import { Link } from 'react-router-dom'
import { chapterById, subjectById } from '../content'
import { useT } from '../i18n/useT'
import { useMastery } from '../lib/hooks'
import { MasteryRing } from './ui'

/** Tappable subtopic rows that open the subtopic detail page. */
export default function SubtopicList({ chapterId }: { chapterId: string }) {
  const { t, L, L2 } = useT()
  const mastery = useMastery()
  const ch = chapterById[chapterId]
  const color = subjectById[ch.subjectId].color
  return (
    <section className="card !p-2">
      <h2 className="px-2 pb-1 pt-2 font-bold">{t('learn.subtopics')}</h2>
      <ul>
        {ch.subtopics.map((s) => (
          <li key={s.id}>
            <Link to={`/learn/${ch.subjectId}/${ch.id}/${s.id}`}
              className="flex min-h-14 items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-slate-50 active:scale-[.99] dark:hover:bg-slate-800">
              <span className="w-10 shrink-0 font-mono text-sm font-bold" style={{ color }}>{s.code}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{L(s.title)}</span>
                <span className="block text-xs muted">{L2(s.title)}</span>
              </span>
              <MasteryRing value={mastery?.subtopic.get(s.id) ?? 0} size={34} label={false} />
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 muted" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path d="M9 6l6 6-6 6" /></svg>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
