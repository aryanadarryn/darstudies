import { useState } from 'react'
import { useAsync } from '../lib/hooks'
import { db, downloadCsv, ErrorNote, Field, fmtDateTime, inputCls, Modal, rm, StatusBadge } from './shared'

interface Payment {
  id: string; email: string | null; plan_name: string | null; amount_sen: number; status: string; method: string | null
  gateway_ref: string | null; created_at: string; paid_at: string | null; raw: unknown
}

function PaymentEditor({ payment, onClose, onSaved }: { payment: Payment; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState(payment.status)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const act = async (fn: () => PromiseLike<{ error: unknown }>) => {
    setBusy(true)
    const { error } = await fn()
    setBusy(false)
    if (error) setError(error)
    else onSaved()
  }
  return (
    <Modal title={`Payment ${rm(payment.amount_sen)}`} onClose={onClose}>
      <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="muted">User</dt><dd className="truncate">{payment.email ?? 'deleted user'}</dd>
        <dt className="muted">Plan</dt><dd>{payment.plan_name ?? '—'}</dd>
        <dt className="muted">Method</dt><dd>{payment.method ?? '—'}</dd>
        <dt className="muted">Created</dt><dd>{fmtDateTime(payment.created_at)}</dd>
        <dt className="muted">Paid</dt><dd>{fmtDateTime(payment.paid_at)}</dd>
        <dt className="muted">CHIP ID</dt><dd className="break-all font-mono text-xs">{payment.gateway_ref ?? '—'}</dd>
      </dl>
      <Field label="Status" hint="Changing the status here only updates the record. Refund the money in the CHIP portal, and change the user's access under Users.">
        <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
          {['pending', 'paid', 'failed', 'refunded'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      {payment.raw != null && (
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer muted">Gateway response</summary>
          <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-100 p-2 dark:bg-slate-800">{JSON.stringify(payment.raw, null, 2)}</pre>
        </details>
      )}
      <ErrorNote error={error} />
      <div className="mt-4 flex justify-between gap-2">
        <button className="btn-ghost text-red-600" disabled={busy}
          onClick={() => confirm('Delete this payment record?') && act(() => db().from('payments').delete().eq('id', payment.id))}>Delete record</button>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy || status === payment.status} onClick={() => act(() => db().from('payments').update({ status }).eq('id', payment.id))}>Save</button>
        </div>
      </div>
    </Modal>
  )
}

export default function AdminPayments() {
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [round, setRound] = useState(0)
  const [editing, setEditing] = useState<Payment | null>(null)
  const { data, error, loading } = useAsync(async () => {
    let q = db().from('payments').select('id, email, plan_name, amount_sen, status, method, gateway_ref, created_at, paid_at, raw').order('created_at', { ascending: false }).limit(500)
    if (status !== 'all') q = q.eq('status', status)
    const { data, error } = await q
    if (error) throw error
    return data as Payment[]
  }, [status, round])
  const rows = (data ?? []).filter((p) => !search || (p.email ?? '').toLowerCase().includes(search.toLowerCase()))
  const total = rows.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount_sen, 0)

  return (
    <div className="space-y-3">
      <input className={inputCls} placeholder="Filter by email" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Filter payments by email" />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {['all', 'paid', 'pending', 'failed', 'refunded'].map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`rounded-full px-3 py-1 font-semibold ${status === s ? 'bg-violet-700 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>{s}</button>
        ))}
        <span className="ml-auto muted">{rows.length} · paid {rm(total)}</span>
        <button className="btn-ghost" onClick={() => downloadCsv('darstudies-payments.csv', rows.map(({ raw: _raw, ...r }) => r))}>Export CSV</button>
      </div>
      {loading ? <p className="py-6 text-center muted">Loading…</p> : <ErrorNote error={error} />}
      <ul className="space-y-2">
        {rows.map((p) => (
          <li key={p.id}>
            <button className="card flex w-full items-center gap-3 !py-3 text-left" onClick={() => setEditing(p)}>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{p.email ?? 'deleted user'}</div>
                <div className="text-xs muted">{p.plan_name ?? '—'} · {fmtDateTime(p.created_at)}{p.method ? ` · ${p.method}` : ''}</div>
              </div>
              <span className="tabular-nums text-sm">{rm(p.amount_sen)}</span>
              <StatusBadge status={p.status} />
            </button>
          </li>
        ))}
      </ul>
      {editing && <PaymentEditor payment={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setRound((r) => r + 1) }} />}
    </div>
  )
}
