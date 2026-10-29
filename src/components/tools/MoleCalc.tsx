// Mole calculator: relative formula mass from a formula, then mass ↔ moles ↔ particles ↔ gas volume.
import { useMemo, useState } from 'react'
import Katex from '../formula/Katex'
import { formulaMass, parseFormula, relativeAtomicMass, type Counts } from './chemFormula'
import { Chip, Field, Note, Stat, fmt, num, useTr } from './toolUi'

const NA = 6.02e23
type Q = 'mass' | 'mol' | 'particles' | 'volume'

const EXAMPLES = ['H2O', 'CO2', 'NaCl', 'CaCO3', 'H2SO4', 'NH3', 'O2', 'CuSO4.5H2O']

export default function MoleCalc() {
  const { t } = useTr()
  const [formula, setFormula] = useState('CO2')
  const [from, setFrom] = useState<Q>('mass')
  const [value, setValue] = useState('11')
  const [molarVolume, setMolarVolume] = useState(24)

  const parsed = useMemo((): { counts: Counts; mr: number } | { error: string } => {
    try {
      const counts = parseFormula(formula)
      return { counts, mr: formulaMass(counts) }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }, [formula])

  const x = num(value)
  const mr = 'mr' in parsed ? parsed.mr : undefined
  let mol: number | undefined
  if (x !== undefined && x >= 0 && mr) {
    mol = from === 'mass' ? x / mr : from === 'mol' ? x : from === 'particles' ? x / NA : x / molarVolume
  }

  const QS: { k: Q; en: string; bm: string; unit: string }[] = [
    { k: 'mass', en: 'Mass', bm: 'Jisim', unit: 'g' },
    { k: 'mol', en: 'Number of moles', bm: 'Bilangan mol', unit: 'mol' },
    { k: 'particles', en: 'Number of particles', bm: 'Bilangan zarah', unit: '' },
    { k: 'volume', en: 'Volume of gas', bm: 'Isi padu gas', unit: 'dm³' },
  ]
  const results: Record<Q, number | undefined> = mol === undefined ? { mass: undefined, mol: undefined, particles: undefined, volume: undefined }
    : { mass: mol * mr!, mol, particles: mol * NA, volume: mol * molarVolume }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-sm font-semibold">{t('Chemical formula', 'Formula kimia')}</span>
        <input className="input mt-1 font-mono text-lg" value={formula} onChange={(e) => setFormula(e.target.value)} autoCapitalize="off" spellCheck={false} />
      </label>
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((f) => <Chip key={f} active={formula === f} onClick={() => setFormula(f)}>{f}</Chip>)}
      </div>

      {'error' in parsed ? (
        <Note tone="warn">{t('Check the formula: capital letter first for each element (e.g. NaCl, not nacl), and close every bracket.', 'Semak formula: huruf besar dahulu bagi setiap unsur (cth. NaCl, bukan nacl), dan tutup setiap kurungan.')}</Note>
      ) : (
        <section className="card text-sm">
          <h3 className="mb-1 font-bold">{t('Relative formula mass', 'Jisim formula relatif')}</h3>
          <p className="font-mono leading-7">
            {Object.entries(parsed.counts).map(([el, n]) => `${n > 1 ? `${n}(${relativeAtomicMass(el)})` : relativeAtomicMass(el)}`).join(' + ')} = <strong>{fmt(parsed.mr)}</strong>
          </p>
          <p className="text-xs muted">{Object.entries(parsed.counts).map(([el, n]) => `${el} = ${relativeAtomicMass(el)} × ${n}`).join(' · ')}</p>
          <p className="mt-1">{t('Molar mass', 'Jisim molar')} = {fmt(parsed.mr)} g mol⁻¹</p>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        {QS.map((q) => <Chip key={q.k} active={from === q.k} onClick={() => setFrom(q.k)}>{t('I know the', 'Saya tahu')} {t(q.en, q.bm).toLowerCase()}</Chip>)}
      </div>
      <Field label={t(QS.find((q) => q.k === from)!.en, QS.find((q) => q.k === from)!.bm)} unit={QS.find((q) => q.k === from)!.unit} value={value} onChange={setValue} />
      {from === 'particles' && <p className="text-xs muted">{t('Type large numbers like 3.01e23.', 'Taip nombor besar seperti 3.01e23.')}</p>}

      <div className="flex items-center gap-2 text-xs">
        <span className="muted">{t('Molar volume of gas', 'Isi padu molar gas')}:</span>
        <Chip active={molarVolume === 24} onClick={() => setMolarVolume(24)}>24 dm³ ({t('room conditions', 'keadaan bilik')})</Chip>
        <Chip active={molarVolume === 22.4} onClick={() => setMolarVolume(22.4)}>22.4 dm³ (STP)</Chip>
      </div>

      {mol !== undefined && (
        <dl className="grid grid-cols-2 gap-2 text-sm">
          {QS.map((q) => <Stat key={q.k} label={t(q.en, q.bm)}>{fmt(results[q.k]!)} {q.unit}</Stat>)}
        </dl>
      )}
      <div className="rounded-xl bg-slate-50 p-3 text-center text-sm dark:bg-slate-800/60">
        <Katex tex={`\\text{mass} \\xrightleftharpoons[\\times\\,M]{\\div\\,M} n \\xrightleftharpoons[\\div\\,N_A]{\\times\\,N_A} \\text{particles}`} />
        <div className="mt-2"><Katex tex={`n \\xrightleftharpoons[\\div\\,${molarVolume}]{\\times\\,${molarVolume}} \\text{volume of gas (dm}^3)`} /></div>
        <p className="mt-2 text-xs muted">N<sub>A</sub> = 6.02 × 10²³ mol⁻¹ · {t('Gas volume only applies to gases.', 'Isi padu gas hanya untuk gas.')}</p>
      </div>
    </div>
  )
}
