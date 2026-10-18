import { useState } from 'react'
import { useAsync } from '../lib/hooks'
import { type AdminUser, loadPlans, UserEditor } from './AdminUsers'
import { db, downloadCsv, ErrorNote, fmtDate, StatusBadge } from './shared'

const isLive = (u: AdminUser) => u.sub_status === 'active' && !!u.current_period_end && new Date(u.current_period_end) > new Date()

export default function AdminSubscriptions() {
  const [filter, setFilter] = useState<'all' | 'active' | 'lapsed' | 'expiring'>('all')
  const [round, setRound] = useState(0)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const { data, error, loading } = useAsync(async () => {
    const [users, plans] = await Promise.all([db().rpc('admin_list_users', { p_search: '' }), loadPlans()])
    if (users.error) throw users.error
    return { subs: (users.data as AdminUser[]).filter((u) => u.subscription_id), plans }
  }, [round])

  const soon = Date.now() + 7 * 86_400_000
  const subs = (data?.subs ?? [])
    .filter((u) => filter === 'all' || (filter === 'active' ? isLive(u) : filter === 'lapsed' ? !isLive(u) : isLive(u) && new Date(u.current_period_end!).getTime() < soon))
    .sort((a, b) => (a.current_period_end ?? '').localeCompare(b.current_period_end ?? ''))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {(['all', 'active', 'expiring', 'lapsed'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 font-semibold ${filter === f ? 'bg-violet-700 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>
            {f === 'expiring' ? 'expiring in 7 days' : f}
          </button>
        ))}
        <span className="ml-auto muted">{subs.length} subscriptions</span>
        <button className="btn-ghost" onClick={() => downloadCsv('darstudies-subscriptions.csv', subs.map((u) => ({ email: u.email, plan: u.plan_name, status: u.sub_status, active: isLive(u), access_until: u.current_period_end })))}>Export CSV</button>
      </div>
      <p className="text-xs muted">To give someone a subscription who has none, open them under Users.</p>
      {loading ? <p className="py-6 text-center muted">Loading…</p> : <ErrorNote error={error} />}
      <ul className="space-y-2">
        {subs.map((u) => (
          <li key={u.subscription_id}>
            <button className="card flex w-full items-center gap-3 !py-3 text-left" onClick={() => setEditing(u)}>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{u.email ?? '—'}</div>
                <div className="text-xs muted">{u.plan_name ?? 'no plan'} · access until {fmtDate(u.current_period_end)}</div>
              </div>
              <StatusBadge status={isLive(u) ? 'active' : u.sub_status === 'cancelled' ? 'cancelled' : 'expired'} />
            </button>
          </li>
        ))}
      </ul>
      {editing && data && <UserEditor user={editing} plans={data.plans} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setRound((r) => r + 1) }} />}
    </div>
  )
}
