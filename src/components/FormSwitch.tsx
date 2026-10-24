import type { Form } from '../content/ids'
import { useT } from '../i18n/useT'
import { regeneratePlan } from '../lib/actions'
import { useSettings } from '../store/settings'
import { toast } from './ui'

export const useForm = (): Form => useSettings((s) => s.settings.form ?? 4)

/** Sets the study form (plan, Practice, Today) and rebuilds the plan if the user is onboarded. */
export function useChooseForm() {
  const { t } = useT()
  const { settings, update } = useSettings()
  const form = settings.form ?? 4
  return async (f: Form) => {
    if (f === form) return
    await update({ form: f })
    if (settings.onboarded) {
      await regeneratePlan({ ...settings, form: f })
      toast(t('form.switched'))
    }
  }
}

/** "Form 3 | Form 4" toggle. Learn, Practice and the planner all follow the chosen form. */
export default function FormSwitch({ className = '' }: { className?: string }) {
  const { t } = useT()
  const form = useForm()
  const choose = useChooseForm()
  return (
    <div role="radiogroup" aria-label={t('form.label')} className={`inline-flex rounded-full bg-slate-200 p-0.5 text-xs font-semibold dark:bg-slate-800 ${className}`}>
      {([3, 4] as const).map((f) => (
        <button key={f} role="radio" aria-checked={form === f} onClick={() => choose(f)}
          className={`min-h-8 rounded-full px-3 transition ${form === f ? 'bg-violet-700 text-white shadow' : 'text-slate-600 dark:text-slate-300'}`}>
          {t(f === 3 ? 'form.3' : 'form.4')}
        </button>
      ))}
    </div>
  )
}
