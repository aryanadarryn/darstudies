// Straight lines (Form 3 Mathematics): two points → gradient, intercepts and y = mx + c, drawn on a grid.
import { useState } from 'react'
import Katex from '../formula/Katex'
import { Note, Stat, fmt, num, useTr } from './toolUi'

const R = 10, W = 320
const sx = (x: number) => ((x + R) / (2 * R)) * W
const sy = (y: number) => W - ((y + R) / (2 * R)) * W

/** Gradient and y-intercept of the line through two points (m undefined for a vertical line). */
export function lineThrough(x1: number, y1: number, x2: number, y2: number) {
  if (x1 === x2) return { m: undefined, c: undefined }
  const m = (y2 - y1) / (x2 - x1)
  return { m, c: y1 - m * x1 }
}

const frac = (a: number, b: number) => {
  const g = (p: number, q: number): number => (q ? g(q, p % q) : Math.abs(p))
  if (!Number.isInteger(a) || !Number.isInteger(b) || b === 0) return undefined
  const d = g(a, b) * Math.sign(b)
  return b / d === 1 ? `${a / d}` : `\\frac{${a / d}}{${b / d}}`
}

export default function LinePlotter() {
  const { t } = useTr()
  const [p, setP] = useState({ x1: '-2', y1: '-1', x2: '4', y2: '5' })
  const x1 = num(p.x1), y1 = num(p.y1), x2 = num(p.x2), y2 = num(p.y2)
  const ready = [x1, y1, x2, y2].every((v) => v !== undefined)
  const same = ready && x1 === x2 && y1 === y2
  const { m, c } = ready ? lineThrough(x1!, y1!, x2!, y2!) : { m: undefined, c: undefined }
  const mTex = ready && m !== undefined ? frac(y2! - y1!, x2! - x1!) ?? fmt(m) : ''

  const field = (k: keyof typeof p) => (
    <input className="input w-16 text-center tabular-nums" inputMode="decimal" value={p[k]} onChange={(e) => setP({ ...p, [k]: e.target.value })} aria-label={k} />
  )
  const eq = m === undefined ? (ready ? `x = ${fmt(x1!)}` : '')
    : `y = ${m === 0 ? '' : `${mTex === '1' ? '' : mTex === '-1' ? '-' : mTex}x`}${c === 0 && m !== 0 ? '' : c! < 0 ? ` - ${fmt(-c!)}` : m === 0 ? fmt(c!) : ` + ${fmt(c!)}`}`

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span>A (</span>{field('x1')}<span>,</span>{field('y1')}<span>)</span>
        <span className="ml-2">B (</span>{field('x2')}<span>,</span>{field('y2')}<span>)</span>
      </div>
      <svg viewBox={`0 0 ${W} ${W}`} className="w-full rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" role="img" aria-label={t('Graph', 'Graf')}>
        {Array.from({ length: 2 * R + 1 }, (_, i) => i - R).map((g) => (
          <g key={g} className="stroke-slate-100 dark:stroke-slate-800">
            <line x1={sx(g)} y1={0} x2={sx(g)} y2={W} /><line x1={0} y1={sy(g)} x2={W} y2={sy(g)} />
          </g>
        ))}
        <line x1={0} y1={sy(0)} x2={W} y2={sy(0)} className="stroke-slate-400" />
        <line x1={sx(0)} y1={0} x2={sx(0)} y2={W} className="stroke-slate-400" />
        {[-10, -5, 5, 10].map((n) => (
          <g key={n} className="fill-slate-400 text-[9px]">
            <text x={sx(n)} y={sy(0) + 11} textAnchor="middle">{n}</text><text x={sx(0) + 4} y={sy(n) + 3}>{n}</text>
          </g>
        ))}
        {ready && !same && (m === undefined
          ? <line x1={sx(x1!)} y1={0} x2={sx(x1!)} y2={W} stroke="#7c3aed" strokeWidth={2.5} />
          : <line x1={sx(-R)} y1={sy(m * -R + c!)} x2={sx(R)} y2={sy(m * R + c!)} stroke="#7c3aed" strokeWidth={2.5} />)}
        {ready && m !== undefined && !same && (
          <g stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 3">
            <line x1={sx(x1!)} y1={sy(y1!)} x2={sx(x2!)} y2={sy(y1!)} /><line x1={sx(x2!)} y1={sy(y1!)} x2={sx(x2!)} y2={sy(y2!)} />
          </g>
        )}
        {ready && [[x1!, y1!, 'A'], [x2!, y2!, 'B']].map(([x, y, l]) => (
          <g key={l as string}>
            <circle cx={sx(x as number)} cy={sy(y as number)} r={5} fill="#ef4444" />
            <text x={sx(x as number) + 7} y={sy(y as number) - 6} className="fill-red-600 text-[11px] font-bold">{l}</text>
          </g>
        ))}
      </svg>
      {!ready ? <Note>{t('Enter both points.', 'Masukkan kedua-dua titik.')}</Note> : same ? <Note tone="warn">{t('A and B are the same point — choose two different points.', 'A dan B ialah titik yang sama — pilih dua titik berbeza.')}</Note> : (
        <>
          <div className="rounded-xl bg-slate-50 py-2 text-center text-lg dark:bg-slate-800/60"><Katex tex={eq} /></div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <Stat label={<Katex tex="m = \frac{y_2 - y_1}{x_2 - x_1}" />}>
              {m === undefined ? t('undefined (vertical line)', 'tidak tertakrif (garis tegak)') : <Katex tex={`\\frac{${fmt(y2!)} - (${fmt(y1!)})}{${fmt(x2!)} - (${fmt(x1!)})} = ${mTex}`} />}
            </Stat>
            <Stat label={t('Slope', 'Kecondongan')}>
              {m === undefined ? '|' : m > 0 ? t('/ positive', '/ positif') : m < 0 ? t('\\ negative', '\\ negatif') : t('— zero (horizontal)', '— sifar (mengufuk)')}
            </Stat>
            <Stat label={t('y-intercept c', 'Pintasan-y c')}>{c === undefined ? '—' : fmt(c)}</Stat>
            <Stat label={t('x-intercept', 'Pintasan-x')}>{m === undefined ? fmt(x1!) : m === 0 ? '—' : fmt(-c! / m)}</Stat>
          </dl>
          <p className="text-xs muted">{t('Gradient = vertical distance ÷ horizontal distance (the dashed steps). Parallel lines have the same gradient.', 'Kecerunan = jarak mencancang ÷ jarak mengufuk (langkah putus-putus). Garis selari mempunyai kecerunan yang sama.')}</p>
        </>
      )}
    </div>
  )
}
