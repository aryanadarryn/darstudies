// Small shared pieces for the practice tools: bilingual text, number formatting, inputs and tabs.
import type { ReactNode } from 'react'
import { useT } from '../../i18n/useT'
import { parseNumber } from '../../lib/quizCheck'

export function useTr() {
  const { lang } = useT()
  return { lang, t: (en: string, bm: string) => (lang === 'en' ? en : bm) }
}

const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }
export const sup = (n: number | string) => String(n).split('').map((c) => SUP[c] ?? c).join('')

/** Rounds to `sig` significant figures, as A × 10ⁿ when very large or very small. */
export function fmt(x: number, sig = 4): string {
  if (!Number.isFinite(x)) return '—'
  if (x === 0) return '0'
  const ax = Math.abs(x)
  if (ax >= 1e6 || ax < 1e-3) {
    const [m, e] = x.toExponential(sig - 1).split('e')
    return `${String(Number(m))} × 10${sup(Number(e))}`
  }
  return String(Number(x.toPrecision(sig)))
}

export const num = (s: string | undefined) => parseNumber(s ?? '')

export function Field({ label, unit, value, onChange, placeholder, solved, sym }: {
  label: string; unit?: string; value: string; onChange: (v: string) => void; placeholder?: string; solved?: boolean; sym?: string
}) {
  return (
    <label className="flex items-center gap-3">
      {sym !== undefined && <span className="w-10 shrink-0 text-center font-mono text-lg font-bold italic">{sym}</span>}
      <span className="w-28 shrink-0 text-xs muted">{label}</span>
      <input
        className={`input tabular-nums ${solved ? '!border-violet-500 !bg-violet-50 font-bold dark:!bg-violet-950/40' : ''}`}
        inputMode="decimal" placeholder={placeholder ?? '?'} value={value} onChange={(e) => onChange(e.target.value)}
      />
      {unit !== undefined && <span className="w-14 shrink-0 text-xs">{unit}</span>}
    </label>
  )
}

export function Tabs<K extends string>({ value, onChange, items }: { value: K; onChange: (k: K) => void; items: { k: K; label: string }[] }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
      {items.map((it) => (
        <button key={it.k} role="tab" aria-selected={value === it.k} onClick={() => onChange(it.k)}
          className={`min-h-9 flex-1 whitespace-nowrap rounded-lg px-3 text-sm font-semibold ${value === it.k ? 'bg-white text-violet-700 shadow dark:bg-slate-900 dark:text-violet-300' : 'text-slate-600 dark:text-slate-300'}`}>
          {it.label}
        </button>
      ))}
    </div>
  )
}

export function Chip({ onClick, children, active }: { onClick: () => void; children: ReactNode; active?: boolean }) {
  return (
    <button onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${active ? 'bg-violet-700 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
      {children}
    </button>
  )
}

export function Note({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'ok'; children: ReactNode }) {
  const cls = tone === 'warn' ? 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200'
    : tone === 'ok' ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
    : 'bg-slate-100 dark:bg-slate-800'
  return <p className={`rounded-xl p-3 text-sm ${cls}`}>{children}</p>
}

export function Stat({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="card !p-3">
      <dt className="text-xs muted">{label}</dt>
      <dd className="font-semibold tabular-nums">{children}</dd>
    </div>
  )
}

export interface SolverVar { k: string; sym: string; en: string; bm: string; unit: string }

/**
 * Fill in all but one of the variables; `solve[k]` returns k from the others (undefined when it cannot).
 * Shows which variable was found and the formula used.
 */
export function FormulaSolver({ vars, solve, values, setValues, formula }: {
  vars: SolverVar[]
  solve: Record<string, (v: Record<string, number>) => number | undefined>
  values: Record<string, string>
  setValues: (v: Record<string, string>) => void
  formula: ReactNode
}) {
  const { t } = useTr()
  const known: Record<string, number> = {}
  for (const v of vars) { const n = num(values[v.k]); if (n !== undefined) known[v.k] = n }
  const missing = vars.filter((v) => known[v.k] === undefined)
  const target = missing.length === 1 ? missing[0] : undefined
  const answer = target ? solve[target.k](known) : undefined
  return (
    <div className="space-y-2">
      <div className="rounded-xl bg-slate-50 py-2 text-center text-lg dark:bg-slate-800/60">{formula}</div>
      {vars.map((v) => (
        <Field key={v.k} sym={v.sym} label={t(v.en, v.bm)} unit={v.unit} value={values[v.k] ?? ''}
          onChange={(s) => setValues({ ...values, [v.k]: s })}
          placeholder={target?.k === v.k && answer !== undefined ? fmt(answer) : '?'} solved={target?.k === v.k && answer !== undefined} />
      ))}
      {missing.length > 1 ? (
        <Note>{t(`Leave exactly one box empty — ${missing.length - 1} more value(s) needed.`, `Biarkan tepat satu kotak kosong — perlu ${missing.length - 1} lagi nilai.`)}</Note>
      ) : missing.length === 0 ? (
        <Note>{t('Clear the box you want to find.', 'Kosongkan kotak yang ingin dicari.')}</Note>
      ) : answer === undefined ? (
        <Note tone="warn">{t('No answer for these values (check for zero or negative numbers).', 'Tiada jawapan untuk nilai ini (semak nombor sifar atau negatif).')}</Note>
      ) : (
        <Note tone="ok"><strong>{target!.sym} = {fmt(answer)} {target!.unit}</strong></Note>
      )}
    </div>
  )
}

/** Guard for solver results: only finite numbers count as answers. */
export const ok = (x: number) => (Number.isFinite(x) ? x : undefined)

/** fmt() for KaTeX: A \times 10^{n}. */
export function fmtTex(x: number, sig = 4): string {
  return fmt(x, sig).replace(/ × 10([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)/, (_, e: string) => {
    const back = Object.fromEntries(Object.entries(SUP).map(([k, v]) => [v, k]))
    return ` \times 10^{${e.split('').map((c) => back[c]).join('')}}`
  })
}
