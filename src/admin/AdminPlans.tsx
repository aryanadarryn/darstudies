import { useState } from 'react'
import { useAsync } from '../lib/hooks'
import { db, ErrorNote, Field, inputCls, Modal, rm } from './shared'

interface Plan { id: string; name_en: string; name_bm: string; price_sen: number; interval_days: number; active: boolean; sort: number }
const EMPTY: Omit<Plan, 'id'> = { name_en: '', name_bm: '', price_sen: 1490, interval_days: 30, active: true, sort: 0 }

function PlanEditor({ plan, onClose, onSaved }: { plan: Plan | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ ...EMPTY, ...plan, price: ((plan?.price_sen ?? EMPTY.price_sen) / 100).toFixed(2) })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))

  const save = async () => {
    const price_sen = Math.round(Number(form.price) * 100)
    if (!form.name_en.trim() || !form.name_bm.trim()) return setError(new Error('Enter both names.'))
    if (!Number.isFinite(price_sen) || price_sen < 100) return setError(new Error('Price must be at least RM 1.00.'))
    if (!(form.interval_days > 0)) return setError(new Error('Days must be more than 0.'))
    setBusy(true)
    const row = { name_en: form.name_en.trim(), name_bm: form.name_bm.trim(), price_sen, interval_days: form.interval_days, active: form.active, sort: form.sort }
    const { error } = plan ? await db().from('plans').update(row).eq('id', plan.id) : await db().from('plans').insert(row)
    setBusy(false)
    if (error) setError(error)
    else onSaved()
  }

  const remove = async () => {
    if (!plan || !confirm(`Delete plan "${plan.name_en}"? Existing subscriptions keep their access dates. Tip: untick "Available" instead to just hide it.`)) return
    setBusy(true)
    const { error } = await db().from('plans').delete().eq('id', plan.id)
    setBusy(false)
    if (error) setError(error)
    else onSaved()
  }

  return (
    <Modal title={plan ? 'Edit plan' : 'New plan'} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name (English)"><input className={inputCls} value={form.name_en} onChange={(e) => set({ name_en: e.target.value })} /></Field>
          <Field label="Name (BM)"><input className={inputCls} value={form.name_bm} onChange={(e) => set({ name_bm: e.target.value })} /></Field>
          <Field label="Price (RM)"><input className={inputCls} type="number" min="1" step="0.01" inputMode="decimal" value={form.price} onChange={(e) => set({ price: e.target.value })} /></Field>
          <Field label="Access (days)"><input className={inputCls} type="number" min="1" value={form.interval_days} onChange={(e) => set({ interval_days: Number(e.target.value) })} /></Field>
          <Field label="Display order"><input className={inputCls} type="number" value={form.sort} onChange={(e) => set({ sort: Number(e.target.value) })} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} /> Available for purchase</label>
        <ErrorNote error={error} />
        <div className="flex justify-between gap-2">
          {plan ? <button className="btn-ghost text-red-600" disabled={busy} onClick={remove}>Delete</button> : <span />}
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default function AdminPlans() {
  const [round, setRound] = useState(0)
  const [editing, setEditing] = useState<Plan | null | 'new'>(null)
  const { data, error, loading } = useAsync(async () => {
    const { data, error } = await db().from('plans').select('*').order('sort')
    if (error) throw error
    return data as Plan[]
  }, [round])
  const done = () => { setEditing(null); setRound((r) => r + 1) }

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><button className="btn-primary" onClick={() => setEditing('new')}>+ New plan</button></div>
      {loading ? <p className="py-6 text-center muted">Loading…</p> : <ErrorNote error={error} />}
      <ul className="space-y-2">
        {(data ?? []).map((p) => (
          <li key={p.id}>
            <button className={`card flex w-full items-center gap-3 !py-3 text-left ${p.active ? '' : 'opacity-60'}`} onClick={() => setEditing(p)}>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{p.name_en} <span className="font-normal muted">/ {p.name_bm}</span></div>
                <div className="text-xs muted">{p.interval_days} days{p.active ? '' : ' · hidden'}</div>
              </div>
              <span className="font-bold tabular-nums">{rm(p.price_sen)}</span>
            </button>
          </li>
        ))}
      </ul>
      {editing && <PlanEditor plan={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={done} />}
    </div>
  )
}
