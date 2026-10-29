// Energy and power (Form 3 Science): work, power, gravitational potential energy and kinetic energy.
import { useState } from 'react'
import Katex from '../formula/Katex'
import { FormulaSolver, Tabs, useTr, ok } from './toolUi'

type Mode = 'work' | 'power' | 'ep' | 'ek'

export default function EnergyPower() {
  const { t } = useTr()
  const [mode, setMode] = useState<Mode>('work')
  const [w, setW] = useState<Record<string, string>>({ F: '50', s: '4' })
  const [p, setP] = useState<Record<string, string>>({ W: '1200', t: '60' })
  const [ep, setEp] = useState<Record<string, string>>({ m: '2', g: '10', h: '5' })
  const [ek, setEk] = useState<Record<string, string>>({ m: '0.5', v: '4' })

  return (
    <div className="space-y-3">
      <Tabs value={mode} onChange={setMode} items={[
        { k: 'work', label: t('Work', 'Kerja') }, { k: 'power', label: t('Power', 'Kuasa') },
        { k: 'ep', label: t('Potential E', 'Tenaga keupayaan') }, { k: 'ek', label: t('Kinetic E', 'Tenaga kinetik') },
      ]} />
      {mode === 'work' && (
        <FormulaSolver formula={<Katex tex="W = Fs" />} values={w} setValues={setW}
          vars={[
            { k: 'W', sym: 'W', en: 'Work done', bm: 'Kerja', unit: 'J' },
            { k: 'F', sym: 'F', en: 'Force', bm: 'Daya', unit: 'N' },
            { k: 's', sym: 's', en: 'Distance moved (in the direction of F)', bm: 'Jarak (pada arah F)', unit: 'm' },
          ]}
          solve={{ W: (v) => ok(v.F * v.s), F: (v) => (v.s ? ok(v.W / v.s) : undefined), s: (v) => (v.F ? ok(v.W / v.F) : undefined) }} />
      )}
      {mode === 'power' && (
        <FormulaSolver formula={<Katex tex="P = \frac{W}{t}" />} values={p} setValues={setP}
          vars={[
            { k: 'P', sym: 'P', en: 'Power', bm: 'Kuasa', unit: 'W' },
            { k: 'W', sym: 'W', en: 'Work done / energy', bm: 'Kerja / tenaga', unit: 'J' },
            { k: 't', sym: 't', en: 'Time', bm: 'Masa', unit: 's' },
          ]}
          solve={{ P: (v) => (v.t ? ok(v.W / v.t) : undefined), W: (v) => ok(v.P * v.t), t: (v) => (v.P ? ok(v.W / v.P) : undefined) }} />
      )}
      {mode === 'ep' && (
        <FormulaSolver formula={<Katex tex="E_p = mgh" />} values={ep} setValues={setEp}
          vars={[
            { k: 'E', sym: 'Ep', en: 'Potential energy', bm: 'Tenaga keupayaan graviti', unit: 'J' },
            { k: 'm', sym: 'm', en: 'Mass', bm: 'Jisim', unit: 'kg' },
            { k: 'g', sym: 'g', en: 'Gravitational field strength', bm: 'Kekuatan medan graviti', unit: 'N kg⁻¹' },
            { k: 'h', sym: 'h', en: 'Height', bm: 'Tinggi', unit: 'm' },
          ]}
          solve={{
            E: (v) => ok(v.m * v.g * v.h),
            m: (v) => (v.g && v.h ? ok(v.E / (v.g * v.h)) : undefined),
            g: (v) => (v.m && v.h ? ok(v.E / (v.m * v.h)) : undefined),
            h: (v) => (v.m && v.g ? ok(v.E / (v.m * v.g)) : undefined),
          }} />
      )}
      {mode === 'ek' && (
        <FormulaSolver formula={<Katex tex="E_k = \tfrac{1}{2}mv^2" />} values={ek} setValues={setEk}
          vars={[
            { k: 'E', sym: 'Ek', en: 'Kinetic energy', bm: 'Tenaga kinetik', unit: 'J' },
            { k: 'm', sym: 'm', en: 'Mass', bm: 'Jisim', unit: 'kg' },
            { k: 'v', sym: 'v', en: 'Speed', bm: 'Laju', unit: 'm s⁻¹' },
          ]}
          solve={{
            E: (v) => ok(0.5 * v.m * v.v * v.v),
            m: (v) => (v.v ? ok((2 * v.E) / (v.v * v.v)) : undefined),
            v: (v) => (v.m > 0 && v.E >= 0 ? ok(Math.sqrt((2 * v.E) / v.m)) : undefined),
          }} />
      )}
      <p className="text-xs muted">
        {mode === 'ep' ? t('The textbook uses g = 10 N kg⁻¹. A ball dropped from h turns its Ep into Ek: mgh = ½mv² (ignoring air resistance).', 'Buku teks menggunakan g = 10 N kg⁻¹. Bola yang dijatuhkan dari h menukar Ep kepada Ek: mgh = ½mv² (abaikan rintangan udara).')
          : mode === 'ek' ? t('Doubling the speed makes the kinetic energy four times bigger.', 'Menggandakan laju menjadikan tenaga kinetik empat kali ganda.')
          : mode === 'power' ? t('1 W = 1 J of work done every second.', '1 W = 1 J kerja dilakukan setiap saat.')
          : t('No work is done if the object does not move, or moves at 90° to the force.', 'Tiada kerja dilakukan jika objek tidak bergerak, atau bergerak 90° kepada arah daya.')}
      </p>
    </div>
  )
}
