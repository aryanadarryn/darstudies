import { useT } from '../../i18n/useT'
import { optionClass, type QProps } from './types'

const LETTERS = 'ABCDEFGH'

export default function Mcq({ q, value, onChange, submitted }: QProps<'mcq'>) {
  const { L } = useT()
  return (
    <div className="space-y-2" role="radiogroup">
      {q.options.map((o, i) => {
        const state = submitted ? (i === q.answer ? 'correct' : i === value ? 'wrong' : 'idle') : i === value ? 'selected' : 'idle'
        return (
          <button key={i} role="radio" aria-checked={i === value} disabled={submitted} onClick={() => onChange(i)}
            className={`flex min-h-12 w-full items-center gap-3 rounded-xl border-2 p-3 text-left text-sm transition ${optionClass(state)}`}>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold dark:bg-slate-800">{LETTERS[i]}</span>
            <span>{L(o)}</span>
          </button>
        )
      })}
    </div>
  )
}
