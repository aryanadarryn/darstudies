// Tool #1 — linear motion calculator: fill in any three of u, v, a, s, t.
import { useMemo, useState } from 'react'
import { useT } from '../../i18n/useT'
import { parseNumber } from '../../lib/quizCheck'
import Katex from '../formula/Katex'
import { solveMotion, type Var } from './motionSolver'

const VARS: { k: Var; en: string; bm: string; unit: string }[] = [
  { k: 'u', en: 'Initial velocity', bm: 'Halaju awal', unit: 'm s⁻¹' },
  { k: 'v', en: 'Final velocity', bm: 'Halaju akhir', unit: 'm s⁻¹' },
  { k: 'a', en: 'Acceleration', bm: 'Pecutan', unit: 'm s⁻²' },
  { k: 's', en: 'Displacement', bm: 'Sesaran', unit: 'm' },
  { k: 't', en: 'Time', bm: 'Masa', unit: 's' },
]

const EXAMPLES = [
  { en: 'Car braking', bm: 'Kereta membrek', v: { u: '20', v: '0', t: '4' } },
  { en: 'Dropped stone (2 s)', bm: 'Batu dijatuhkan (2 s)', v: { u: '0', a: '9.81', t: '2' } },
  { en: 'Motorcycle from rest', bm: 'Motosikal dari pegun', v: { u: '0', v: '15', t: '5' } },
]

const fmt = (x: number) => (Math.abs(x) >= 1e4 || (Math.abs(x) < 1e-3 && x !== 0) ? x.toExponential(3) : String(Math.round(x * 1000) / 1000))

export default function MotionCalc() {
  const { lang } = useT()
  const [inputs, setInputs] = useState<Partial<Record<Var, string>>>({})
  const known = useMemo(() => {
    const k: Partial<Record<Var, number>> = {}
    for (const { k: key } of VARS) {
      const n = parseNumber(inputs[key] ?? '')
      if (n !== undefined) k[key] = n
    }
    return k
  }, [inputs])
  const result = solveMotion(known)
  const count = Object.keys(known).length

  return (
    <div className="space-y-3">
      <p className="text-sm muted">{lang === 'en' ? 'Enter any 3 values. Use a negative a for deceleration.' : 'Masukkan mana-mana 3 nilai. Guna a negatif untuk nyahpecutan.'}</p>
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((e) => (
          <button key={e.en} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold dark:bg-slate-800" onClick={() => setInputs(e.v)}>{e[lang]}</button>
        ))}
        <button className="rounded-full px-3 py-1.5 text-xs font-semibold text-red-600" onClick={() => setInputs({})}>✕ {lang === 'en' ? 'Clear' : 'Kosongkan'}</button>
      </div>
      <div className="space-y-2">
        {VARS.map(({ k, en, bm, unit }) => {
          const solved = inputs[k] === undefined || inputs[k] === '' ? result.values[k] : undefined
          return (
            <label key={k} className="flex items-center gap-3">
              <span className="w-8 text-center font-mono text-xl font-bold italic">{k}</span>
              <span className="w-28 shrink-0 text-xs muted">{lang === 'en' ? en : bm}</span>
              <input
                className={`input tabular-nums ${solved !== undefined ? '!border-teal-500 !bg-teal-50 font-bold dark:!bg-teal-950/40' : ''}`}
                inputMode="decimal" placeholder={solved !== undefined ? fmt(solved) : '?'} value={inputs[k] ?? ''}
                onChange={(e) => setInputs({ ...inputs, [k]: e.target.value })}
              />
              <span className="w-12 shrink-0 text-xs">{unit}</span>
            </label>
          )
        })}
      </div>
      {count < 3 ? (
        <p className="rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-800">{lang === 'en' ? `Enter ${3 - count} more value(s).` : `Masukkan ${3 - count} lagi nilai.`}</p>
      ) : result.error === 'inconsistent' ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">{lang === 'en' ? 'These values don\'t fit uniform acceleration — check them.' : 'Nilai ini tidak sepadan dengan pecutan seragam — semak semula.'}</p>
      ) : result.steps.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-bold">{lang === 'en' ? 'Working' : 'Jalan kerja'}</h3>
          {result.steps.map((s, i) => (
            <div key={i} className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
              <Katex tex={s.latex} />
              <div className="mt-1 font-semibold">{s.solved} = {fmt(s.value)} {VARS.find((x) => x.k === s.solved)!.unit}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
