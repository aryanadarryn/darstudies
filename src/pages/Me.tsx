import { useLiveQuery } from 'dexie-react-hooks'
import { useRef } from 'react'
import { Bar, BarChart, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import InstallPrompt from '../components/InstallPrompt'
import { PageHeader, ProgressBar, Segmented, toast } from '../components/ui'
import { subjectsOf, subtopicById } from '../content'
import { formOf } from '../content/ids'
import FormSwitch, { useForm } from '../components/FormSwitch'
import AccountCard from '../auth/AccountCard'
import { downloadBlob, exportBackup, importBackup, resetAll } from '../db/backup'
import { db, getKV } from '../db/db'
import { useT } from '../i18n/useT'
import { useMastery, useToday } from '../lib/hooks'
import { activeDates, BADGES, computeXP, earnedBadges, levelOf, streakNow, weekStart, XP_PER_LEVEL } from '../lib/progress'
import { addDays, fromISO, toISO } from '../planner/dates'
import { useSettings } from '../store/settings'

const BADGE_ICON = { 'first-chapter': '📖', 'all-physics': '⚛️', 'streak-7': '🔥', 'formula-master': '∑', comeback: '💪' }

export default function Me() {
  const { t, L, lang } = useT()
  const { settings, update, load } = useSettings()
  const today = useToday()
  const mastery = useMastery()
  const form = useForm()
  const formChapters = subjectsOf(form).reduce((n, s) => n + s.chapters.length, 0)
  const fileRef = useRef<HTMLInputElement>(null)

  const data = useLiveQuery(async () => {
    const [tasks, attempts, intros, drills] = await Promise.all([db.tasks.toArray(), db.attempts.toArray(), db.intros.toArray(), getKV('drills', 0)])
    return { tasks, attempts, intros, drills }
  }, [])

  if (!data) return null
  const { tasks, attempts, intros, drills } = data
  const xp = computeXP(tasks, attempts, intros, drills)
  const { level, into } = levelOf(xp)
  const active = activeDates(tasks, attempts)
  const streak = streakNow(active, today)
  const badges = earnedBadges(intros, active, drills)
  const seen = intros.filter((i) => i.completedAt && formOf(i.chapterId) === form).length

  const masteryData = subjectsOf(form).map((s) => ({ name: s.short ? L(s.short) : L(s.name).split(' ')[0], value: Math.round((mastery?.subject.get(s.id) ?? 0) * 100), color: s.color }))
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(weekStart(today), -7 * (7 - i)))
  const accuracy = weeks.map((w) => {
    const inWeek = attempts.filter((a) => {
      const d = toISO(new Date(a.at))
      return d >= w && d < addDays(w, 7)
    })
    return { week: fromISO(w).toLocaleDateString(lang === 'bm' ? 'ms-MY' : 'en-MY', { day: 'numeric', month: 'short' }), value: inWeek.length ? Math.round((inWeek.filter((a) => a.correct).length / inWeek.length) * 100) : null }
  })
  const weakest = (mastery?.weak ?? []).filter((w) => formOf(w.id) === form).slice().sort((a, b) => a.mastery - b.mastery).slice(0, 5)

  const doExport = async () => downloadBlob(await exportBackup(), `darstudies-backup-${today}.json`)
  const doImport = async (f?: File) => {
    if (!f) return
    try {
      await importBackup(f)
      await load()
      toast(t('me.imported'))
    } catch {
      toast(t('me.importFailed'))
    }
  }
  const doReset = async () => {
    if (!confirm(t('me.resetConfirm'))) return
    await resetAll()
    await load()
    location.assign(import.meta.env.BASE_URL)
  }

  return (
    <div>
      <PageHeader title={t('me.title')} />
      <div className="space-y-4 desk:grid desk:grid-cols-2 desk:items-start desk:gap-4 desk:space-y-0">
      <AccountCard />
      <section className="card">
        <div className="mb-2 flex items-end justify-between">
          <div>
            <div className="text-xs muted">{t('me.level')}</div>
            <div className="text-3xl font-bold">{level}</div>
          </div>
          <div className="text-right text-sm muted tabular-nums">{xp} {t('me.xp')} · {into}/{XP_PER_LEVEL}</div>
        </div>
        <ProgressBar value={into / XP_PER_LEVEL} />
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div><div className="text-xl font-bold">🔥 {streak}</div><div className="text-[11px] muted">{t('me.streak')}</div></div>
          <div><div className="text-xl font-bold">{seen}/{formChapters}</div><div className="text-[11px] muted">{t('me.intros')}</div></div>
          <div><div className="text-xl font-bold">{attempts.length}</div><div className="text-[11px] muted">{t('me.quizzes')}</div></div>
        </div>
      </section>

      <section className="card">
        <h2 className="mb-2 font-bold">{t('me.mastery')}</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={masteryData} margin={{ top: 8, right: 4, bottom: 0, left: -24 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>{masteryData.map((d) => <Cell key={d.name} fill={d.color} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card">
        <h2 className="mb-2 font-bold">{t('me.accuracy')}</h2>
        {attempts.length === 0 ? <p className="text-sm muted">{t('me.noData')}</p> : (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={accuracy} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Line type="monotone" dataKey="value" stroke="#6d28d9" strokeWidth={2.5} connectNulls dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {weakest.length > 0 && (
          <>
            <h3 className="mb-1 mt-3 text-sm font-semibold">{t('me.weakList')}</h3>
            <ul className="space-y-1 text-sm">
              {weakest.map((w) => (
                <li key={w.id} className="flex justify-between gap-2">
                  <span className="truncate">{subtopicById[w.id]?.code} {L(subtopicById[w.id]?.title)}</span>
                  <span className="font-semibold text-red-600">{Math.round(w.mastery * 100)}%</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="card">
        <h2 className="mb-3 font-bold">{t('me.badges')}</h2>
        <div className="grid grid-cols-5 gap-2">
          {BADGES.map((b) => (
            <div key={b} className={`flex flex-col items-center gap-1 text-center ${badges.has(b) ? '' : 'opacity-30 grayscale'}`} title={t(`badge.${b}.d`)}>
              <span className={`flex h-12 w-12 items-center justify-center rounded-full text-xl ${badges.has(b) ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>{BADGE_ICON[b]}</span>
              <span className="text-[10px] font-semibold leading-tight">{t(`badge.${b}`)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="font-bold">{t('me.settings')}</h2>
        <div>
          <span className="label">{t('me.view')}</span>
          <Segmented value={settings.viewMode} onChange={(viewMode) => update({ viewMode })}
            options={[{ value: 'auto', label: t('me.view.auto') }, { value: 'mobile', label: `📱 ${t('me.view.mobile')}` }, { value: 'desktop', label: `🖥️ ${t('me.view.desktop')}` }]} />
        </div>
        <div>
          <span className="label">{t('form.label')}</span>
          <FormSwitch />
        </div>
        <div>
          <span className="label">{t('me.language')}</span>
          <Segmented value={settings.lang} onChange={(lang) => update({ lang })} options={[{ value: 'en', label: 'English' }, { value: 'bm', label: 'Bahasa Melayu' }]} />
        </div>
        <div>
          <span className="label">{t('me.theme')}</span>
          <Segmented value={settings.theme} onChange={(theme) => update({ theme })}
            options={[{ value: 'system', label: t('me.theme.system') }, { value: 'light', label: t('me.theme.light') }, { value: 'dark', label: t('me.theme.dark') }]} />
        </div>
        <label className="flex items-center gap-3">
          <span className="flex-1 text-sm font-medium">⏰ {t('me.reminder')}</span>
          <input type="time" className="input !w-32" value={settings.reminderTime ?? ''} max="22:30" onChange={(e) => update({ reminderTime: e.target.value || undefined })} />
        </label>
        <label className="flex items-center gap-3">
          <span className="flex-1 text-sm font-medium">🧘 {t('me.break')}</span>
          <select className="input !w-32" value={settings.breakMinutes} onChange={(e) => update({ breakMinutes: Number(e.target.value) })}>
            <option value={0}>{t('me.off')}</option>
            {[20, 25, 30, 45].map((m) => <option key={m} value={m}>{t('me.every')} {m} {t('common.min')}</option>)}
          </select>
        </label>
      </section>

      <section className="card space-y-2">
        <h2 className="font-bold">💾 {t('me.backup')}</h2>
        <p className="text-xs muted">{t('me.backupHint')}</p>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-secondary" onClick={doExport}>⬇️ {t('me.export')}</button>
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}>⬆️ {t('me.import')}</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { void doImport(e.target.files?.[0]); e.target.value = '' }} />
        <button className="btn-ghost w-full !text-red-600" onClick={doReset}>{t('me.reset')}</button>
      </section>

      <div className="space-y-4 desk:col-span-2">
      <InstallPrompt />
      <p className="pb-4 text-center text-[11px] muted">Darstudies · v0.1 · {lang === 'en' ? 'All data stays on this device.' : 'Semua data kekal dalam peranti ini.'}</p>
      </div>
      </div>
    </div>
  )
}
