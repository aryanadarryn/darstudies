import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { create } from 'zustand'
import { band } from '../planner/mastery'
import { useT } from '../i18n/useT'

export function PageHeader({ title, subtitle, back, right }: { title: ReactNode; subtitle?: ReactNode; back?: boolean | string; right?: ReactNode }) {
  const nav = useNavigate()
  return (
    <header className="sticky top-0 z-20 -mx-4 mb-4 flex items-center gap-2 border-b border-slate-200/70 bg-slate-50/90 px-4 py-3 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/90">
      {back && (
        <button
          aria-label="Back"
          className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800"
          onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 18l-6-6 6-6" /></svg>
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold leading-tight">{title}</h1>
        {subtitle && <p className="truncate text-xs muted">{subtitle}</p>}
      </div>
      {right}
    </header>
  )
}

const BAND_COLOR = { red: '#ef4444', amber: '#f59e0b', green: '#22c55e' }

export function MasteryRing({ value, size = 44, label = true }: { value: number; size?: number; label?: boolean }) {
  const r = size / 2 - 4
  const c = 2 * Math.PI * r
  const pct = Math.round(value * 100)
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Mastery ${pct}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={4} className="stroke-slate-200 dark:stroke-slate-700" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={4} strokeLinecap="round"
          stroke={value > 0 ? BAND_COLOR[band(value)] : 'transparent'} strokeDasharray={c} strokeDashoffset={c * (1 - value)}
          style={{ transition: 'stroke-dashoffset .6s ease' }}
        />
      </svg>
      {label && <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold">{pct}%</span>}
    </div>
  )
}

export function Pill({ children, color, className = '' }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${color ? 'text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'} ${className}`}
      style={color ? { backgroundColor: color } : undefined}
    >
      {children}
    </span>
  )
}

export function DraftBadge() {
  const { t } = useT()
  return <Pill className="!bg-amber-100 !text-amber-800 dark:!bg-amber-900/50 dark:!text-amber-200">{t('common.draft')}</Pill>
}

export function ProgressBar({ value, color = '#0f766e' }: { value: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, value * 100)}%`, backgroundColor: color }} />
    </div>
  )
}

export function Empty({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 py-10 text-center">
      <div className="text-4xl" aria-hidden>{icon}</div>
      <div className="muted text-sm">{children}</div>
    </div>
  )
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            role="dialog" aria-modal="true"
            className="safe-bottom max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 dark:bg-slate-900"
            initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
            {title && <h2 className="mb-3 text-lg font-bold">{title}</h2>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ---- Toasts ----
interface ToastState { items: { id: number; text: string }[]; push: (text: string) => void }
let toastId = 0
export const useToast = create<ToastState>((set) => ({
  items: [],
  push: (text) => {
    const id = ++toastId
    set((s) => ({ items: [...s.items, { id, text }] }))
    setTimeout(() => set((s) => ({ items: s.items.filter((i) => i.id !== id) })), 2800)
  },
}))
export const toast = (text: string) => useToast.getState().push(text)

export function Toasts() {
  const items = useToast((s) => s.items)
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
      <AnimatePresence>
        {items.map((i) => (
          <motion.div key={i.id} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg dark:bg-white dark:text-slate-900">
            {i.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} aria-pressed={value === o.value}
          className={`min-h-9 flex-1 rounded-lg px-2 text-sm font-semibold transition ${value === o.value ? 'bg-white shadow-sm dark:bg-slate-700' : 'muted'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
