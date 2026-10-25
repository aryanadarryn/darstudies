import { useT } from '../../i18n/useT'
import { MasteryRing } from '../ui'
import type { Mode, Result } from './deck'

interface Props {
  mode: Mode
  results: Result[]
  match?: { seconds: number; mistakes: number; best: number | null }
  onAgain: () => void
  onNew: () => void
  onDone: () => void
}

/** End of a session: score, the cards to look at again, and what to do next. */
export default function Summary({ mode, results, match, onAgain, onNew, onDone }: Props) {
  const { t, L } = useT()
  const right = results.filter((r) => r.correct).length
  const missed = results.filter((r) => !r.correct)
  const pct = results.length ? right / results.length : 0
  const emoji = pct >= 0.9 ? '🏆' : pct >= 0.7 ? '🌟' : pct >= 0.4 ? '💪' : '🌱'

  return (
    <div className="space-y-4">
      <div className="card flex items-center gap-4">
        <MasteryRing value={pct} size={72} />
        <div className="flex-1">
          <div className="text-2xl">{emoji}</div>
          <p className="font-bold">{results.length} {t('flash.reviewed')}</p>
          {match ? (
            <p className="text-sm muted">⏱️ {match.seconds}s · ❌ {match.mistakes}{match.best ? ` · 🏅 ${t('flash.best')} ${match.best}s` : ''}</p>
          ) : (
            <p className="text-sm muted">✅ {right} · 🔁 {missed.length} · {t('flash.accuracy')} {Math.round(pct * 100)}%</p>
          )}
        </div>
      </div>

      {missed.length > 0 && (
        <div className="card space-y-2">
          <h2 className="font-semibold">🔁 {t('flash.missed')}</h2>
          <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {missed.map(({ card }) => (
              <li key={card.id} className="py-2">
                <div className="font-semibold">{L(card.front)}</div>
                <div className="muted">{L(card.back)}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-2">
        {missed.length > 0 && <button className="btn-primary" onClick={onAgain}>🔁 {t('flash.reviewMissed')} ({missed.length})</button>}
        <button className={missed.length ? 'btn-secondary' : 'btn-primary'} onClick={onNew}>✨ {t('flash.newSession')}</button>
        <button className="btn-ghost" onClick={onDone}>{t('common.done')}</button>
      </div>
      {mode === 'match' && <p className="text-center text-xs muted">{t('flash.matchNote')}</p>}
    </div>
  )
}
