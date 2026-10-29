// Half-life (Form 3 Science): how much of a radioactive sample is left after a given time.
import { useState } from 'react'
import Katex from '../formula/Katex'
import { Chip, Field, Note, fmt, num, useTr } from './toolUi'

const W = 320, H = 170, PAD = 30

const ISOTOPES = [
  { n: 'Iodine-131', bm: 'Iodin-131', T: 8, unit: 'days', ubm: 'hari' },
  { n: 'Cobalt-60', bm: 'Kobalt-60', T: 5.3, unit: 'years', ubm: 'tahun' },
  { n: 'Carbon-14', bm: 'Karbon-14', T: 5730, unit: 'years', ubm: 'tahun' },
  { n: 'Radon-222', bm: 'Radon-222', T: 3.8, unit: 'days', ubm: 'hari' },
]

export default function HalfLife() {
  const { t } = useTr()
  const [N0, setN0] = useState('80')
  const [T, setT] = useState('8')
  const [time, setTime] = useState('24')
  const [unit, setUnit] = useState({ en: 'days', bm: 'hari' })

  const n0 = num(N0), th = num(T), tt = num(time)
  const ready = n0 !== undefined && n0 > 0 && th !== undefined && th > 0 && tt !== undefined && tt >= 0
  const halves = ready ? tt! / th! : 0
  const left = ready ? n0! * 0.5 ** halves : 0
  const span = ready ? Math.max(th! * 5, tt! * 1.1) : 1
  const sx = (x: number) => PAD + (x / span) * (W - PAD - 10)
  const sy = (y: number) => H - 20 - (y / (n0 || 1)) * (H - 35)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {ISOTOPES.map((i) => (
          <Chip key={i.n} active={T === String(i.T)} onClick={() => { setT(String(i.T)); setUnit({ en: i.unit, bm: i.ubm }); setTime(String(i.T * 3)) }}>
            {t(i.n, i.bm)} · {i.T} {t(i.unit, i.ubm)}
          </Chip>
        ))}
      </div>
      <Field label={t('Starting amount', 'Kuantiti awal')} unit="g" value={N0} onChange={setN0} />
      <Field label={t('Half-life', 'Separuh hayat')} unit={t(unit.en, unit.bm)} value={T} onChange={setT} />
      <Field label={t('Time passed', 'Masa berlalu')} unit={t(unit.en, unit.bm)} value={time} onChange={setTime} />
      {!ready ? <Note tone="warn">{t('Enter positive numbers.', 'Masukkan nombor positif.')}</Note> : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" role="img" aria-label={t('Decay curve', 'Lengkung reputan')}>
            <line x1={PAD} y1={sy(0)} x2={W - 8} y2={sy(0)} className="stroke-slate-400" />
            <line x1={PAD} y1={10} x2={PAD} y2={sy(0)} className="stroke-slate-400" />
            <path d={Array.from({ length: 101 }, (_, i) => { const x = (i / 100) * span; return `${i ? 'L' : 'M'}${sx(x).toFixed(1)} ${sy(n0! * 0.5 ** (x / th!)).toFixed(1)}` }).join(' ')} fill="none" stroke="#7c3aed" strokeWidth={2.5} />
            {Array.from({ length: Math.floor(span / th!) + 1 }, (_, k) => k).filter((k) => k <= 6).map((k) => (
              <g key={k}>
                <circle cx={sx(k * th!)} cy={sy(n0! / 2 ** k)} r={3} fill="#6d28d9" />
                <text x={sx(k * th!)} y={H - 6} textAnchor="middle" className="fill-slate-400 text-[8px]">{fmt(k * th!, 3)}</text>
                <text x={sx(k * th!) + 4} y={sy(n0! / 2 ** k) - 4} className="fill-slate-500 text-[8px]">{fmt(n0! / 2 ** k, 3)}</text>
              </g>
            ))}
            <line x1={sx(tt!)} y1={sy(0)} x2={sx(tt!)} y2={sy(left)} stroke="#ef4444" strokeDasharray="3 3" />
            <circle cx={sx(tt!)} cy={sy(left)} r={5} fill="#ef4444" />
          </svg>
          <div className="rounded-xl bg-slate-50 py-2 text-center dark:bg-slate-800/60">
            <Katex tex={`N = N_0\\left(\\tfrac12\\right)^{t/T} = ${fmt(n0!)}\\left(\\tfrac12\\right)^{${fmt(halves, 3)}}`} />
          </div>
          <Note tone="ok">
            {t(`${fmt(halves, 3)} half-lives have passed.`, `${fmt(halves, 3)} separuh hayat telah berlalu.`)}{' '}
            {t('Left', 'Baki')}: <strong>{fmt(left)} g</strong> ({fmt((left / n0!) * 100, 3)}%) · {t('decayed', 'telah mereput')}: {fmt(n0! - left)} g
          </Note>
          {Number.isInteger(halves) && halves > 0 && halves <= 6 && (
            <p className="text-sm">{Array.from({ length: halves + 1 }, (_, k) => `${fmt(n0! / 2 ** k)} g`).join(' → ')}</p>
          )}
          <p className="text-xs muted">{t('Half-life: the time for half of the radioactive nuclei in a sample to decay. It does not change with temperature or amount.', 'Separuh hayat: masa bagi separuh daripada nukleus radioaktif dalam sampel mereput. Ia tidak berubah dengan suhu atau kuantiti.')}</p>
        </>
      )}
    </div>
  )
}
