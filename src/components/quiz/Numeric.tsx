import { useT } from '../../i18n/useT'
import type { QProps } from './types'

export default function Numeric({ q, value, onChange, submitted }: QProps<'numeric'>) {
  const { t } = useT()
  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          className="input text-lg tabular-nums" inputMode="decimal" autoComplete="off" placeholder={t('quiz.typeAnswer')}
          value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} disabled={submitted} aria-label={t('quiz.typeAnswer')}
        />
        {q.unit && <span className="shrink-0 font-semibold">{q.unit}</span>}
      </div>
      {submitted && (
        <p className="mt-2 text-sm">
          {t('quiz.correctAnswer')}: <strong>{q.answer.toLocaleString()}{q.unit ? ` ${q.unit}` : ''}</strong>
          {!!q.tolerance && <span className="muted"> (±{Math.round(q.tolerance * 1000) / 10}%)</span>}
        </p>
      )}
    </div>
  )
}
