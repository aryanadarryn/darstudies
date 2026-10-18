import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfidenceSection, DatesSection, TimeSection, type Draft } from '../components/PlanSettingsForm'
import TaskCard from '../components/TaskCard'
import { Empty, PageHeader, Segmented, Sheet, toast } from '../components/ui'
import { SUBJECTS, subjectById } from '../content'
import type { SubjectId } from '../content/schema'
import { db } from '../db/db'
import { useT } from '../i18n/useT'
import { completeTask, moveTask, regeneratePlan, reopenTask, skipTask } from '../lib/actions'
import { useToday } from '../lib/hooks'
import { useTaskInfo } from '../lib/taskInfo'
import { addDays, fromISO } from '../planner/dates'
import { defaultPlanEnd } from '../planner/generatePlan'
import { minutesFor, phaseFor } from '../planner/phases'
import type { StudyTask } from '../planner/types'
import { useSettings } from '../store/settings'
import { weekStart } from '../lib/progress'

function TaskMenu({ task, onClose }: { task: StudyTask | null; onClose: () => void }) {
  const { t, lang } = useT()
  const today = useToday()
  const info = useTaskInfo()
  if (!task) return <Sheet open={false} onClose={onClose}>{null}</Sheet>
  const i = info(task)
  const days = Array.from({ length: 7 }, (_, k) => addDays(today, k)).filter((d) => d !== task.date)
  const move = async (d: string) => {
    await moveTask(task.id, d)
    toast(t('planner.moved'))
    onClose()
  }
  return (
    <Sheet open onClose={onClose} title={<>{i.icon} {i.title}</>}>
      <p className="-mt-2 mb-4 text-sm muted">{i.subtitle} · {task.minutes} {t('common.min')}</p>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <Link to={i.href} className="btn-primary" onClick={onClose}>{t('common.start')}</Link>
        {task.status === 'done'
          ? <button className="btn-secondary" onClick={() => { void reopenTask(task.id); onClose() }}>↺</button>
          : <button className="btn-secondary" onClick={() => { void completeTask(task.id); onClose() }}>✓ {t('planner.markDone')}</button>}
      </div>
      <p className="label">{t('planner.moveTo')}</p>
      <div className="mb-3 grid grid-cols-4 gap-2">
        {days.map((d) => (
          <button key={d} className="btn-secondary !min-h-12 !px-1 !text-xs" onClick={() => move(d)}>
            {fromISO(d).toLocaleDateString(lang === 'bm' ? 'ms-MY' : 'en-MY', { weekday: 'short', day: 'numeric' })}
          </button>
        ))}
        <input type="date" className="input col-span-4" min={today} aria-label={t('planner.moveTo')} onChange={(e) => e.target.value && move(e.target.value)} />
      </div>
      {task.status === 'todo' && <button className="btn-ghost w-full !text-red-600" onClick={() => { void skipTask(task.id); onClose() }}>{t('common.skip')}</button>}
    </Sheet>
  )
}

function DayBlock({ date, tasks, onMenu }: { date: string; tasks: StudyTask[]; onMenu: (t: StudyTask) => void }) {
  const { t, lang } = useT()
  const settings = useSettings((s) => s.settings)
  const today = useToday()
  const { phase } = phaseFor(date, settings)
  const visible = tasks.filter((x) => x.status !== 'skipped')
  const total = visible.reduce((s, x) => s + x.minutes, 0)
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <h3 className={`text-sm font-bold ${date === today ? 'text-violet-700 dark:text-violet-300' : ''}`}>
          {fromISO(date).toLocaleDateString(lang === 'bm' ? 'ms-MY' : 'en-MY', { weekday: 'long', day: 'numeric', month: 'short' })}
        </h3>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold dark:bg-slate-800">{t(`planner.phase.${phase}`)}</span>
        <span className="ml-auto text-xs muted tabular-nums">{total}/{minutesFor(date, settings)} {t('common.min')}</span>
      </div>
      {visible.length === 0 ? <p className="mb-2 text-xs muted">{t('planner.noTasks')}</p> : (
        <div className="space-y-2">{visible.map((task) => <TaskCard key={task.id} task={task} showStart={false} onMenu={() => onMenu(task)} />)}</div>
      )}
    </section>
  )
}

function MonthView({ onMenu }: { onMenu: (t: StudyTask) => void }) {
  const { lang } = useT()
  const today = useToday()
  const [month, setMonth] = useState(today.slice(0, 7))
  const [selected, setSelected] = useState(today)
  const first = `${month}-01`
  const gridStart = weekStart(first)
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const tasks = useLiveQuery(() => db.tasks.where('date').between(days[0], days[41], true, true).toArray(), [days[0]])
  const byDate = new Map<string, StudyTask[]>()
  for (const x of tasks ?? []) if (x.status !== 'skipped') byDate.set(x.date, [...(byDate.get(x.date) ?? []), x])
  const shift = (n: number) => {
    const d = fromISO(first)
    d.setMonth(d.getMonth() + n)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const dow = lang === 'bm' ? ['Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab', 'Ahd'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button className="btn-ghost" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
        <h2 className="font-bold">{fromISO(first).toLocaleDateString(lang === 'bm' ? 'ms-MY' : 'en-MY', { month: 'long', year: 'numeric' })}</h2>
        <button className="btn-ghost" onClick={() => shift(1)} aria-label="Next month">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {dow.map((d) => <div key={d} className="text-[10px] font-semibold muted">{d}</div>)}
        {days.map((d) => {
          const ts = byDate.get(d) ?? []
          const inMonth = d.startsWith(month)
          const allDone = ts.length > 0 && ts.every((x) => x.status === 'done')
          return (
            <button key={d} onClick={() => setSelected(d)}
              className={`flex aspect-square flex-col items-center justify-start rounded-lg pt-1 text-xs ${selected === d ? 'bg-violet-700 text-white' : d === today ? 'ring-2 ring-violet-600' : ''} ${inMonth ? '' : 'opacity-30'}`}>
              <span className="font-semibold">{Number(d.slice(8))}{allDone ? '✓' : ''}</span>
              <span className="mt-0.5 flex flex-wrap justify-center gap-0.5 px-0.5">
                {ts.slice(0, 6).map((x) => (
                  <span key={x.id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: x.subjectId ? subjectById[x.subjectId].color : '#94a3b8' }} />
                ))}
              </span>
            </button>
          )
        })}
      </div>
      <DayBlock date={selected} tasks={byDate.get(selected) ?? []} onMenu={onMenu} />
    </div>
  )
}

function WeekView({ onMenu }: { onMenu: (t: StudyTask) => void }) {
  const today = useToday()
  const [start, setStart] = useState(weekStart(today))
  const end = addDays(start, 6)
  const tasks = useLiveQuery(() => db.tasks.where('date').between(start, end, true, true).toArray(), [start])
  const { lang } = useT()
  const fmt = (d: string) => fromISO(d).toLocaleDateString(lang === 'bm' ? 'ms-MY' : 'en-MY', { day: 'numeric', month: 'short' })
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button className="btn-ghost" onClick={() => setStart(addDays(start, -7))} aria-label="Previous week">‹</button>
        <h2 className="font-bold">{fmt(start)} – {fmt(end)}</h2>
        <button className="btn-ghost" onClick={() => setStart(addDays(start, 7))} aria-label="Next week">›</button>
      </div>
      {Array.from({ length: 7 }, (_, i) => addDays(start, i)).map((d) => (
        <DayBlock key={d} date={d} tasks={(tasks ?? []).filter((x) => x.date === d)} onMenu={onMenu} />
      ))}
    </div>
  )
}

function ClassProgress() {
  const { t, L } = useT()
  const { settings, update } = useSettings()
  const today = useToday()
  const set = async (sid: SubjectId, chapterId: string) => {
    const currentChapters = { ...settings.currentChapters }
    if (chapterId) currentChapters[sid] = { chapterId, since: today }
    else delete currentChapters[sid]
    await update({ currentChapters })
    await regeneratePlan({ ...settings, currentChapters })
    toast(t('planner.regenerated'))
  }
  return (
    <section className="card space-y-2">
      <h2 className="font-bold">🏫 {t('planner.atSchool')}</h2>
      {SUBJECTS.map((s) => (
        <label key={s.id} className="flex items-center gap-2">
          <span className="w-24 shrink-0 text-sm font-semibold" style={{ color: s.color }}>{L(s.name)}</span>
          <select className="input !min-h-10 text-sm" value={settings.currentChapters[s.id]?.chapterId ?? ''} onChange={(e) => set(s.id, e.target.value)}>
            <option value="">{t('planner.notStarted')}</option>
            {s.chapters.map((c) => <option key={c.id} value={c.id}>{c.number}. {L(c.title)}</option>)}
          </select>
        </label>
      ))}
    </section>
  )
}

export default function Planner() {
  const { t } = useT()
  const { settings, update } = useSettings()
  const [view, setView] = useState<'week' | 'month'>('week')
  const [menu, setMenu] = useState<StudyTask | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Draft>(settings)
  const [busy, setBusy] = useState(false)

  const regen = async (s = settings) => {
    setBusy(true)
    await regeneratePlan(s)
    setBusy(false)
    toast(t('planner.regenerated'))
  }
  const saveSettings = async () => {
    const next = { ...draft, planEnd: defaultPlanEnd(draft.schoolStart) }
    await update(next)
    setEditing(false)
    await regen(next)
  }

  if (!settings.onboarded) {
    return (
      <div>
        <PageHeader title={t('planner.title')} />
        <Empty icon="🗓️"><Link to="/planner/setup" className="btn-primary mt-2">{t('today.setup')}</Link></Empty>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('planner.title')} right={
        <button className="btn-ghost !min-h-9 !px-2 !text-xs" disabled={busy} onClick={() => regen()}>↻ {t('planner.regenerate')}</button>
      } />
      <Segmented value={view} onChange={setView} options={[{ value: 'week', label: t('planner.week') }, { value: 'month', label: t('planner.month') }]} />
      {view === 'week' ? <WeekView onMenu={setMenu} /> : <MonthView onMenu={setMenu} />}
      <ClassProgress />
      <section className="card flex gap-2">
        <button className="btn-secondary flex-1" onClick={() => { setDraft(settings); setEditing(true) }}>⚙️ {t('planner.settings')}</button>
        <Link to="/planner/setup" className="btn-secondary flex-1">{t('planner.setup')}</Link>
      </section>

      <TaskMenu task={menu} onClose={() => setMenu(null)} />
      <Sheet open={editing} onClose={() => setEditing(false)} title={`⚙️ ${t('planner.settings')}`}>
        <div className="space-y-8">
          <DatesSection draft={draft} set={setDraft} />
          <TimeSection draft={draft} set={setDraft} />
          <ConfidenceSection draft={draft} set={setDraft} />
        </div>
        <div className="sticky bottom-0 mt-6 flex gap-2 bg-white py-3 dark:bg-slate-900">
          <button className="btn-secondary flex-1" onClick={() => setEditing(false)}>{t('common.cancel')}</button>
          <button className="btn-primary flex-[2]" onClick={saveSettings}>{t('common.save')} · {t('planner.regenerate')}</button>
        </div>
      </Sheet>
    </div>
  )
}
