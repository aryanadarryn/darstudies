// Put items in order with tap-to-move arrows (works one-handed, no drag needed).
import { motion } from 'framer-motion'
import { useT } from '../../i18n/useT'
import type { QProps } from './types'

export default function Order({ q, value, onChange, submitted }: QProps<'order'>) {
  const { t, L } = useT()
  const order = Array.isArray(value) ? value : q.items.map((_, i) => i)
  const move = (k: number, dir: -1 | 1) => {
    const next = [...order]
    ;[next[k], next[k + dir]] = [next[k + dir], next[k]]
    onChange(next)
  }
  return (
    <div>
      {!submitted && <p className="mb-2 text-xs font-semibold muted">{t('quiz.orderHint')}</p>}
      <ol className="space-y-2">
        {order.map((itemIdx, k) => {
          const ok = itemIdx === k
          return (
            <motion.li layout key={itemIdx}
              className={`flex min-h-12 items-center gap-2 rounded-xl border-2 p-2 text-sm ${submitted ? (ok ? 'border-green-600 bg-green-50 dark:bg-green-950/40' : 'border-red-500 bg-red-50 dark:bg-red-950/40') : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold dark:bg-slate-800">{k + 1}</span>
              <span className="flex-1">{L(q.items[itemIdx])}</span>
              {!submitted && (
                <span className="flex shrink-0 flex-col">
                  <button aria-label="Move up" disabled={k === 0} onClick={() => move(k, -1)} className="flex h-6 w-9 items-center justify-center rounded disabled:opacity-20">▲</button>
                  <button aria-label="Move down" disabled={k === order.length - 1} onClick={() => move(k, 1)} className="flex h-6 w-9 items-center justify-center rounded disabled:opacity-20">▼</button>
                </span>
              )}
            </motion.li>
          )
        })}
      </ol>
      {submitted && order.some((v, i) => v !== i) && (
        <div className="mt-3 text-sm">
          <div className="font-semibold">{t('quiz.correctAnswer')}:</div>
          <ol className="list-decimal pl-5">{q.items.map((it, i) => <li key={i}>{L(it)}</li>)}</ol>
        </div>
      )}
    </div>
  )
}
