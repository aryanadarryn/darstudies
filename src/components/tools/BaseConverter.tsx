// Tool #12 — number base converter with working (place values and repeated division).
import { useState } from 'react'
import { useT } from '../../i18n/useT'

const BASES = [2, 3, 4, 5, 6, 7, 8, 9, 10]
const SUB = '₀₁₂₃₄₅₆₇₈₉'
const sub = (n: number) => String(n).split('').map((d) => SUB[Number(d)]).join('')

export function parseInBase(s: string, base: number): number | undefined {
  if (!/^\d+$/.test(s) || s.split('').some((d) => Number(d) >= base)) return undefined
  return s.split('').reduce((acc, d) => acc * base + Number(d), 0)
}

export default function BaseConverter() {
  const { lang } = useT()
  const t = (en: string, bm: string) => (lang === 'en' ? en : bm)
  const [input, setInput] = useState('45')
  const [from, setFrom] = useState(10)
  const [to, setTo] = useState(2)
  const value = parseInBase(input.trim(), from)

  const digits = input.trim().split('')
  const divisions: { n: number; q: number; r: number }[] = []
  if (value !== undefined && to !== 10) for (let n = value; n > 0; n = Math.floor(n / to)) divisions.push({ n, q: Math.floor(n / to), r: n % to })

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input className="input flex-1 font-mono text-lg" inputMode="numeric" value={input} onChange={(e) => setInput(e.target.value.replace(/\D/g, ''))} aria-label={t('Number', 'Nombor')} />
        <select className="input !w-28" value={from} onChange={(e) => setFrom(Number(e.target.value))} aria-label={t('From base', 'Dari asas')}>
          {BASES.map((b) => <option key={b} value={b}>{t('base', 'asas')} {b}</option>)}
        </select>
      </div>
      {value === undefined ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {t(`Base ${from} only uses digits 0–${from - 1}.`, `Asas ${from} hanya guna digit 0–${from - 1}.`)}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {BASES.map((b) => (
              <button key={b} onClick={() => setTo(b)}
                className={`rounded-xl border-2 p-2 text-left ${to === b ? 'border-violet-600 bg-violet-50 dark:bg-violet-950/40' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}>
                <div className="text-[10px] muted">{t('base', 'asas')} {b}</div>
                <div className="break-all font-mono font-semibold">{value.toString(b)}</div>
              </button>
            ))}
          </div>

          {from !== 10 && (
            <section className="card text-sm">
              <h3 className="mb-2 font-bold">{t('Step 1 — to base 10', 'Langkah 1 — ke asas 10')}</h3>
              <p className="font-mono leading-7">
                {digits.map((d, i) => `${d}×${from}${'⁰¹²³⁴⁵⁶⁷⁸⁹'[digits.length - 1 - i] ?? `^${digits.length - 1 - i}`}`).join(' + ')}
                <br />= {digits.map((d, i) => Number(d) * from ** (digits.length - 1 - i)).join(' + ')} = <strong>{value}{sub(10)}</strong>
              </p>
            </section>
          )}
          {to !== 10 && value > 0 && (
            <section className="card text-sm">
              <h3 className="mb-2 font-bold">{from !== 10 ? t('Step 2', 'Langkah 2') : t('Working', 'Jalan kerja')} — {t(`divide by ${to}`, `bahagi dengan ${to}`)}</h3>
              <table className="w-full font-mono">
                <tbody>
                  {divisions.map((d, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-1">{to} ) {d.n}</td>
                      <td className="py-1 text-right muted">{t('rem', 'baki')}</td>
                      <td className="w-8 py-1 text-right font-bold text-violet-700 dark:text-violet-300">{d.r}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2">↑ {t('Read remainders bottom to top', 'Baca baki dari bawah ke atas')}: <strong className="font-mono">{value.toString(to)}{sub(to)}</strong></p>
            </section>
          )}
        </>
      )}
    </div>
  )
}
