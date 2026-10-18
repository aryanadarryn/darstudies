import { useState } from 'react'
import { useAccount } from '../auth/account'
import { callFunction } from '../auth/supabase'
import { useAsync } from '../lib/hooks'
import { db, downloadCsv, ErrorNote, Field, fmtDate, fromDateInput, inputCls, Modal, TierBadge, toDateInput } from './shared'

export interface AdminUser {
  id: string; email: string | null; full_name: string | null; provider: string | null; is_admin: boolean
  trial_ends_at: string; created_at: string; last_seen_at: string | null
  subscription_id: string | null; plan_id: string | null; plan_name: string | null; sub_status: string | null
  current_period_end: string | null; tier: string
}
export interface PlanOption { id: string; name_en: string; interval_days: number; active: boolean }

export const loadPlans = async (): Promise<PlanOption[]> => {
  const { data, error } = await db().from('plans').select('id, name_en, interval_days, active').order('sort')
  if (error) throw error
  return data
}

/** Edit one user's trial, admin flag and subscription; or delete the user. */
export function UserEditor({ user, plans, onClose, onSaved }: { user: AdminUser; plans: PlanOption[]; onClose: () => void; onSaved: () => void }) {
  const me = useAccount((s) => s.session?.user.id)
  const [trialEnd, setTrialEnd] = useState(toDateInput(user.trial_ends_at))
  const [isAdmin, setIsAdmin] = useState(user.is_admin)
  const [planId, setPlanId] = useState(user.plan_id ?? plans[0]?.id ?? '')
  const [subStatus, setSubStatus] = useState(user.sub_status ?? 'active')
  const [subEnd, setSubEnd] = useState(toDateInput(user.current_period_end))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try { await fn(); onSaved() } catch (e) { setError(e) } finally { setBusy(false) }
  }

  const save = () => run(async () => {
    const p = await db().from('profiles').update({ trial_ends_at: fromDateInput(trialEnd), is_admin: isAdmin }).eq('id', user.id)
    if (p.error) throw p.error
    if (subEnd) {
      const row = { user_id: user.id, plan_id: planId || null, status: subStatus, current_period_end: fromDateInput(subEnd), updated_at: new Date().toISOString() }
      const s = user.subscription_id
        ? await db().from('subscriptions').update(row).eq('id', user.subscription_id)
        : await db().from('subscriptions').insert(row)
      if (s.error) throw s.error
    }
  })

  const extend = (days: number) => {
    const base = subEnd && new Date(fromDateInput(subEnd)) > new Date() ? new Date(fromDateInput(subEnd)) : new Date()
    base.setDate(base.getDate() + days)
    setSubEnd(toDateInput(base.toISOString()))
    setSubStatus('active')
  }

  const removeSub = () => run(async () => {
    if (!user.subscription_id || !confirm('Remove this subscription? The user falls back to trial/expired access.')) throw new Error('Cancelled')
    const { error } = await db().from('subscriptions').delete().eq('id', user.subscription_id)
    if (error) throw error
  })

  const deleteUser = () => run(async () => {
    if (!confirm(`Permanently delete ${user.email}? Their account and subscription are removed; payment records are kept.`)) throw new Error('Cancelled')
    await callFunction('admin-users', { action: 'delete', user_id: user.id })
  })

  return (
    <Modal title={user.email ?? 'User'} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs muted">{user.full_name ?? '—'} · signed in with {user.provider ?? '—'} · joined {fmtDate(user.created_at)} · last seen {fmtDate(user.last_seen_at)}</p>
        <Field label="Trial ends" hint="Set a future date to give (more) trial time.">
          <input type="date" className={inputCls} value={trialEnd} onChange={(e) => setTrialEnd(e.target.value)} />
        </Field>

        <fieldset className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <legend className="px-1 text-sm font-semibold">Subscription</legend>
          <Field label="Plan">
            <select className={inputCls} value={planId} onChange={(e) => setPlanId(e.target.value)}>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.name_en}{p.active ? '' : ' (inactive)'}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className={inputCls} value={subStatus} onChange={(e) => setSubStatus(e.target.value)}>
              <option value="active">active</option>
              <option value="cancelled">cancelled (no access)</option>
            </select>
          </Field>
          <Field label="Access until" hint="Leave empty for no subscription.">
            <input type="date" className={inputCls} value={subEnd} onChange={(e) => setSubEnd(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => extend(30)}>+30 days</button>
            <button type="button" className="btn-secondary" onClick={() => extend(365)}>+1 year</button>
            {user.subscription_id && <button type="button" className="btn-ghost text-red-600" onClick={removeSub} disabled={busy}>Remove subscription</button>}
          </div>
        </fieldset>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isAdmin} disabled={user.id === me} onChange={(e) => setIsAdmin(e.target.checked)} />
          Admin (full access + this admin screen)
        </label>

        <ErrorNote error={error && (error as Error).message !== 'Cancelled' ? error : null} />
        <div className="flex flex-wrap justify-between gap-2">
          <button className="btn-ghost text-red-600" onClick={deleteUser} disabled={busy || user.id === me}>Delete user</button>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary disabled:opacity-60" onClick={save} disabled={busy || !trialEnd}>{busy ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default function AdminUsers() {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [tier, setTier] = useState('all')
  const [round, setRound] = useState(0)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const { data, error, loading } = useAsync(async () => {
    const [users, plans] = await Promise.all([db().rpc('admin_list_users', { p_search: query }), loadPlans()])
    if (users.error) throw users.error
    return { users: users.data as AdminUser[], plans }
  }, [query, round])
  const users = (data?.users ?? []).filter((u) => tier === 'all' || u.tier === tier)

  return (
    <div className="space-y-3">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setQuery(search.trim()) }}>
        <input className={inputCls} placeholder="Search email or name" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search users" />
        <button className="btn-primary">Search</button>
      </form>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {['all', 'trial', 'full', 'expired'].map((t) => (
          <button key={t} onClick={() => setTier(t)} className={`rounded-full px-3 py-1 font-semibold ${tier === t ? 'bg-violet-700 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>
            {t === 'full' ? 'subscribed' : t}
          </button>
        ))}
        <span className="ml-auto muted">{users.length} users</span>
        <button className="btn-ghost" onClick={() => downloadCsv('darstudies-users.csv', users.map(({ id, email, full_name, provider, tier, trial_ends_at, plan_name, current_period_end, created_at, last_seen_at }) => ({ id, email, full_name, provider, tier, trial_ends_at, plan_name, current_period_end, created_at, last_seen_at })))}>Export CSV</button>
      </div>
      {loading ? <p className="py-6 text-center muted">Loading…</p> : <ErrorNote error={error} />}
      <ul className="space-y-2">
        {users.map((u) => (
          <li key={u.id}>
            <button className="card flex w-full items-center gap-3 !py-3 text-left" onClick={() => setEditing(u)}>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{u.email ?? '—'} {u.is_admin && <span className="text-xs">🛠️</span>}</div>
                <div className="truncate text-xs muted">
                  {u.full_name ?? '—'} · {u.provider ?? '—'} · joined {fmtDate(u.created_at)}
                  {u.tier === 'trial' && ` · trial to ${fmtDate(u.trial_ends_at)}`}
                  {u.current_period_end && ` · ${u.plan_name ?? 'plan'} to ${fmtDate(u.current_period_end)}`}
                </div>
              </div>
              <TierBadge tier={u.tier} />
            </button>
          </li>
        ))}
      </ul>
      {editing && data && <UserEditor user={editing} plans={data.plans} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setRound((r) => r + 1) }} />}
    </div>
  )
}
