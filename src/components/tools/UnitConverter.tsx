// Unit & prefix converter: SI prefixes with powers of ten and standard form, plus common unit conversions.
import { useState } from 'react'
import Katex from '../formula/Katex'
import { Field, Note, Tabs, fmt, fmtTex, num, sup, useTr } from './toolUi'

const PREFIXES = [
  { p: 'T', en: 'tera', e: 12 }, { p: 'G', en: 'giga', e: 9 }, { p: 'M', en: 'mega', e: 6 }, { p: 'k', en: 'kilo', e: 3 },
  { p: '', en: '—', e: 0 }, { p: 'd', en: 'deci', e: -1 }, { p: 'c', en: 'centi', e: -2 }, { p: 'm', en: 'milli', e: -3 },
  { p: 'μ', en: 'micro', e: -6 }, { p: 'n', en: 'nano', e: -9 }, { p: 'p', en: 'pico', e: -12 },
]
const UNITS = ['m', 'g', 's', 'A', 'J', 'W', 'V', 'Hz', 'Pa', 'N', 'L']

interface Conv { en: string; bm: string; a: string; b: string; to: (x: number) => number; back: (x: number) => number; how: string }
const CONVS: Conv[] = [
  { en: 'Speed', bm: 'Laju', a: 'km h⁻¹', b: 'm s⁻¹', to: (x) => x / 3.6, back: (x) => x * 3.6, how: '× 1000 ÷ 3600 = ÷ 3.6' },
  { en: 'Area', bm: 'Luas', a: 'cm²', b: 'm²', to: (x) => x / 1e4, back: (x) => x * 1e4, how: '1 m² = 100 cm × 100 cm = 10⁴ cm²' },
  { en: 'Volume', bm: 'Isi padu', a: 'cm³', b: 'm³', to: (x) => x / 1e6, back: (x) => x * 1e6, how: '1 m³ = 10⁶ cm³' },
  { en: 'Volume', bm: 'Isi padu', a: 'cm³', b: 'dm³ (L)', to: (x) => x / 1000, back: (x) => x * 1000, how: '1 dm³ = 1 L = 1000 cm³' },
  { en: 'Density', bm: 'Ketumpatan', a: 'g cm⁻³', b: 'kg m⁻³', to: (x) => x * 1000, back: (x) => x / 1000, how: '1 g cm⁻³ = 10⁻³ kg ÷ 10⁻⁶ m³ = 1000 kg m⁻³' },
  { en: 'Temperature', bm: 'Suhu', a: '°C', b: 'K', to: (x) => x + 273, back: (x) => x - 273, how: 'K = °C + 273' },
  { en: 'Energy', bm: 'Tenaga', a: 'kWh', b: 'J', to: (x) => x * 3.6e6, back: (x) => x / 3.6e6, how: '1 kWh = 1000 W × 3600 s = 3.6 × 10⁶ J' },
  { en: 'Time', bm: 'Masa', a: 'h', b: 's', to: (x) => x * 3600, back: (x) => x / 3600, how: '1 h = 60 × 60 s' },
]

/** Standard form A × 10ⁿ with 1 ≤ |A| < 10. */
export function standardForm(x: number, sig = 4) {
  if (x === 0) return { a: 0, n: 0 }
  const n = Math.floor(Math.log10(Math.abs(x)))
  let a = Number((x / 10 ** n).toPrecision(sig))
  let k = n
  if (Math.abs(a) >= 10) { a /= 10; k += 1 }
  return { a: Number(a.toPrecision(sig)), n: k }
}

export default function UnitConverter() {
  const { t } = useTr()
  const [mode, setMode] = useState<'prefix' | 'units' | 'sf'>('prefix')
  const [value, setValue] = useState('2.5')
  const [from, setFrom] = useState(3) // km → m
  const [to, setTo] = useState(4)
  const [unit, setUnit] = useState('m')
  const [ci, setCi] = useState(0)
  const [cv, setCv] = useState('90')
  const [rev, setRev] = useState(false)
  const [sfIn, setSfIn] = useState('0.000 045 6')

  const x = num(value)
  const pf = PREFIXES[from], pt = PREFIXES[to]
  const shift = pf.e - pt.e
  const out = x === undefined ? undefined : x * 10 ** shift
  const sf = out === undefined ? undefined : standardForm(out)

  const conv = CONVS[ci]
  const cx = num(cv)
  const cout = cx === undefined ? undefined : rev ? conv.back(cx) : conv.to(cx)

  const sx = num(sfIn.replace(/\s/g, ''))
  const s2 = sx === undefined ? undefined : standardForm(sx)

  const select = (v: number, set: (n: number) => void, label: string) => (
    <select className="input" value={v} onChange={(e) => set(Number(e.target.value))} aria-label={label}>
      {PREFIXES.map((p, i) => <option key={p.en} value={i}>{p.p ? `${p.p}${unit} (${p.en}, 10${sup(p.e)})` : `${unit} (10⁰)`}</option>)}
    </select>
  )

  return (
    <div className="space-y-3">
      <Tabs value={mode} onChange={setMode} items={[
        { k: 'prefix', label: t('Prefixes', 'Imbuhan') }, { k: 'units', label: t('Units', 'Unit') }, { k: 'sf', label: t('Standard form', 'Bentuk piawai') },
      ]} />

      {mode === 'prefix' && (
        <>
          <div className="flex flex-wrap gap-1">
            {UNITS.map((u) => (
              <button key={u} onClick={() => setUnit(u)} className={`rounded-lg px-2.5 py-1 font-mono text-sm ${unit === u ? 'bg-violet-700 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>{u}</button>
            ))}
          </div>
          <input className="input font-mono text-lg" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} aria-label={t('Value', 'Nilai')} />
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            {select(from, setFrom, t('From', 'Dari'))}
            <button className="rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800" onClick={() => { setFrom(to); setTo(from) }} aria-label={t('Swap', 'Tukar')}>⇄</button>
            {select(to, setTo, t('To', 'Ke'))}
          </div>
          {out === undefined ? <Note>{t('Type a number.', 'Taip satu nombor.')}</Note> : (
            <section className="card space-y-2 text-sm">
              <div className="text-center text-xl"><Katex tex={`${fmtTex(x!)}\\ \\text{${pf.p}${unit}} = ${fmtTex(out, 6)}\\ \\text{${pt.p}${unit}}`} /></div>
              <p>{t('Working', 'Jalan kerja')}: 1 {pf.p}{unit} = 10{sup(pf.e)} {unit}, 1 {pt.p}{unit} = 10{sup(pt.e)} {unit}
                → {t('multiply by', 'darab dengan')} 10{sup(pf.e)} ÷ 10{sup(pt.e)} = <strong>10{sup(shift)}</strong></p>
              <p>{t('Standard form', 'Bentuk piawai')}: <strong>{sf!.a} × 10{sup(sf!.n)} {pt.p}{unit}</strong></p>
            </section>
          )}
          <p className="text-xs muted">{t('Going to a smaller prefix gives a bigger number (1 km = 1000 m).', 'Ke imbuhan yang lebih kecil memberi nombor yang lebih besar (1 km = 1000 m).')}</p>
        </>
      )}

      {mode === 'units' && (
        <>
          <select className="input" value={ci} onChange={(e) => setCi(Number(e.target.value))} aria-label={t('Conversion', 'Penukaran')}>
            {CONVS.map((c, i) => <option key={i} value={i}>{t(c.en, c.bm)}: {c.a} ↔ {c.b}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <div className="flex-1"><Field label={rev ? conv.b : conv.a} value={cv} onChange={setCv} /></div>
            <button className="rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800" onClick={() => setRev(!rev)} aria-label={t('Swap', 'Tukar')}>⇄</button>
          </div>
          {cout !== undefined && <Note tone="ok"><strong>{fmt(cx!)} {rev ? conv.b : conv.a} = {fmt(cout, 5)} {rev ? conv.a : conv.b}</strong><br /><span className="text-xs">{conv.how}</span></Note>}
        </>
      )}

      {mode === 'sf' && (
        <>
          <Field label={t('Number', 'Nombor')} value={sfIn} onChange={setSfIn} />
          {s2 === undefined ? <Note>{t('Type a number, e.g. 150000000 or 0.0000078.', 'Taip satu nombor, cth. 150000000 atau 0.0000078.')}</Note> : (
            <section className="card space-y-1 text-sm">
              <div className="text-center text-xl"><Katex tex={`${sx} = ${s2.a} \\times 10^{${s2.n}}`} /></div>
              <p>{s2.n > 0 ? t(`Move the decimal point ${s2.n} place(s) to the left → positive index.`, `Gerakkan titik perpuluhan ${s2.n} tempat ke kiri → indeks positif.`)
                : s2.n < 0 ? t(`Move the decimal point ${-s2.n} place(s) to the right → negative index.`, `Gerakkan titik perpuluhan ${-s2.n} tempat ke kanan → indeks negatif.`)
                : t('Already between 1 and 10 → index 0.', 'Sudah antara 1 dan 10 → indeks 0.')}</p>
              <p className="text-xs muted">{t('Standard form: A × 10ⁿ, where 1 ≤ A < 10 and n is an integer. Shown to 4 significant figures.', 'Bentuk piawai: A × 10ⁿ, dengan 1 ≤ A < 10 dan n ialah integer. Dipaparkan kepada 4 angka bererti.')}</p>
            </section>
          )}
        </>
      )}
    </div>
  )
}
