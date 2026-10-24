import { useEffect, useState } from 'react'
import { FEATURES, type Feature } from '../auth/access'
import { useAccount } from '../auth/account'
import { SUBJECTS } from '../content'
import { useAsync } from '../lib/hooks'
import { db, ErrorNote, Field, inputCls } from './shared'

interface Settings { trial_days: number; trial_subjects: string[]; trial_features: string[]; free_subjects: string[]; free_features: string[] }

const FEATURE_LABEL: Record<Feature, string> = {
  learn: 'Learn (chapter intros & notes)', quiz: 'Practice quizzes', flashcards: 'Flashcards',
  drill: 'Formula drill', tools: 'Tools & simulations', planner: 'Study planner',
}

function Checks({ options, value, onChange }: { options: { id: string; label: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
      {options.map((o) => (
        <label key={o.id} className="flex min-h-9 items-center gap-2 text-sm">
          <input type="checkbox" checked={value.includes(o.id)} onChange={(e) => onChange(e.target.checked ? [...value, o.id] : value.filter((x) => x !== o.id))} />
          {o.label}
        </label>
      ))}
    </div>
  )
}

export default function AdminSettings() {
  const refresh = useAccount((s) => s.refresh)
  const { data, error: loadError, loading } = useAsync(async () => {
    const { data, error } = await db().from('app_settings').select('trial_days, trial_subjects, trial_features, free_subjects, free_features').eq('id', 1).single()
    if (error) throw error
    return data as Settings
  }, [])
  const [form, setForm] = useState<Settings | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [saved, setSaved] = useState(false)
  useEffect(() => { if (data) setForm(data) }, [data])

  if (loading || !form) return loadError ? <ErrorNote error={loadError} /> : <p className="py-6 text-center muted">Loading…</p>
  const subjects = SUBJECTS.filter((s) => s.form === 4).map((s) => ({ id: s.id, label: s.name.en }))
  const features = FEATURES.map((f) => ({ id: f, label: FEATURE_LABEL[f] }))
  const set = (patch: Partial<Settings>) => { setForm({ ...form, ...patch }); setSaved(false) }

  const save = async () => {
    setBusy(true)
    setError(null)
    const { error } = await db().from('app_settings').update({ ...form, updated_at: new Date().toISOString() }).eq('id', 1)
    setBusy(false)
    if (error) return setError(error)
    setSaved(true)
    refresh()
  }

  return (
    <div className="space-y-4">
      <section className="card space-y-3">
        <h2 className="font-bold">Free trial</h2>
        <Field label="Trial length (days)" hint="Applies to new sign-ups. Change one user's trial under Users.">
          <input className={`${inputCls} max-w-32`} type="number" min={0} max={365} value={form.trial_days} onChange={(e) => set({ trial_days: Number(e.target.value) })} />
        </Field>
        <div>
          <div className="mb-1 text-sm font-medium">Subjects open during the trial</div>
          <Checks options={subjects} value={form.trial_subjects} onChange={(v) => set({ trial_subjects: v })} />
        </div>
        <div>
          <div className="mb-1 text-sm font-medium">Features open during the trial</div>
          <Checks options={features} value={form.trial_features} onChange={(v) => set({ trial_features: v })} />
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">After the trial ends (not subscribed)</h2>
        <p className="text-xs muted">Leave everything unticked to lock the whole app until the user subscribes.</p>
        <div>
          <div className="mb-1 text-sm font-medium">Subjects still open</div>
          <Checks options={subjects} value={form.free_subjects} onChange={(v) => set({ free_subjects: v })} />
        </div>
        <div>
          <div className="mb-1 text-sm font-medium">Features still open</div>
          <Checks options={features} value={form.free_features} onChange={(v) => set({ free_features: v })} />
        </div>
      </section>

      <p className="text-xs muted">Subscribers and admins always have everything. A subject is usable only when both the subject and the feature are ticked.</p>
      <ErrorNote error={error} />
      <div className="flex items-center justify-end gap-3">
        {saved && <span role="status" className="text-sm text-violet-700 dark:text-violet-300">Saved ✓</span>}
        <button className="btn-primary" disabled={busy || form.trial_days < 0} onClick={save}>{busy ? 'Saving…' : 'Save settings'}</button>
      </div>
    </div>
  )
}
