import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import FormulaCard from '../components/formula/FormulaCard'
import InstallPrompt from '../components/InstallPrompt'
import { TrialBanner } from '../auth/Locked'
import { useAccount } from '../auth/account'
import Avatar from '../components/Avatar'
import { displayName, streakIcon } from '../lib/profile'
import TaskCard from '../components/TaskCard'
import { Empty, ProgressBar, toast } from '../components/ui'
import { formulasOf } from '../content'
import { useForm } from '../components/FormSwitch'
import { db } from '../db/db'
import { useT } from '../i18n/useT'
import { rescheduleOverdue, resetPlanFromToday } from '../lib/actions'
import { useToday } from '../lib/hooks'
import { activeDates, dayIndex, streakNow } from '../lib/progress'
import { daysBetween, fromISO } from '../planner/dates'
import { phaseFor } from '../planner/phases'
import { missedDayCount, overdueTasks, RESET_THRESHOLD } from '../planner/reschedule'
import { useSettings } from '../store/settings'

export default function Today() {
  const { t, lang } = useT()
  const settings = useSettings((s) => s.settings)
  const profile = settings.profile
  const name = displayName(profile, useAccount((s) => s.access?.full_name))
  const today = useToday()
  const [busy, setBusy] = useState(false)

  const todayTasks = useLiveQuery(() => db.tasks.where('date').equals(today).toArray(), [today])
  const overdue = useLiveQuery(async () => overdueTasks(await db.tasks.where('date').below(today).toArray(), today), [today])
  const streak = useLiveQuery(async () => streakNow(activeDates(await db.tasks.where('status').equals('done').toArray(), await db.attempts.toArray()), today), [today])

  const hour = new Date().getHours()
  const greeting = t(hour < 12 ? 'today.greeting.morning' : hour < 19 ? 'today.greeting.afternoon' : 'today.greeting.evening')
  const dateLabel = fromISO(today).toLocaleDateString(lang === 'bm' ? 'ms-MY' : 'en-MY', { weekday: 'long', day: 'numeric', month: 'long' })
  const form = useForm()
  const FORMULAS = formulasOf(form)
  const formula = FORMULAS.length ? FORMULAS[dayIndex(today, FORMULAS.length)] : undefined

  const tasks = useMemo(() => (todayTasks ?? []).filter((x) => x.status !== 'skipped'), [todayTasks])
  const planned = tasks.reduce((s, x) => s + x.minutes, 0)
  const doneMin = tasks.filter((x) => x.status === 'done').reduce((s, x) => s + x.minutes, 0)
  const allDone = tasks.length > 0 && tasks.every((x) => x.status === 'done')
  const capReached = doneMin >= settings.dailyCap

  const nextExam = settings.exams.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0]
  const toSchool = daysBetween(today, settings.schoolStart)
  const missed = overdue ? missedDayCount(overdue) : 0
  const phase = phaseFor(today, settings).phase

  const [hh, mm] = (settings.reminderTime ?? '99:99').split(':').map(Number)
  const nowMin = hour * 60 + new Date().getMinutes()
  const showReminder = !!settings.reminderTime && nowMin >= hh * 60 + mm && nowMin < 22 * 60 + 30 && tasks.some((x) => x.status === 'todo') && !capReached

  const doReschedule = async () => {
    setBusy(true)
    const r = await rescheduleOverdue(settings)
    setBusy(false)
    toast(`${r.moves.length} ${t('planner.rescheduled')}${r.unplaced.length ? ` · ${r.unplaced.length} ${t('planner.couldNotFit')}` : ''}`)
  }
  const doReset = async () => {
    setBusy(true)
    await resetPlanFromToday(settings)
    setBusy(false)
    toast(t('planner.regenerated'))
  }

  return (
    <div className="space-y-4 pt-6">
      <TrialBanner />
      <header className="flex items-start justify-between">
        <div>
          <p className="text-sm muted">{dateLabel}</p>
          <h1 className="text-2xl font-bold">{greeting}{name ? `, ${name}` : ''} 👋</h1>
        </div>
        <div className="flex items-center gap-2">
        <Link to="/me" aria-label={t('profile.title')}><Avatar size={44} /></Link>
        <div className="flex flex-col items-center rounded-2xl bg-orange-100 px-3 py-1.5 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200" title={t('today.streak')}>
          <span className="text-xl font-bold leading-none">{streakIcon(profile)} {streak ?? 0}</span>
          <span className="text-[10px] font-semibold">{t('today.streak')}</span>
        </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {toSchool > 0 && (
          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800 dark:bg-violet-900/50 dark:text-violet-200">🏫 {toSchool} {t('today.daysToSchool')}</span>
        )}
        {nextExam && (
          <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800 dark:bg-rose-900/50 dark:text-rose-200">
            📝 {daysBetween(today, nextExam.date)} {t('today.daysToExam')} {nextExam.name}
          </span>
        )}
        {settings.onboarded && (
          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">{t(`planner.phase.${phase}`)}</span>
        )}
      </div>

      {!settings.onboarded && (
        <div className="card !bg-gradient-to-br from-violet-600 to-violet-800 !text-white !border-0">
          <h2 className="text-lg font-bold">{t('today.setup')}</h2>
          <p className="mb-3 text-sm opacity-90">{t('today.setupBody')}</p>
          <Link to="/planner/setup" className="btn bg-white text-violet-800">{t('common.start')} →</Link>
        </div>
      )}

      <InstallPrompt dismissible />

      {showReminder && <div className="card !bg-sky-50 text-sm dark:!bg-sky-950/40">⏰ {t('today.reminder')}</div>}

      {overdue && overdue.length > 0 && (
        <div className="card space-y-2 !bg-amber-50 dark:!bg-amber-950/30">
          <p className="text-sm">{missed > RESET_THRESHOLD ? t('today.manyMissed') : `${t('today.overdue')} (${overdue.length})`}</p>
          <div className="flex gap-2">
            {missed > RESET_THRESHOLD ? (
              <button disabled={busy} className="btn-primary flex-1" onClick={doReset}>{t('today.resetPlan')}</button>
            ) : (
              <button disabled={busy} className="btn-primary flex-1" onClick={doReschedule}>{t('today.reschedule')}</button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4 desk:grid desk:grid-cols-[1fr_360px] desk:items-start desk:gap-6 desk:space-y-0">
      {settings.onboarded && (
        <section>
          <div className="mb-2 flex items-end justify-between">
            <h2 className="text-lg font-bold">{t('today.tasks')}</h2>
            <span className="text-xs muted tabular-nums">{doneMin}/{planned} {t('common.min')}</span>
          </div>
          {planned > 0 && <div className="mb-3"><ProgressBar value={planned ? doneMin / planned : 0} /></div>}
          {capReached && <div className="card mb-3 !bg-indigo-50 text-sm dark:!bg-indigo-950/40">{t('today.capReached')}</div>}
          {todayTasks === undefined ? null : tasks.length === 0 ? (
            <Empty icon="🌿">{t('today.noTasks')}</Empty>
          ) : (
            <div className="space-y-2">
              {allDone && <div className="card !bg-green-50 text-center text-sm font-semibold dark:!bg-green-950/40">🎉 {t('today.allDone')}</div>}
              {tasks.map((task) => <TaskCard key={task.id} task={task} />)}
            </div>
          )}
        </section>
      )}

      {formula && (
        <section>
          <h2 className="mb-2 text-lg font-bold">✨ {t('today.formulaOfDay')}</h2>
          <FormulaCard f={formula} />
        </section>
      )}
      </div>
    </div>
  )
}
