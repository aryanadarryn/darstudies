// Electricity (Form 3 Science): cost of electrical energy at home, and the transformer equation.
import { useState } from 'react'
import Katex from '../formula/Katex'
import { Field, FormulaSolver, Note, Tabs, fmt, num, ok, useTr } from './toolUi'

interface Appliance { name: string; w: string; h: string }

const START: Appliance[] = [
  { name: 'Air conditioner / Penghawa dingin', w: '1500', h: '6' },
  { name: 'Refrigerator / Peti sejuk', w: '150', h: '24' },
  { name: 'LED lamps ×5 / Lampu LED ×5', w: '50', h: '6' },
  { name: 'Television / Televisyen', w: '100', h: '4' },
]

export default function ElectricityCalc() {
  const { t } = useTr()
  const [mode, setMode] = useState<'cost' | 'transformer'>('cost')
  const [items, setItems] = useState<Appliance[]>(START)
  const [days, setDays] = useState('30')
  const [rate, setRate] = useState('0.218')
  const [tr, setTr] = useState<Record<string, string>>({ Vp: '240', Np: '1200', Ns: '60' })

  const d = num(days) ?? 0, r = num(rate) ?? 0
  const rows = items.map((a) => {
    const w = num(a.w) ?? 0, h = num(a.h) ?? 0
    return { ...a, kwh: (w / 1000) * h * d }
  })
  const total = rows.reduce((s, x) => s + x.kwh, 0)
  const Vp = num(tr.Vp), Vs = num(tr.Vs), Np = num(tr.Np), Ns = num(tr.Ns)
  const ratioKnown = [Vp, Vs, Np, Ns].filter((x) => x !== undefined).length === 4

  return (
    <div className="space-y-3">
      <Tabs value={mode} onChange={setMode} items={[{ k: 'cost', label: t('Electricity cost', 'Kos elektrik') }, { k: 'transformer', label: t('Transformer', 'Transformer') }]} />
      {mode === 'cost' ? (
        <>
          <div className="rounded-xl bg-slate-50 py-2 text-center dark:bg-slate-800/60"><Katex tex="E\,(\text{kWh}) = P\,(\text{kW}) \times t\,(\text{h})" /></div>
          <div className="space-y-2">
            {rows.map((a, i) => (
              <div key={i} className="card !p-3">
                <div className="flex items-center gap-2">
                  <input className="input flex-1 text-sm" value={a.name} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} aria-label={t('Appliance', 'Perkakas')} />
                  <button className="text-red-600" onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label={t('Remove', 'Buang')}>✕</button>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <label>{t('Power (W)', 'Kuasa (W)')}<input className="input mt-1" inputMode="decimal" value={a.w} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, w: e.target.value } : x)))} /></label>
                  <label>{t('Hours a day', 'Jam sehari')}<input className="input mt-1" inputMode="decimal" value={a.h} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, h: e.target.value } : x)))} /></label>
                  <div><div>{t('Energy', 'Tenaga')}</div><div className="mt-2 font-semibold">{fmt(a.kwh)} kWh</div></div>
                </div>
              </div>
            ))}
            <button className="btn-secondary w-full" onClick={() => setItems([...items, { name: t('New appliance', 'Perkakas baharu'), w: '1000', h: '1' }])}>+ {t('Add appliance', 'Tambah perkakas')}</button>
          </div>
          <Field label={t('Number of days', 'Bilangan hari')} value={days} onChange={setDays} unit={t('days', 'hari')} />
          <Field label={t('Rate', 'Kadar')} value={rate} onChange={setRate} unit="RM / kWh" />
          <Note tone="ok">
            {t('Total energy', 'Jumlah tenaga')} = <strong>{fmt(total)} kWh</strong><br />
            {t('Cost', 'Kos')} = {fmt(total)} × RM{fmt(r)} = <strong>RM{(total * r).toFixed(2)}</strong>
          </Note>
          <p className="text-xs muted">{t('1 kWh (one "unit") is 1000 W used for 1 hour. The rate is an example — real bills use tiered rates, so change it to match yours.', '1 kWh (satu "unit") ialah 1000 W digunakan selama 1 jam. Kadar ini contoh sahaja — bil sebenar menggunakan kadar berperingkat, jadi ubah mengikut bil anda.')}</p>
        </>
      ) : (
        <>
          <FormulaSolver formula={<Katex tex="\frac{V_s}{V_p} = \frac{N_s}{N_p}" />} values={tr} setValues={setTr}
            vars={[
              { k: 'Vp', sym: 'Vp', en: 'Primary voltage', bm: 'Voltan primer', unit: 'V' },
              { k: 'Vs', sym: 'Vs', en: 'Secondary voltage', bm: 'Voltan sekunder', unit: 'V' },
              { k: 'Np', sym: 'Np', en: 'Primary turns', bm: 'Lilitan primer', unit: '' },
              { k: 'Ns', sym: 'Ns', en: 'Secondary turns', bm: 'Lilitan sekunder', unit: '' },
            ]}
            solve={{
              Vp: (v) => (v.Ns ? ok((v.Vs * v.Np) / v.Ns) : undefined),
              Vs: (v) => (v.Np ? ok((v.Vp * v.Ns) / v.Np) : undefined),
              Np: (v) => (v.Vs ? ok((v.Ns * v.Vp) / v.Vs) : undefined),
              Ns: (v) => (v.Vp ? ok((v.Np * v.Vs) / v.Vp) : undefined),
            }} />
          {(() => {
            const vp = Vp ?? (Vs !== undefined && Np !== undefined && Ns ? (Vs * Np) / Ns : undefined)
            const vs = Vs ?? (Vp !== undefined && Ns !== undefined && Np ? (Vp * Ns) / Np : undefined)
            if (ratioKnown || vp === undefined || vs === undefined) return null
            return <Note>{vs > vp ? t('Step-up transformer: Ns > Np, so the output voltage is higher (used at power stations before transmission).', 'Transformer injak naik: Ns > Np, maka voltan output lebih tinggi (digunakan di stesen jana kuasa sebelum penghantaran).')
              : vs < vp ? t('Step-down transformer: Ns < Np, so the output voltage is lower (used near homes and in phone chargers).', 'Transformer injak turun: Ns < Np, maka voltan output lebih rendah (digunakan berhampiran rumah dan dalam pengecas telefon).')
              : t('Same voltage in and out.', 'Voltan masuk dan keluar sama.')}</Note>
          })()}
          <p className="text-xs muted">{t('Transformers only work with alternating current (a.c.).', 'Transformer hanya berfungsi dengan arus ulang-alik (a.u.).')}</p>
        </>
      )}
    </div>
  )
}
