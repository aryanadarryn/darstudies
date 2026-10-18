// Tap-to-match: tap a term on the left, then its match on the right.
import { useMemo, useState } from 'react'
import { useT } from '../../i18n/useT'
import { shuffleIndices } from '../../lib/quizCheck'
import type { QProps } from './types'

const COLORS = ['#0ea5e9', '#a855f7', '#f97316', '#10b981', '#ec4899', '#eab308']

export default function Match({ q, value, onChange, submitted }: QProps<'match'>) {
  const { t, L } = useT()
  const n = q.pairs.length
  const rightOrder = useMemo(() => shuffleIndices(n), [n])
  const pairs = Array.isArray(value) ? value : Array<number>(n).fill(-1)
  const [active, setActive] = useState<number | null>(null)

  const pickRight = (r: number) => {
    if (active === null || submitted) return
    const next = pairs.map((v) => (v === r ? -1 : v))
    next[active] = r
    onChange(next)
    const nextEmpty = next.findIndex((v) => v === -1)
    setActive(nextEmpty === -1 ? null : nextEmpty)
  }
  const leftOf = (r: number) => pairs.indexOf(r)

  return (
    <div>
      {!submitted && <p className="mb-2 text-xs font-semibold muted">{t('quiz.matchHint')}</p>}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          {q.pairs.map((p, i) => {
            const ok = submitted && pairs[i] === i
            return (
              <button key={i} disabled={submitted} onClick={() => setActive(i)}
                className={`flex min-h-12 w-full items-center gap-2 rounded-xl border-2 p-2 text-left text-sm ${active === i ? 'border-violet-600 ring-2 ring-violet-600/20' : 'border-slate-200 dark:border-slate-700'} ${submitted ? (ok ? 'bg-green-50 dark:bg-green-950/40' : 'bg-red-50 dark:bg-red-950/40') : 'bg-white dark:bg-slate-900'}`}>
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: pairs[i] >= 0 ? COLORS[i % COLORS.length] : 'transparent', border: '2px solid ' + COLORS[i % COLORS.length] }} />
                <span className="flex-1">
                  {L(p.left)}
                  {submitted && !ok && <span className="mt-1 block text-xs text-green-700 dark:text-green-300">→ {L(p.right)}</span>}
                </span>
              </button>
            )
          })}
        </div>
        <div className="space-y-2">
          {rightOrder.map((r) => {
            const l = leftOf(r)
            return (
              <button key={r} disabled={submitted || active === null} onClick={() => pickRight(r)}
                className="flex min-h-12 w-full items-center gap-2 rounded-xl border-2 border-slate-200 bg-white p-2 text-left text-sm disabled:opacity-100 dark:border-slate-700 dark:bg-slate-900"
                style={l >= 0 ? { borderColor: COLORS[l % COLORS.length] } : undefined}>
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: l >= 0 ? COLORS[l % COLORS.length] : undefined }} />
                <span className="flex-1">{L(q.pairs[r].right)}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
