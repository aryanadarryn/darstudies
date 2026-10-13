// Small building blocks shared by the admin pages (admin UI is English-only).
import type { ReactNode } from 'react'
import { supabase } from '../auth/supabase'

export const db = () => supabase!

export const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
export const fmtDateTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')
export const rm = (sen: number) => `RM ${(sen / 100).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** ISO timestamp → value for <input type="date"> (local date). */
export const toDateInput = (iso?: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
/** <input type="date"> value → ISO timestamp at the end of that local day. */
export const fromDateInput = (v: string) => new Date(`${v}T23:59:59`).toISOString()

export function TierBadge({ tier }: { tier: string }) {
  const tone = tier === 'full' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
    : tier === 'trial' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
    : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{tier === 'full' ? 'subscribed' : tier}</span>
}

export function StatusBadge({ status }: { status: string }) {
  const tone: Record<string, string> = {
    paid: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
    active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200',
    refunded: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
  }
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone[status] ?? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>{status}</span>
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs muted">{hint}</span>}
    </label>
  )
}

export const inputCls = 'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900'

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl dark:bg-slate-900 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">{title}</h2>
          <button aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null
  return <p role="alert" className="text-sm text-red-600">{(error as { message?: string }).message ?? String(error)}</p>
}

/** Downloads rows as a CSV file. */
export function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const cols = Object.keys(rows[0])
  const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}
