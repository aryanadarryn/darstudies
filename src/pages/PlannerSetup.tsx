// First-launch setup wizard (plan §8.1).
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfidenceSection, DatesSection, TimeSection, type Draft } from '../components/PlanSettingsForm'
import { ProgressBar, Segmented, toast } from '../components/ui'
import { useT } from '../i18n/useT'
import { regeneratePlan } from '../lib/actions'
import { todayISO } from '../planner/dates'
import { defaultPlanEnd } from '../planner/generatePlan'
import { useSettings } from '../store/settings'

const STEPS = 5

export default function PlannerSetup() {
  const { t } = useT()
  const nav = useNavigate()
  const { settings, update } = useSettings()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Draft>(settings)
  const [busy, setBusy] = useState(false)

  const finish = async () => {
    setBusy(true)
    const final: Draft = {
      ...draft,
      onboarded: true,
      planStart: settings.onboarded ? settings.planStart : todayISO(),
      planEnd: defaultPlanEnd(draft.schoolStart),
    }
    await update(final)
    await regeneratePlan(final)
    toast(`✨ ${t('planner.regenerated')}`)
    nav('/', { replace: true })
  }

  const setLang = (lang: Draft['lang']) => {
    setDraft({ ...draft, lang })
    void update({ lang })
  }

  const pages = [
    <div key="0" className="space-y-5 text-center">
      <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" className="mx-auto h-24 w-24 rounded-3xl shadow-lg" />
      <h1 className="text-2xl font-bold">{t('setup.welcome')}</h1>
      <p className="muted">{t('setup.welcomeBody')}</p>
      <div className="text-left">
        <span className="label">{t('setup.language')}</span>
        <Segmented value={draft.lang} onChange={setLang} options={[{ value: 'en', label: 'English (DLP)' }, { value: 'bm', label: 'Bahasa Melayu' }]} />
      </div>
      <div className="text-left">
        <span className="label">{t('form.label')}</span>
        <Segmented value={String(draft.form ?? 4)} onChange={(v) => setDraft({ ...draft, form: v === '3' ? 3 : 4 })}
          options={[{ value: '3', label: t('form.3') }, { value: '4', label: t('form.4') }]} />
      </div>
    </div>,
    <div key="1"><h2 className="mb-1 text-xl font-bold">📅 {t('setup.dates')}</h2><p className="mb-4 text-sm muted">{t('setup.dateHint')}</p><DatesSection draft={draft} set={setDraft} /></div>,
    <div key="2"><h2 className="mb-4 text-xl font-bold">⏱️ {t('setup.time')}</h2><TimeSection draft={draft} set={setDraft} /></div>,
    <div key="3"><h2 className="mb-4 text-xl font-bold">📚 {t('setup.confidence')}</h2><ConfidenceSection draft={draft} set={setDraft} /></div>,
    <div key="4" className="space-y-4 text-center">
      <div className="text-6xl">🚀</div>
      <h2 className="text-2xl font-bold">{t('setup.ready')}</h2>
      <p className="muted">{t('setup.readyBody')}</p>
    </div>,
  ]

  return (
    <div className="flex min-h-dvh flex-col pt-6 desk:mx-auto desk:max-w-lg">
      <div className="mb-6 flex items-center gap-3">
        {settings.onboarded && <button className="muted text-sm" onClick={() => nav(-1)}>✕</button>}
        <ProgressBar value={(step + 1) / STEPS} />
      </div>
      <div className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>{pages[step]}</motion.div>
        </AnimatePresence>
      </div>
      <div className="safe-bottom sticky bottom-0 mt-6 flex gap-2 bg-slate-50 py-3 dark:bg-slate-950">
        {step > 0 && <button className="btn-secondary flex-1" onClick={() => setStep(step - 1)}>{t('common.back')}</button>}
        {step < STEPS - 1 ? (
          <button className="btn-primary flex-[2]" disabled={draft.studyDays.length === 0} onClick={() => setStep(step + 1)}>{t('common.next')}</button>
        ) : (
          <button className="btn-primary flex-[2]" disabled={busy} onClick={finish}>{busy ? '…' : t('setup.build')}</button>
        )}
      </div>
    </div>
  )
}
