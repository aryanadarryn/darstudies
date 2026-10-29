// Wave visualiser: change amplitude, wavelength and frequency; see v = fλ and T = 1/f on a moving wave.
import { useEffect, useRef, useState } from 'react'
import Katex from '../formula/Katex'
import { Stat, Tabs, fmt, useTr } from './toolUi'

const W = 340, H = 180, MID = H / 2
const PX_PER_CM = 4 // the strip shows 85 cm of the medium

export default function WaveViz() {
  const { t } = useTr()
  const [kind, setKind] = useState<'transverse' | 'longitudinal'>('transverse')
  const [A, setA] = useState(3) // cm
  const [lambda, setLambda] = useState(20) // cm
  const [f, setF] = useState(0.5) // Hz
  const [playing, setPlaying] = useState(true)
  const [time, setTime] = useState(0)
  const last = useRef<number | null>(null)

  useEffect(() => {
    if (!playing) { last.current = null; return }
    let id = 0
    const tick = (now: number) => {
      if (last.current !== null) setTime((x) => x + (now - last.current!) / 1000)
      last.current = now
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [playing])

  const k = (2 * Math.PI) / lambda, w = 2 * Math.PI * f
  const disp = (xcm: number) => A * Math.sin(k * xcm - w * time)
  const lenCm = W / PX_PER_CM
  const v = f * lambda // cm s⁻¹
  const tracked = 20 // cm — the particle we follow

  const path = Array.from({ length: 171 }, (_, i) => {
    const x = (i / 170) * lenCm
    return `${i ? 'L' : 'M'}${(x * PX_PER_CM).toFixed(1)} ${(MID - disp(x) * PX_PER_CM).toFixed(1)}`
  }).join(' ')

  // First crest to the right of x = 0, for the λ marker.
  const phase = (w * time) % (2 * Math.PI)
  const crest0 = ((Math.PI / 2 + phase) / k) % lambda

  const slider = (label: string, value: number, set: (n: number) => void, min: number, max: number, step: number, unit: string) => (
    <label className="flex items-center gap-3">
      <span className="w-32 shrink-0 text-sm">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(Number(e.target.value))} className="flex-1" aria-label={label} />
      <span className="w-20 text-right font-mono text-sm tabular-nums">{value} {unit}</span>
    </label>
  )

  return (
    <div className="space-y-3">
      <Tabs value={kind} onChange={setKind} items={[{ k: 'transverse', label: t('Transverse', 'Melintang') }, { k: 'longitudinal', label: t('Longitudinal', 'Membujur') }]} />
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" role="img" aria-label={t('Wave', 'Gelombang')}>
        <line x1={0} y1={MID} x2={W} y2={MID} className="stroke-slate-300 dark:stroke-slate-700" strokeDasharray="3 3" />
        {kind === 'transverse' ? (
          <>
            <path d={path} fill="none" stroke="#7c3aed" strokeWidth={2.5} />
            {Array.from({ length: 18 }, (_, i) => i * 5).map((x) => (
              <circle key={x} cx={x * PX_PER_CM} cy={MID - disp(x) * PX_PER_CM} r={2.5} className="fill-slate-400" />
            ))}
            <circle cx={tracked * PX_PER_CM} cy={MID - disp(tracked) * PX_PER_CM} r={6} fill="#ef4444" />
            {/* amplitude marker */}
            <line x1={W - 12} y1={MID} x2={W - 12} y2={MID - A * PX_PER_CM} stroke="#f59e0b" strokeWidth={2} />
            <text x={W - 16} y={MID - (A * PX_PER_CM) / 2} textAnchor="end" className="fill-amber-600 text-[10px] font-bold">A</text>
            {/* wavelength marker crest to crest */}
            {crest0 + lambda <= lenCm - 4 && (
              <g>
                <line x1={crest0 * PX_PER_CM} y1={MID - A * PX_PER_CM - 10} x2={(crest0 + lambda) * PX_PER_CM} y2={MID - A * PX_PER_CM - 10} stroke="#0ea5e9" strokeWidth={2} />
                <text x={(crest0 + lambda / 2) * PX_PER_CM} y={MID - A * PX_PER_CM - 14} textAnchor="middle" className="fill-sky-600 text-[11px] font-bold">λ</text>
              </g>
            )}
          </>
        ) : (
          Array.from({ length: 68 }, (_, i) => i * 1.25).map((x) => (
            <line key={x} x1={(x + disp(x)) * PX_PER_CM} y1={MID - 50} x2={(x + disp(x)) * PX_PER_CM} y2={MID + 50}
              stroke={Math.abs(x - tracked) < 0.1 ? '#ef4444' : '#7c3aed'} strokeWidth={Math.abs(x - tracked) < 0.1 ? 3 : 1.5} />
          ))
        )}
        <text x={6} y={H - 6} className="fill-slate-400 text-[9px]">{t('wave travels →', 'gelombang bergerak →')}</text>
      </svg>
      <p className="text-xs muted">
        {kind === 'transverse'
          ? t('The red particle only moves up and down — the energy moves along. Particles vibrate at 90° to the direction the wave travels.', 'Zarah merah hanya bergerak ke atas dan ke bawah — tenaga yang bergerak. Zarah bergetar 90° kepada arah perambatan gelombang.')
          : t('Lines bunch up (compressions) and spread out (rarefactions). The red layer vibrates back and forth along the direction the wave travels.', 'Garisan rapat (mampatan) dan renggang (regangan). Lapisan merah bergetar ke depan dan ke belakang selari dengan arah perambatan.')}
      </p>
      <div className="space-y-2">
        {slider(t('Amplitude A', 'Amplitud A'), A, setA, 1, 8, 0.5, 'cm')}
        {slider(t('Wavelength λ', 'Panjang gelombang λ'), lambda, setLambda, 8, 40, 1, 'cm')}
        {slider(t('Frequency f', 'Frekuensi f'), f, setF, 0.1, 2, 0.1, 'Hz')}
      </div>
      <button className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold dark:bg-slate-800" onClick={() => setPlaying(!playing)}>
        {playing ? '⏸ ' + t('Pause', 'Jeda') : '▶ ' + t('Play', 'Main')}
      </button>
      <dl className="grid grid-cols-2 gap-2 text-sm desk:grid-cols-3">
        <Stat label={<>{t('Wave speed', 'Laju gelombang')} <Katex tex="v = f\lambda" /></>}>{fmt(f)} × {fmt(lambda / 100)} = {fmt(v / 100)} m s⁻¹</Stat>
        <Stat label={<>{t('Period', 'Tempoh')} <Katex tex="T = \tfrac{1}{f}" /></>}>{fmt(1 / f)} s</Stat>
        <Stat label={t('Oscillations in 10 s', 'Ayunan dalam 10 s')}>{fmt(10 * f)}</Stat>
      </dl>
      <p className="text-xs muted">{t('Here you can set f and λ freely. In a real medium the speed is fixed, so a higher f gives a shorter λ (λ = v ÷ f).', 'Di sini f dan λ boleh diubah secara bebas. Dalam medium sebenar laju adalah tetap, jadi f yang lebih tinggi memberi λ yang lebih pendek (λ = v ÷ f).')}</p>
    </div>
  )
}
