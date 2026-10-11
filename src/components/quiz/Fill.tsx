import { useT } from '../../i18n/useT'
import type { QProps } from './types'

export default function Fill({ q, value, onChange, submitted }: QProps<'fill'>) {
  const { t } = useT()
  return (
    <div>
      <input
        className="input text-lg" autoComplete="off" autoCapitalize="off" spellCheck={false} placeholder={t('quiz.typeAnswer')}
        value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} disabled={submitted} aria-label={t('quiz.typeAnswer')}
      />
      {submitted && <p className="mt-2 text-sm">{t('quiz.correctAnswer')}: <strong>{q.answer[0]}</strong></p>}
    </div>
  )
}
