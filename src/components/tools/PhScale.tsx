// pH scale slider: universal-indicator colour, [H⁺] and [OH⁻], everyday examples, and pH from concentration.
import { useState } from 'react'
import Katex from '../formula/Katex'
import { Chip, Field, Note, Stat, Tabs, fmt, fmtTex, num, useTr } from './toolUi'

// Universal indicator colours for pH 0 … 14.
const UI_COLOURS = ['#b91c1c', '#dc2626', '#ef4444', '#f97316', '#fb923c', '#facc15', '#fde047', '#22c55e', '#14b8a6', '#0ea5e9', '#2563eb', '#4338ca', '#6d28d9', '#7c3aed', '#581c87']

const EXAMPLES = [
  { ph: 1, en: 'Gastric juice', bm: 'Jus gastrik' }, { ph: 2, en: 'Lemon juice', bm: 'Jus lemon' },
  { ph: 3, en: 'Vinegar', bm: 'Cuka' }, { ph: 5, en: 'Black coffee', bm: 'Kopi O' }, { ph: 6.5, en: 'Milk', bm: 'Susu' },
  { ph: 7, en: 'Pure water', bm: 'Air suling' }, { ph: 7.4, en: 'Blood', bm: 'Darah' }, { ph: 8.5, en: 'Toothpaste', bm: 'Ubat gigi' },
  { ph: 10.5, en: 'Milk of magnesia', bm: 'Susu magnesia' }, { ph: 11.5, en: 'Ammonia solution', bm: 'Larutan ammonia' },
  { ph: 13, en: 'Bleach', bm: 'Peluntur' }, { ph: 14, en: '1 mol dm⁻³ NaOH', bm: 'NaOH 1 mol dm⁻³' },
]

export function classify(ph: number) {
  if (ph < 3) return { en: 'Strongly acidic', bm: 'Berasid kuat' }
  if (ph < 7) return { en: 'Weakly acidic', bm: 'Berasid lemah' }
  if (ph === 7) return { en: 'Neutral', bm: 'Neutral' }
  if (ph <= 11) return { en: 'Weakly alkaline', bm: 'Beralkali lemah' }
  return { en: 'Strongly alkaline', bm: 'Beralkali kuat' }
}

const SOLUTES = [
  { f: 'HCl', type: 'acid' as const, n: 1 }, { f: 'HNO₃', type: 'acid' as const, n: 1 }, { f: 'H₂SO₄', type: 'acid' as const, n: 2 },
  { f: 'NaOH', type: 'alkali' as const, n: 1 }, { f: 'KOH', type: 'alkali' as const, n: 1 }, { f: 'Ba(OH)₂', type: 'alkali' as const, n: 2 },
]

export default function PhScale() {
  const { t } = useTr()
  const [mode, setMode] = useState<'scale' | 'calc'>('scale')
  const [ph, setPh] = useState(3)
  const [solute, setSolute] = useState(0)
  const [conc, setConc] = useState('0.01')

  const colour = UI_COLOURS[Math.round(Math.min(14, Math.max(0, ph)))]
  const cls = classify(Math.round(ph * 10) / 10)
  const s = SOLUTES[solute]
  const c = num(conc)
  const ion = c !== undefined && c > 0 ? c * s.n : undefined
  const calcPh = ion === undefined ? undefined : s.type === 'acid' ? -Math.log10(ion) : 14 + Math.log10(ion)

  return (
    <div className="space-y-3">
      <Tabs value={mode} onChange={setMode} items={[{ k: 'scale', label: t('pH scale', 'Skala pH') }, { k: 'calc', label: t('Calculate pH', 'Hitung pH') }]} />
      {mode === 'scale' ? (
        <>
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl text-3xl font-bold text-white shadow-inner" style={{ background: colour }}>{ph.toFixed(1)}</div>
            <div>
              <div className="text-xl font-bold">{t(cls.en, cls.bm)}</div>
              <div className="text-sm muted">{t('Universal indicator colour', 'Warna penunjuk semesta')}</div>
            </div>
          </div>
          <div className="h-4 rounded-full" style={{ background: `linear-gradient(to right, ${UI_COLOURS.join(',')})` }} />
          <input type="range" min={0} max={14} step={0.1} value={ph} onChange={(e) => setPh(Number(e.target.value))} className="w-full" aria-label="pH" />
          <div className="flex justify-between text-[10px] muted">{Array.from({ length: 15 }, (_, i) => <span key={i}>{i}</span>)}</div>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((e) => <Chip key={e.en} active={ph === e.ph} onClick={() => setPh(e.ph)}>{t(e.en, e.bm)} ≈ {e.ph}</Chip>)}
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <Stat label={<>[H⁺] <Katex tex="=10^{-\text{pH}}" /></>}>{fmt(10 ** -ph, 3)} mol dm⁻³</Stat>
            <Stat label={<>[OH⁻] <Katex tex="=10^{-\text{pOH}}" /></>}>{fmt(10 ** -(14 - ph), 3)} mol dm⁻³</Stat>
            <Stat label="pOH = 14 − pH">{fmt(14 - ph, 3)}</Stat>
            <Stat label={t('vs pH 7', 'berbanding pH 7')}>
              {ph < 7 ? t(`${fmt(10 ** (7 - ph), 3)}× more H⁺`, `${fmt(10 ** (7 - ph), 3)}× lebih H⁺`) : ph > 7 ? t(`${fmt(10 ** (ph - 7), 3)}× more OH⁻`, `${fmt(10 ** (ph - 7), 3)}× lebih OH⁻`) : '—'}
            </Stat>
          </dl>
          <p className="text-xs muted">{t('Each step of 1 on the pH scale is a 10× change in [H⁺]. Example values are typical, not exact.', 'Setiap perubahan 1 unit pH ialah perubahan 10× dalam [H⁺]. Nilai contoh adalah anggaran biasa.')}</p>
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {SOLUTES.map((x, i) => <Chip key={x.f} active={solute === i} onClick={() => setSolute(i)}>{x.f}</Chip>)}
          </div>
          <Field label={t('Concentration', 'Kepekatan')} unit="mol dm⁻³" value={conc} onChange={setConc} />
          {calcPh === undefined ? <Note>{t('Enter a concentration above 0.', 'Masukkan kepekatan lebih daripada 0.')}</Note> : (
            <section className="card space-y-1 text-sm">
              <p>{s.type === 'acid'
                ? t(`${s.f} is a strong acid: it ionises completely, giving ${s.n} H⁺ per formula unit.`, `${s.f} ialah asid kuat: mengion lengkap, memberi ${s.n} H⁺ bagi setiap unit formula.`)
                : t(`${s.f} is a strong alkali: it ionises completely, giving ${s.n} OH⁻ per formula unit.`, `${s.f} ialah alkali kuat: mengion lengkap, memberi ${s.n} OH⁻ bagi setiap unit formula.`)}</p>
              {s.type === 'acid' ? (
                <Katex block tex={`[\\text{H}^+] = ${s.n} \\times ${fmtTex(c!)} = ${fmtTex(ion!)};\\quad \\text{pH} = -\\log_{10}(${fmtTex(ion!)}) = ${fmtTex(calcPh, 3)}`} />
              ) : (
                <Katex block tex={`[\\text{OH}^-] = ${s.n} \\times ${fmtTex(c!)} = ${fmtTex(ion!)};\\quad \\text{pOH} = ${fmt(-Math.log10(ion!), 3)};\\quad \\text{pH} = 14 - \\text{pOH} = ${fmtTex(calcPh, 3)}`} />
              )}
              <div className="flex items-center gap-3 pt-1">
                <span className="inline-block h-8 w-8 rounded-lg" style={{ background: UI_COLOURS[Math.round(Math.min(14, Math.max(0, calcPh)))] }} />
                <strong>pH = {fmt(calcPh, 3)}</strong>
                <button className="text-xs font-semibold text-violet-700 dark:text-violet-300" onClick={() => { setPh(Math.round(Math.min(14, Math.max(0, calcPh)) * 10) / 10); setMode('scale') }}>{t('Show on scale →', 'Tunjuk pada skala →')}</button>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
