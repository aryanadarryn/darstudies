import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { MasteryRing, PageHeader } from '../components/ui'
import { subtopicById } from '../content'
import { TOOLS } from '../content/toolIds'
import { db } from '../db/db'
import { useT } from '../i18n/useT'
import { useFlashcards, useMastery, useToday } from '../lib/hooks'
import { isDue } from '../planner/leitner'

export default function Practice() {
  const { t, L } = useT()
  const today = useToday()
  const cards = useFlashcards()
  const states = useLiveQuery(() => db.cards.toArray(), [])
  const mastery = useMastery()
  const stateMap = new Map((states ?? []).map((s) => [s.cardId, s]))
  const due = (cards ?? []).filter((c) => isDue(stateMap.get(c.id), today)).length
  const weak = (mastery?.weak ?? []).slice().sort((a, b) => a.mastery - b.mastery).slice(0, 4)

  return (
    <div className="space-y-3">
      <PageHeader title={t('practice.title')} />
      <Link to="/practice/quiz" className="card flex items-center gap-4">
        <span className="text-3xl">❓</span>
        <div className="flex-1"><div className="font-bold">{t('practice.quiz')}</div><div className="text-sm muted">{t('practice.quizBody')}</div></div>
      </Link>
      <Link to="/practice/flashcards" className="card flex items-center gap-4">
        <span className="text-3xl">🃏</span>
        <div className="flex-1"><div className="font-bold">{t('practice.flashcards')}</div><div className="text-sm muted">{due} {t('practice.due')}</div></div>
        {due > 0 && <span className="rounded-full bg-teal-700 px-2.5 py-1 text-xs font-bold text-white">{due}</span>}
      </Link>
      <Link to="/practice/drill" className="card flex items-center gap-4">
        <span className="w-8 text-center text-3xl font-bold">∑</span>
        <div className="flex-1"><div className="font-bold">{t('practice.drill')}</div><div className="text-sm muted">{t('practice.drillBody')}</div></div>
      </Link>

      <section className="card">
        <Link to="/practice/quiz?mode=weak" className="flex items-center gap-4">
          <span className="text-3xl">🎯</span>
          <div className="flex-1"><div className="font-bold">{t('practice.weak')}</div><div className="text-sm muted">{t('practice.weakBody')}</div></div>
        </Link>
        {weak.length > 0 ? (
          <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3 dark:border-slate-800">
            {weak.map((w) => (
              <li key={w.id}>
                <Link to={`/practice/quiz?subtopic=${w.id}`} className="flex items-center gap-3 rounded-lg p-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                  <MasteryRing value={w.mastery} size={34} label={false} />
                  <span className="flex-1">{subtopicById[w.id]?.code} {L(subtopicById[w.id]?.title)}</span>
                  <span className="text-xs muted">{Math.round(w.mastery * 100)}%</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs muted">{t('practice.noWeak')}</p>
        )}
      </section>

      <section>
        <div className="mb-2 mt-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">🧪 {t('practice.tools')}</h2>
          <Link to="/practice/tools" className="text-sm font-semibold text-teal-700 dark:text-teal-300">→</Link>
        </div>
        <div className="grid grid-cols-2 gap-2 desk:grid-cols-3">
          {TOOLS.filter((x) => x.built).map((tool) => (
            <Link key={tool.id} to={`/practice/tools/${tool.id}`} className="card !p-3 text-sm font-semibold">{L(tool.name)}</Link>
          ))}
        </div>
      </section>
    </div>
  )
}
