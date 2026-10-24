import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { MasteryRing, PageHeader } from '../components/ui'
import { subjectsOf } from '../content'
import type { Form } from '../content/ids'
import { useChooseForm, useForm } from '../components/FormSwitch'
import { db } from '../db/db'
import { useT } from '../i18n/useT'
import { useMastery } from '../lib/hooks'
import { useCan } from '../auth/account'
import { LockBadge, TrialBanner } from '../auth/Locked'

export const SUBJECT_EMOJI: Record<string, string> = {
  phy: '⚛️', chem: '🧪', bio: '🧬', addmath: '📐', math: '🔢', sej: '🏛️', pi: '🕌', bm: '📖', bi: '🗣️',
  f3bm: '📖', f3bi: '🗣️', f3math: '🔢', f3sci: '🔬', f3sej: '🏛️', f3geo: '🌏', f3pi: '🕌', f3rbt: '🛠️', f3ask: '💻', f3psv: '🎨', f3muzik: '🎵', f3pjk: '🏃',
}

// The tab only changes what Learn shows; it is remembered per device and starts on the study form.
const TAB_KEY = 'learn.form'
function readTab(): Form | null {
  try { const v = localStorage.getItem(TAB_KEY); return v === '3' ? 3 : v === '4' ? 4 : null } catch { return null }
}
function saveTab(f: Form) {
  try { localStorage.setItem(TAB_KEY, String(f)) } catch { /* storage unavailable */ }
}

export default function Learn() {
  const { t, L, L2 } = useT()
  const mastery = useMastery()
  const can = useCan()
  const studyForm = useForm()
  const chooseForm = useChooseForm()
  const [tab, setTab] = useState<Form>(() => readTab() ?? studyForm)
  const intros = useLiveQuery(() => db.intros.toArray(), [])
  const seen = new Set((intros ?? []).filter((i) => i.completedAt).map((i) => i.chapterId))
  const pick = (f: Form) => { setTab(f); saveTab(f) }

  return (
    <div>
      <PageHeader title={t('learn.title')} subtitle={`${t(tab === 3 ? 'form.3' : 'form.4')} KSSM · DLP`} />
      <div role="tablist" aria-label={t('form.label')} className="mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-slate-200 p-1 dark:bg-slate-800">
        {([3, 4] as const).map((f) => (
          <button key={f} role="tab" aria-selected={tab === f} onClick={() => pick(f)}
            className={`min-h-11 rounded-xl px-3 py-1.5 text-sm font-bold transition ${tab === f ? 'bg-violet-700 text-white shadow' : 'text-slate-600 dark:text-slate-300'}`}>
            {t(f === 3 ? 'form.3' : 'form.4')}
            <span className={`block text-[11px] font-medium ${tab === f ? 'text-violet-100' : 'muted'}`}>{subjectsOf(f).length} {t('learn.subjects')}</span>
          </button>
        ))}
      </div>
      {tab !== studyForm && (
        <div className="card mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>{t(studyForm === 3 ? 'learn.planIs3' : 'learn.planIs4')}</span>
          <button className="btn-secondary min-h-9 px-3 text-xs" onClick={() => chooseForm(tab)}>{t('learn.usePlanForm')}</button>
        </div>
      )}
      <TrialBanner />
      <div role="tabpanel" className="grid grid-cols-2 gap-3 desk:grid-cols-3 desk:xl:grid-cols-5">
        {subjectsOf(tab).map((s) => {
          const seenCount = s.chapters.filter((c) => seen.has(c.id)).length
          return (
            <Link key={s.id} to={`/learn/${s.id}`} className="card flex flex-col gap-2 transition active:scale-[.98]" style={{ borderTop: `4px solid ${s.color}` }}>
              <div className="flex items-start justify-between">
                <span className="text-3xl" aria-hidden>{SUBJECT_EMOJI[s.id]}</span>
                {can('learn', s.id) || can('quiz', s.id) ? <MasteryRing value={mastery?.subject.get(s.id) ?? 0} size={40} /> : <LockBadge className="text-xl" />}
              </div>
              <div>
                <div className="font-bold leading-tight">{L(s.name)}</div>
                <div className="text-xs muted">{L2(s.name)}</div>
              </div>
              <div className="text-xs muted">{seenCount}/{s.chapters.length} {t('learn.chapters')}</div>
              <div className="flex gap-0.5">
                {s.chapters.map((c) => (
                  <span key={c.id} className={`h-1.5 flex-1 rounded-full ${seen.has(c.id) ? '' : 'bg-slate-200 dark:bg-slate-700'}`}
                    style={seen.has(c.id) ? { backgroundColor: s.color } : undefined} />
                ))}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
