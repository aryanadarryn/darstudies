import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { useAccount } from '../auth/account'
import { db } from '../db/db'
import { useT } from '../i18n/useT'
import { useToday } from '../lib/hooks'
import { activeDates, streakNow } from '../lib/progress'
import { AVATAR_COLORS, AVATAR_EMOJIS, displayName, NICKNAME_MAX, resizePhoto, saveProfile, STREAK_GOALS, STREAK_ICONS, streakGoal, streakIcon, type Profile } from '../lib/profile'
import { addDays, fromISO } from '../planner/dates'
import { useSettings } from '../store/settings'
import Avatar from './Avatar'
import { ProgressBar, Sheet, toast } from './ui'

const chip = (on: boolean) =>
  `flex h-11 w-11 items-center justify-center rounded-full text-xl transition ${on ? 'ring-2 ring-violet-600 ring-offset-2 dark:ring-offset-slate-900' : 'bg-slate-100 dark:bg-slate-800'}`

/** Top of the Me page: picture, nickname and streak, with an editor. */
export default function ProfileCard() {
  const { t, lang } = useT()
  const profile = useSettings((s) => s.settings.profile)
  const { session, access } = useAccount()
  const today = useToday()
  const [editing, setEditing] = useState(false)

  const days = useLiveQuery(async () => activeDates(await db.tasks.where('status').equals('done').toArray(), await db.attempts.toArray()), [])
  if (!days) return null
  const streak = streakNow(days, today)
  // Best ever: the streak as it stood on each active day.
  const best = Math.max(streak, ...[...days].map((d) => streakNow(days, d)))
  const goal = streakGoal(profile)
  const icon = streakIcon(profile)
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
  const name = displayName(profile, access?.full_name)

  return (
    <section className="card space-y-4 desk:col-span-2">
      <div className="flex items-center gap-4">
        <Avatar size={72} />
        <div className="min-w-0 flex-1">
          <h2 className={`truncate text-xl font-bold ${name ? '' : 'muted'}`}>{name || t('profile.addName')}</h2>
          {session?.user.email && <p className="truncate text-xs muted">{session.user.email}</p>}
        </div>
        <button className="btn-secondary shrink-0" onClick={() => setEditing(true)}>✏️ {t('profile.edit')}</button>
      </div>

      <div className="rounded-2xl bg-orange-50 p-3 dark:bg-orange-950/30">
        <div className="mb-2 flex items-end justify-between gap-2">
          <div>
            <div className="text-3xl font-bold leading-none">{icon} {streak}</div>
            <div className="mt-1 text-xs muted">{t('today.streak')}</div>
          </div>
          <div className="text-right text-xs muted tabular-nums">
            <div>{t('profile.best')}: <strong>{best}</strong> {t('profile.days')}</div>
            <div>{t('profile.goal')}: <strong>{goal}</strong> {t('profile.days')}</div>
          </div>
        </div>
        <ProgressBar value={Math.min(1, streak / goal)} color="#ea580c" />
        {streak >= goal && <p className="mt-1 text-xs font-semibold text-orange-700 dark:text-orange-300">{t('profile.goalReached')}</p>}
        <div className="mt-3 flex justify-between" aria-label={t('profile.last7')}>
          {week.map((d) => (
            <div key={d} className="flex flex-col items-center gap-1">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${days.has(d) ? 'bg-orange-500 text-white' : 'bg-white text-slate-400 dark:bg-slate-800'}`}>
                {days.has(d) ? icon : '·'}
              </span>
              <span className="text-[10px] muted">{fromISO(d).toLocaleDateString(lang === 'bm' ? 'ms-MY' : 'en-MY', { weekday: 'narrow' })}</span>
            </div>
          ))}
        </div>
      </div>

      <Sheet open={editing} onClose={() => setEditing(false)} title={t('profile.edit')}>
        {editing && <ProfileEditor initial={profile ?? {}} fallbackName={access?.full_name} onDone={() => setEditing(false)} />}
      </Sheet>
    </section>
  )
}

function ProfileEditor({ initial, fallbackName, onDone }: { initial: Profile; fallbackName?: string | null; onDone: () => void }) {
  const { t } = useT()
  const [draft, setDraft] = useState<Profile>(initial)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const set = (patch: Partial<Profile>) => setDraft((d) => ({ ...d, ...patch }))

  const pickPhoto = async (file?: File) => {
    if (!file) return
    try {
      set({ photo: await resizePhoto(file) })
    } catch {
      toast(t('profile.photoError'))
    }
  }

  const save = async () => {
    setBusy(true)
    const patch: Partial<Profile> = { ...draft, nickname: draft.nickname?.trim().slice(0, NICKNAME_MAX) || undefined }
    // Only send the photo when it changed, so an unchanged picture is not uploaded again.
    if (patch.photo === initial.photo) delete patch.photo
    const ok = await saveProfile(patch)
    setBusy(false)
    toast(t(ok ? 'profile.saved' : 'profile.savedLocal'))
    onDone()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar size={80} profile={draft} />
        <div className="flex flex-col gap-2">
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}>📷 {t('profile.upload')}</button>
          {draft.photo && <button className="btn-ghost !text-red-600" onClick={() => set({ photo: undefined })}>{t('profile.removePhoto')}</button>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void pickPhoto(e.target.files?.[0]); e.target.value = '' }} />
      </div>

      <div>
        <span className="label">{t('profile.orEmoji')}</span>
        <div className="flex flex-wrap gap-2">
          {AVATAR_EMOJIS.map((e) => (
            <button key={e} aria-label={e} aria-pressed={!draft.photo && draft.emoji === e} className={chip(!draft.photo && draft.emoji === e)}
              onClick={() => set({ emoji: draft.emoji === e && !draft.photo ? undefined : e, photo: undefined })}>{e}</button>
          ))}
        </div>
      </div>

      <div>
        <span className="label">{t('profile.color')}</span>
        <div className="flex flex-wrap gap-2">
          {AVATAR_COLORS.map((c) => (
            <button key={c} aria-label={c} aria-pressed={(draft.color ?? AVATAR_COLORS[0]) === c} onClick={() => set({ color: c })}
              className={`h-9 w-9 rounded-full ${(draft.color ?? AVATAR_COLORS[0]) === c ? 'ring-2 ring-violet-600 ring-offset-2 dark:ring-offset-slate-900' : ''}`} style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>

      <label className="block">
        <span className="label">{t('profile.nickname')}</span>
        <input className="input" maxLength={NICKNAME_MAX} value={draft.nickname ?? ''} placeholder={fallbackName?.split(/\s+/)[0] ?? ''}
          onChange={(e) => set({ nickname: e.target.value })} />
        <span className="mt-1 block text-xs muted">{t('profile.nicknameHint')}</span>
      </label>

      <div>
        <span className="label">{t('profile.streakIcon')}</span>
        <div className="flex flex-wrap gap-2">
          {STREAK_ICONS.map((i) => (
            <button key={i} aria-label={i} aria-pressed={streakIcon(draft) === i} className={chip(streakIcon(draft) === i)} onClick={() => set({ streakIcon: i })}>{i}</button>
          ))}
        </div>
      </div>

      <div>
        <span className="label">{t('profile.streakGoal')}</span>
        <div className="flex flex-wrap gap-2">
          {STREAK_GOALS.map((g) => (
            <button key={g} aria-pressed={streakGoal(draft) === g} onClick={() => set({ streakGoal: g })}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${streakGoal(draft) === g ? 'bg-violet-700 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
              {g} {t('profile.days')}
            </button>
          ))}
        </div>
      </div>

      <button className="btn-primary w-full disabled:opacity-60" disabled={busy} onClick={save}>{busy ? t('common.loading') : t('profile.save')}</button>
    </div>
  )
}
