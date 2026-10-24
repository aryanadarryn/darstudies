// Plan settings sections, shared by the setup wizard and the Planner settings sheet.
import { useState } from 'react'
import { subjectsOf } from '../content'
import { uid } from '../db/db'
import { useT } from '../i18n/useT'
import type { Settings } from '../planner/types'

export type Draft = Settings
type P = { draft: Draft; set: (d: Draft) => void }

const DAY_LABELS = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], bm: ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'] }

export function DatesSection({ draft, set }: P) {
  const { t } = useT()
  const [examName, setExamName] = useState('')
  const [examDate, setExamDate] = useState('')
  const [hName, setHName] = useState('')
  const [hFrom, setHFrom] = useState('')
  const [hTo, setHTo] = useState('')
  return (
    <div className="space-y-5">
      <label className="block">
        <span className="label">{t('planner.schoolStart')}</span>
        <input type="date" className="input" value={draft.schoolStart} onChange={(e) => e.target.value && set({ ...draft, schoolStart: e.target.value })} />
      </label>

      <div>
        <span className="label">{t('planner.exams')}</span>
        <ul className="mb-2 space-y-1">
          {draft.exams.map((e) => (
            <li key={e.id} className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800">
              <span className="flex-1">📝 {e.name}</span><span className="muted">{e.date}</span>
              <button aria-label={t('common.delete')} className="px-1 text-red-600" onClick={() => set({ ...draft, exams: draft.exams.filter((x) => x.id !== e.id) })}>✕</button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input className="input" placeholder={t('planner.examName')} value={examName} onChange={(e) => setExamName(e.target.value)} />
          <input type="date" className="input !w-40" value={examDate} onChange={(e) => setExamDate(e.target.value)} aria-label="Exam date" />
        </div>
        <button className="btn-ghost mt-1 -ml-2" disabled={!examName || !examDate} onClick={() => {
          set({ ...draft, exams: [...draft.exams, { id: uid(), name: examName, date: examDate }] })
          setExamName(''); setExamDate('')
        }}>+ {t('planner.addExam')}</button>
      </div>

      <div>
        <span className="label">{t('planner.holidays')}</span>
        <ul className="mb-2 space-y-1">
          {draft.holidays.map((h) => (
            <li key={h.id} className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800">
              <span className="flex-1">🌴 {h.name}</span><span className="muted">{h.from}{h.to !== h.from ? ` → ${h.to}` : ''}</span>
              <button aria-label={t('common.delete')} className="px-1 text-red-600" onClick={() => set({ ...draft, holidays: draft.holidays.filter((x) => x.id !== h.id) })}>✕</button>
            </li>
          ))}
        </ul>
        <input className="input mb-2" placeholder="e.g. Deepavali" value={hName} onChange={(e) => setHName(e.target.value)} />
        <div className="flex gap-2">
          <label className="flex-1"><span className="text-xs muted">{t('planner.from')}</span><input type="date" className="input" value={hFrom} onChange={(e) => setHFrom(e.target.value)} /></label>
          <label className="flex-1"><span className="text-xs muted">{t('planner.to')}</span><input type="date" className="input" value={hTo} onChange={(e) => setHTo(e.target.value)} /></label>
        </div>
        <button className="btn-ghost mt-1 -ml-2" disabled={!hName || !hFrom} onClick={() => {
          const to = hTo && hTo >= hFrom ? hTo : hFrom
          set({ ...draft, holidays: [...draft.holidays, { id: uid(), name: hName, from: hFrom, to }] })
          setHName(''); setHFrom(''); setHTo('')
        }}>+ {t('planner.addHoliday')}</button>
      </div>
    </div>
  )
}

export function TimeSection({ draft, set }: P) {
  const { t, lang } = useT()
  const mins = (key: keyof Draft['minutes'], label: string) => (
    <label className="flex items-center gap-3">
      <span className="w-32 text-sm">{label}</span>
      <input type="range" min={15} max={180} step={5} value={draft.minutes[key]} className="flex-1"
        onChange={(e) => set({ ...draft, minutes: { ...draft.minutes, [key]: Number(e.target.value) } })} />
      <span className="w-14 text-right text-sm font-semibold tabular-nums">{draft.minutes[key]} {t('common.min')}</span>
    </label>
  )
  return (
    <div className="space-y-5">
      <div>
        <span className="label">{t('planner.studyDays')}</span>
        <div className="flex gap-1">
          {DAY_LABELS[lang].map((d, i) => {
            const on = draft.studyDays.includes(i)
            return (
              <button key={i} aria-pressed={on} onClick={() => set({ ...draft, studyDays: on ? draft.studyDays.filter((x) => x !== i) : [...draft.studyDays, i].sort() })}
                className={`h-11 flex-1 rounded-xl text-xs font-semibold ${on ? 'bg-violet-700 text-white' : 'bg-slate-100 muted dark:bg-slate-800'}`}>{d}</button>
            )
          })}
        </div>
      </div>
      <div className="space-y-3">
        <span className="label">{t('planner.minutes')}</span>
        {mins('holiday', t('planner.holidayMins'))}
        {mins('school', t('planner.schoolMins'))}
        {mins('weekend', t('planner.weekendMins'))}
      </div>
      <label className="flex items-center gap-3">
        <span className="w-32 text-sm font-medium">{t('planner.dailyCap')}</span>
        <input type="range" min={30} max={180} step={10} value={draft.dailyCap} className="flex-1" onChange={(e) => set({ ...draft, dailyCap: Number(e.target.value) })} />
        <span className="w-14 text-right text-sm font-semibold tabular-nums">{draft.dailyCap} {t('common.min')}</span>
      </label>
    </div>
  )
}

export function ConfidenceSection({ draft, set }: P) {
  const { t, L } = useT()
  return (
    <div className="space-y-4">
      <p className="text-sm muted">{t('planner.confidence')}</p>
      {subjectsOf(draft.form ?? 4).map((s) => (
        <div key={s.id}>
          <div className="mb-1 text-sm font-semibold" style={{ color: s.color }}>{L(s.name)}</div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} aria-pressed={draft.confidence[s.id] === n} onClick={() => set({ ...draft, confidence: { ...draft.confidence, [s.id]: n } })}
                className="h-11 flex-1 rounded-xl text-sm font-bold"
                style={draft.confidence[s.id] === n ? { backgroundColor: s.color, color: 'white' } : undefined}>
                <span className={draft.confidence[s.id] === n ? '' : 'muted'}>{['😟', '😕', '😐', '🙂', '😎'][n - 1]} {n}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
