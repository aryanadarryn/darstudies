// Heat calculator: Q = mcΔθ, Q = ml, an electric heater (Pt = mcΔθ) and mixing two substances.
import { useState } from 'react'
import Katex from '../formula/Katex'
import { Chip, FormulaSolver, Note, Tabs, fmt, num, ok, useTr, Field } from './toolUi'

type Mode = 'c' | 'l' | 'heater' | 'mix'

const SHC = [
  { en: 'Water', bm: 'Air', c: 4200 }, { en: 'Ice', bm: 'Ais', c: 2100 }, { en: 'Aluminium', bm: 'Aluminium', c: 900 },
  { en: 'Iron', bm: 'Besi', c: 450 }, { en: 'Copper', bm: 'Kuprum', c: 390 }, { en: 'Lead', bm: 'Plumbum', c: 130 },
]
const SLH = [
  { en: 'Ice → water (fusion)', bm: 'Ais → air (pelakuran)', l: 3.34e5 },
  { en: 'Water → steam (vaporisation)', bm: 'Air → stim (pengewapan)', l: 2.26e6 },
]

export default function HeatCalc() {
  const { t } = useTr()
  const [mode, setMode] = useState<Mode>('c')
  const [c, setC] = useState<Record<string, string>>({ m: '0.5', c: '4200', d: '20' })
  const [l, setL] = useState<Record<string, string>>({ m: '0.2', l: '334000' })
  const [h, setH] = useState<Record<string, string>>({ P: '1000', m: '1', c: '4200', d: '50' })
  const [mix, setMix] = useState<Record<string, string>>({ m1: '0.2', c1: '4200', t1: '80', m2: '0.3', c2: '4200', t2: '20' })

  const m1 = num(mix.m1), c1 = num(mix.c1), t1 = num(mix.t1), m2 = num(mix.m2), c2 = num(mix.c2), t2 = num(mix.t2)
  const mixReady = [m1, c1, t1, m2, c2, t2].every((x) => x !== undefined) && m1! * c1! + m2! * c2! > 0
  const final = mixReady ? (m1! * c1! * t1! + m2! * c2! * t2!) / (m1! * c1! + m2! * c2!) : undefined

  return (
    <div className="space-y-3">
      <Tabs value={mode} onChange={setMode} items={[
        { k: 'c', label: t('Specific heat', 'Haba tentu') }, { k: 'l', label: t('Latent heat', 'Haba pendam') },
        { k: 'heater', label: t('Heater', 'Pemanas') }, { k: 'mix', label: t('Mixing', 'Campuran') },
      ]} />

      {mode === 'c' && (
        <>
          <div className="flex flex-wrap gap-2">
            {SHC.map((s) => <Chip key={s.en} active={c.c === String(s.c)} onClick={() => setC({ ...c, c: String(s.c) })}>{t(s.en, s.bm)} {s.c}</Chip>)}
          </div>
          <FormulaSolver formula={<Katex tex="Q = mc\Delta\theta" />} values={c} setValues={setC}
            vars={[
              { k: 'Q', sym: 'Q', en: 'Heat', bm: 'Haba', unit: 'J' },
              { k: 'm', sym: 'm', en: 'Mass', bm: 'Jisim', unit: 'kg' },
              { k: 'c', sym: 'c', en: 'Specific heat capacity', bm: 'Muatan haba tentu', unit: 'J kg⁻¹ °C⁻¹' },
              { k: 'd', sym: 'Δθ', en: 'Temperature change', bm: 'Perubahan suhu', unit: '°C' },
            ]}
            solve={{
              Q: (v) => ok(v.m * v.c * v.d),
              m: (v) => (v.c && v.d ? ok(v.Q / (v.c * v.d)) : undefined),
              c: (v) => (v.m && v.d ? ok(v.Q / (v.m * v.d)) : undefined),
              d: (v) => (v.m && v.c ? ok(v.Q / (v.m * v.c)) : undefined),
            }} />
          <p className="text-xs muted">{t('Δθ is a change, so 20 °C → 70 °C gives Δθ = 50 °C (same as 50 K).', 'Δθ ialah perubahan, jadi 20 °C → 70 °C memberi Δθ = 50 °C (sama dengan 50 K).')}</p>
        </>
      )}

      {mode === 'l' && (
        <>
          <div className="flex flex-wrap gap-2">
            {SLH.map((s) => <Chip key={s.en} active={l.l === String(s.l)} onClick={() => setL({ ...l, l: String(s.l) })}>{t(s.en, s.bm)}</Chip>)}
          </div>
          <FormulaSolver formula={<Katex tex="Q = ml" />} values={l} setValues={setL}
            vars={[
              { k: 'Q', sym: 'Q', en: 'Heat', bm: 'Haba', unit: 'J' },
              { k: 'm', sym: 'm', en: 'Mass', bm: 'Jisim', unit: 'kg' },
              { k: 'l', sym: 'l', en: 'Specific latent heat', bm: 'Haba pendam tentu', unit: 'J kg⁻¹' },
            ]}
            solve={{
              Q: (v) => ok(v.m * v.l),
              m: (v) => (v.l ? ok(v.Q / v.l) : undefined),
              l: (v) => (v.m ? ok(v.Q / v.m) : undefined),
            }} />
          <Note>{t('During melting or boiling the temperature stays constant: the heat breaks the forces between particles.', 'Semasa melebur atau mendidih suhu tetap: haba digunakan untuk memutuskan daya antara zarah.')}</Note>
        </>
      )}

      {mode === 'heater' && (
        <>
          <FormulaSolver formula={<Katex tex="Pt = mc\Delta\theta" />} values={h} setValues={setH}
            vars={[
              { k: 'P', sym: 'P', en: 'Power', bm: 'Kuasa', unit: 'W' },
              { k: 't', sym: 't', en: 'Time', bm: 'Masa', unit: 's' },
              { k: 'm', sym: 'm', en: 'Mass', bm: 'Jisim', unit: 'kg' },
              { k: 'c', sym: 'c', en: 'Specific heat capacity', bm: 'Muatan haba tentu', unit: 'J kg⁻¹ °C⁻¹' },
              { k: 'd', sym: 'Δθ', en: 'Temperature change', bm: 'Perubahan suhu', unit: '°C' },
            ]}
            solve={{
              P: (v) => (v.t ? ok((v.m * v.c * v.d) / v.t) : undefined),
              t: (v) => (v.P ? ok((v.m * v.c * v.d) / v.P) : undefined),
              m: (v) => (v.c && v.d ? ok((v.P * v.t) / (v.c * v.d)) : undefined),
              c: (v) => (v.m && v.d ? ok((v.P * v.t) / (v.m * v.d)) : undefined),
              d: (v) => (v.m && v.c ? ok((v.P * v.t) / (v.m * v.c)) : undefined),
            }} />
          <p className="text-xs muted">{t('Assumes no heat is lost to the surroundings. Real answers need a little more time.', 'Anggap tiada haba hilang ke persekitaran. Dalam keadaan sebenar, masa yang diperlukan lebih panjang sedikit.')}</p>
        </>
      )}

      {mode === 'mix' && (
        <>
          <div className="grid gap-3 desk:grid-cols-2">
            {([['1', t('Hot object', 'Objek panas')], ['2', t('Cold object', 'Objek sejuk')]] as const).map(([i, title]) => (
              <section key={i} className="card space-y-2">
                <h3 className="font-bold">{title}</h3>
                <Field sym="m" label={t('Mass', 'Jisim')} unit="kg" value={mix[`m${i}`]} onChange={(s) => setMix({ ...mix, [`m${i}`]: s })} />
                <Field sym="c" label={t('Specific heat capacity', 'Muatan haba tentu')} unit="J kg⁻¹ °C⁻¹" value={mix[`c${i}`]} onChange={(s) => setMix({ ...mix, [`c${i}`]: s })} />
                <Field sym="θ" label={t('Temperature', 'Suhu')} unit="°C" value={mix[`t${i}`]} onChange={(s) => setMix({ ...mix, [`t${i}`]: s })} />
              </section>
            ))}
          </div>
          <div className="rounded-xl bg-slate-50 py-2 text-center dark:bg-slate-800/60">
            <Katex tex="m_1c_1(\theta_1-\theta) = m_2c_2(\theta-\theta_2)" />
          </div>
          {final === undefined ? <Note>{t('Fill in all six values.', 'Isi kesemua enam nilai.')}</Note> : (
            <Note tone="ok">
              {t('Final temperature at thermal equilibrium', 'Suhu akhir pada keseimbangan terma')}: <strong>θ = {fmt(final)} °C</strong>
              <br />{t('Heat given out', 'Haba dibebaskan')} = {fmt(m1! * c1! * Math.abs(t1! - final))} J = {t('heat taken in', 'haba diserap')}
            </Note>
          )}
        </>
      )}
    </div>
  )
}
