import { useT } from '../../i18n/useT'
import { optionClass, type QProps } from './types'

export default function Multi({ q, value, onChange, submitted }: QProps<'multi'>) {
  const { t, L } = useT()
  const chosen = Array.isArray(value) ? value : []
  const toggle = (i: number) => onChange(chosen.includes(i) ? chosen.filter((x) => x !== i) : [...chosen, i])
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold muted">{t('quiz.selectAll')}</p>
      {q.options.map((o, i) => {
        const isAns = q.answer.includes(i), picked = chosen.includes(i)
        const state = submitted ? (isAns && picked ? 'correct' : picked ? 'wrong' : isAns ? 'missed' : 'idle') : picked ? 'selected' : 'idle'
        return (
          <button key={i} role="checkbox" aria-checked={picked} disabled={submitted} onClick={() => toggle(i)}
            className={`flex min-h-12 w-full items-center gap-3 rounded-xl border-2 p-3 text-left text-sm transition ${optionClass(state)}`}>
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${picked ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
              {picked && '✓'}
            </span>
            <span>{L(o)}</span>
          </button>
        )
      })}
    </div>
  )
}
