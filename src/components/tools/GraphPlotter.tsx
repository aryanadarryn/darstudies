// Tool #11 — quadratic graph plotter: drag a, b, c and watch the parabola, roots and turning point.
import { useState } from 'react'
import { useT } from '../../i18n/useT'
import Katex from '../formula/Katex'

const R = 10 // axes from −R to R
const W = 320

const num = (x: number) => String(Math.round(x * 100) / 100)
const signed = (x: number) => (x < 0 ? `- ${num(-x)}` : `+ ${num(x)}`)

export default function GraphPlotter() {
  const { lang } = useT()
  const [a, setA] = useState(1)
  const [b, setB] = useState(-2)
  const [c, setC] = useState(-3)

  const f = (x: number) => a * x * x + b * x + c
  const D = b * b - 4 * a * c
  const h = -b / (2 * a), k = f(h)
  const roots = D > 0 ? [(-b - Math.sqrt(D)) / (2 * a), (-b + Math.sqrt(D)) / (2 * a)].sort((p, q) => p - q) : D === 0 ? [h] : []

  const sx = (x: number) => ((x + R) / (2 * R)) * W
  const sy = (y: number) => W - ((y + R) / (2 * R)) * W
  const path = Array.from({ length: 161 }, (_, i) => {
    const x = -R + (i / 160) * 2 * R
    const y = Math.max(-3 * R, Math.min(3 * R, f(x)))
    return `${i ? 'L' : 'M'}${sx(x).toFixed(1)} ${sy(y).toFixed(1)}`
  }).join(' ')

  const t = (en: string, bm: string) => (lang === 'en' ? en : bm)
  const rootsText = D > 0 ? t('two distinct real roots', 'dua punca nyata berbeza') : D === 0 ? t('two equal real roots', 'dua punca nyata sama') : t('no real roots', 'tiada punca nyata')
  const slider = (label: string, v: number, set: (n: number) => void, min: number, max: number, step: number) => (
    <label className="flex items-center gap-3">
      <span className="w-6 font-mono text-lg font-bold italic">{label}</span>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => set(Number(e.target.value) || (label === 'a' ? step : 0))} className="flex-1" aria-label={label} />
      <span className="w-12 text-right font-mono tabular-nums">{num(v)}</span>
    </label>
  )

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-slate-50 py-2 text-center text-lg dark:bg-slate-800/60">
        <Katex tex={`f(x) = ${num(a)}x^2 ${signed(b)}x ${signed(c)}`} />
      </div>
      <svg viewBox={`0 0 ${W} ${W}`} className="w-full rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" role="img" aria-label="Graph">
        {Array.from({ length: 2 * R + 1 }, (_, i) => i - R).map((g) => (
          <g key={g} className="stroke-slate-100 dark:stroke-slate-800">
            <line x1={sx(g)} y1={0} x2={sx(g)} y2={W} />
            <line x1={0} y1={sy(g)} x2={W} y2={sy(g)} />
          </g>
        ))}
        <line x1={0} y1={sy(0)} x2={W} y2={sy(0)} className="stroke-slate-400" />
        <line x1={sx(0)} y1={0} x2={sx(0)} y2={W} className="stroke-slate-400" />
        {[-10, -5, 5, 10].map((n) => (
          <g key={n} className="fill-slate-400 text-[9px]">
            <text x={sx(n)} y={sy(0) + 11} textAnchor="middle">{n}</text>
            <text x={sx(0) + 4} y={sy(n) + 3}>{n}</text>
          </g>
        ))}
        {Math.abs(h) <= R && <line x1={sx(h)} y1={0} x2={sx(h)} y2={W} stroke="#7c3aed" strokeDasharray="4 4" strokeOpacity={0.6} />}
        <path d={path} fill="none" stroke="#7c3aed" strokeWidth={2.5} />
        {roots.filter((r) => Math.abs(r) <= R).map((r) => <circle key={r} cx={sx(r)} cy={sy(0)} r={5} fill="#ef4444" />)}
        {Math.abs(h) <= R && Math.abs(k) <= R && <circle cx={sx(h)} cy={sy(k)} r={5} fill="#0f766e" />}
        {Math.abs(c) <= R && <circle cx={sx(0)} cy={sy(c)} r={4} fill="#f59e0b" />}
      </svg>
      <div className="space-y-2">
        {slider('a', a, setA, -5, 5, 0.5)}
        {slider('b', b, setB, -10, 10, 1)}
        {slider('c', c, setC, -10, 10, 1)}
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div className="card !p-3"><dt className="text-xs muted">{t('Shape', 'Bentuk')}</dt><dd className="font-semibold">{a > 0 ? t('∪ minimum point', '∪ titik minimum') : t('∩ maximum point', '∩ titik maksimum')}</dd></div>
        <div className="card !p-3"><dt className="text-xs muted">{t('Turning point', 'Titik pusingan')} <span className="text-teal-700">●</span></dt><dd className="font-semibold">({num(h)}, {num(k)})</dd></div>
        <div className="card !p-3"><dt className="text-xs muted">b² − 4ac</dt><dd className="font-semibold">{num(D)} → {rootsText}</dd></div>
        <div className="card !p-3"><dt className="text-xs muted">{t('Roots', 'Punca')} <span className="text-red-500">●</span></dt><dd className="font-semibold">{roots.length ? roots.map(num).join(', ') : '—'}</dd></div>
        <div className="card !p-3"><dt className="text-xs muted">{t('Axis of symmetry', 'Paksi simetri')}</dt><dd className="font-semibold">x = {num(h)}</dd></div>
        <div className="card !p-3"><dt className="text-xs muted">{t('y-intercept', 'Pintasan-y')} <span className="text-amber-500">●</span></dt><dd className="font-semibold">{num(c)}</dd></div>
      </dl>
      <div className="rounded-xl bg-slate-50 p-2 text-center dark:bg-slate-800/60">
        <span className="text-xs muted">{t('Vertex form', 'Bentuk verteks')}: </span>
        <Katex tex={`${num(a)}(x ${signed(-h)})^2 ${signed(k)}`} />
      </div>
    </div>
  )
}
