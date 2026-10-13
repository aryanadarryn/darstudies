import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useAccount } from '../auth/account'
import { PageHeader } from '../components/ui'
import { useAsync } from '../lib/hooks'
import { db, ErrorNote, fmtDateTime, rm, StatusBadge } from './shared'

const TABS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/subscriptions', label: 'Subscriptions' },
  { to: '/admin/payments', label: 'Payments' },
  { to: '/admin/plans', label: 'Plans' },
  { to: '/admin/settings', label: 'Trial & access' },
]

/** Admin area shell: only for profiles with is_admin (the server checks this again for every query). */
export default function Admin() {
  const access = useAccount((s) => s.access)
  if (!access?.is_admin) return <Navigate to="/" replace />
  return (
    <div>
      <PageHeader back="/me" title="Admin" subtitle="Subscriptions & users" />
      <nav className="-mx-4 mb-4 overflow-x-auto px-4" aria-label="Admin sections">
        <ul className="flex gap-1">
          {TABS.map((t) => (
            <li key={t.to}>
              <NavLink to={t.to} end={t.end} className={({ isActive }) => `block whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold ${isActive ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
                {t.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  )
}

interface Stats {
  users: number; new_users_7d: number; active_subscriptions: number; expired_subscriptions: number
  on_trial: number; trial_ended_unpaid: number; revenue_month_sen: number; revenue_total_sen: number; pending_payments: number
}

export function AdminOverview() {
  const { data, error, loading } = useAsync(async () => {
    const [stats, recent] = await Promise.all([
      db().rpc('admin_stats'),
      db().from('payments').select('id, email, plan_name, amount_sen, status, method, created_at').order('created_at', { ascending: false }).limit(8),
    ])
    if (stats.error) throw stats.error
    if (recent.error) throw recent.error
    return { stats: stats.data as Stats, recent: recent.data }
  }, [])
  if (loading) return <p className="py-6 text-center muted">Loading…</p>
  if (error || !data) return <ErrorNote error={error} />
  const s = data.stats
  const tiles: [string, string | number, string?][] = [
    ['Revenue this month', rm(s.revenue_month_sen)], ['Revenue total', rm(s.revenue_total_sen)],
    ['Active subscriptions', s.active_subscriptions], ['Lapsed subscriptions', s.expired_subscriptions],
    ['Users', s.users, `+${s.new_users_7d} in 7 days`], ['On free trial', s.on_trial],
    ['Trial ended, not paid', s.trial_ended_unpaid], ['Pending payments (24h)', s.pending_payments],
  ]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 desk:grid-cols-4">
        {tiles.map(([label, value, sub]) => (
          <div key={label} className="card !p-3">
            <div className="text-xs muted">{label}</div>
            <div className="text-xl font-bold tabular-nums">{value}</div>
            {sub && <div className="text-[11px] muted">{sub}</div>}
          </div>
        ))}
      </div>
      <section className="card">
        <h2 className="mb-2 font-bold">Latest payments</h2>
        {!data.recent.length ? <p className="text-sm muted">No payments yet.</p> : (
          <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {data.recent.map((p) => (
              <li key={p.id} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{p.email ?? 'deleted user'}</div>
                  <div className="text-xs muted">{p.plan_name} · {fmtDateTime(p.created_at)}{p.method ? ` · ${p.method}` : ''}</div>
                </div>
                <span className="tabular-nums">{rm(p.amount_sen)}</span>
                <StatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
