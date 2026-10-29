// Motion graph builder: describe a journey in stages; see its velocity-time and displacement-time graphs.
// Gradient of v-t = acceleration, area under v-t = displacement, gradient of s-t = velocity.
import { useState } from 'react'
import { Note, Stat, fmt, num, useTr } from './toolUi'

interface Seg { dt: string; v: string }
const W = 320, H = 150, PAD = 28

export interface Point { t: number; v: number; s: number }

/** Turns stages (duration, velocity at the end) into graph points; the velocity changes uniformly in each stage. */
export function buildJourney(u: number, segs: { dt: number; v: number }[]) {
  const pts: Point[] = [{ t: 0, v: u, s: 0 }]
  let distance = 0
  for (const { dt, v } of segs) {
    const p = pts[pts.length - 1]
    const area = ((p.v + v) / 2) * dt
    if (p.v * v < 0) {
      // velocity changes sign inside the stage: split at v = 0 for the distance
      const t0 = (dt * p.v) / (p.v - v)
      distance += Math.abs(p.v * t0) / 2 + Math.abs(v * (dt - t0)) / 2
    } else distance += Math.abs(area)
    pts.push({ t: p.t + dt, v, s: p.s + area })
  }
  return { pts, distance }
}

function Graph({ pts, y, label, unit, curve }: { pts: Point[]; y: (p: Point) => number; label: string; unit: string; curve?: boolean }) {
  const T = pts[pts.length - 1].t || 1
  const ys = pts.map(y)
  // s-t is a curve inside an accelerating stage: sample it.
  const sampled: { t: number; y: number }[] = []
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], dt = b.t - a.t
    for (let k = 0; k <= (curve ? 20 : 1); k++) {
      const tt = (k / (curve ? 20 : 1)) * dt
      const acc = dt ? (b.v - a.v) / dt : 0
      sampled.push({ t: a.t + tt, y: curve ? a.s + a.v * tt + 0.5 * acc * tt * tt : a.v + acc * tt })
    }
  }
  if (!sampled.length) sampled.push({ t: 0, y: ys[0] })
  const lo = Math.min(0, ...sampled.map((p) => p.y)), hi = Math.max(1, ...sampled.map((p) => p.y))
  const sx = (t: number) => PAD + (t / T) * (W - PAD - 8)
  const sy = (v: number) => H - 18 - ((v - lo) / (hi - lo)) * (H - 30)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" role="img" aria-label={label}>
      <line x1={PAD} y1={sy(0)} x2={W - 8} y2={sy(0)} className="stroke-slate-400" />
      <line x1={PAD} y1={8} x2={PAD} y2={H - 18} className="stroke-slate-400" />
      <text x={4} y={14} className="fill-slate-500 text-[9px]">{label} ({unit})</text>
      <text x={W - 10} y={sy(0) + 11} textAnchor="end" className="fill-slate-500 text-[9px]">t (s)</text>
      <text x={PAD - 3} y={sy(hi) + 3} textAnchor="end" className="fill-slate-400 text-[8px]">{fmt(hi, 3)}</text>
      {lo < 0 && <text x={PAD - 3} y={sy(lo) + 3} textAnchor="end" className="fill-slate-400 text-[8px]">{fmt(lo, 3)}</text>}
      {!curve && pts.length > 1 && (
        <path d={`M${sx(0)} ${sy(0)} ` + pts.map((p) => `L${sx(p.t)} ${sy(p.v)}`).join(' ') + ` L${sx(T)} ${sy(0)} Z`} fill="#a78bfa" fillOpacity={0.25} />
      )}
      <path d={sampled.map((p, i) => `${i ? 'L' : 'M'}${sx(p.t).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ')} fill="none" stroke="#7c3aed" strokeWidth={2.5} />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={sx(p.t)} cy={sy(y(p))} r={3} fill="#6d28d9" />
          {i > 0 && <text x={sx(p.t)} y={H - 6} textAnchor="middle" className="fill-slate-400 text-[8px]">{fmt(p.t, 3)}</text>}
        </g>
      ))}
    </svg>
  )
}

const PRESETS = [
  { en: 'Bus between stops', bm: 'Bas antara perhentian', u: '0', segs: [{ dt: '10', v: '15' }, { dt: '20', v: '15' }, { dt: '5', v: '0' }] },
  { en: 'Ball thrown upwards', bm: 'Bola dilambung ke atas', u: '20', segs: [{ dt: '4', v: '-20' }] },
  { en: 'Car speeds up twice', bm: 'Kereta memecut dua kali', u: '5', segs: [{ dt: '5', v: '15' }, { dt: '10', v: '15' }, { dt: '5', v: '25' }] },
]

export default function MotionGraph() {
  const { t } = useTr()
  const [u, setU] = useState('0')
  const [segs, setSegs] = useState<Seg[]>(PRESETS[0].segs)

  const u0 = num(u)
  const parsed = segs.map((s) => ({ dt: num(s.dt), v: num(s.v) }))
  const valid = u0 !== undefined && parsed.every((p) => p.dt !== undefined && p.dt > 0 && p.v !== undefined)
  const journey = valid ? buildJourney(u0!, parsed as { dt: number; v: number }[]) : undefined

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button key={p.en} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold dark:bg-slate-800" onClick={() => { setU(p.u); setSegs(p.segs) }}>{t(p.en, p.bm)}</button>
        ))}
      </div>
      <label className="flex items-center gap-3">
        <span className="w-40 shrink-0 text-sm">{t('Starting velocity u', 'Halaju awal u')}</span>
        <input className="input tabular-nums" inputMode="decimal" value={u} onChange={(e) => setU(e.target.value)} />
        <span className="text-xs">m s⁻¹</span>
      </label>
      <div className="space-y-2">
        {segs.map((s, i) => {
          const pts = journey?.pts
          const a = pts ? (pts[i + 1].v - pts[i].v) / (pts[i + 1].t - pts[i].t) : undefined
          return (
            <div key={i} className="card !p-3">
              <div className="mb-2 flex items-center justify-between text-xs font-bold">
                <span>{t('Stage', 'Peringkat')} {i + 1}</span>
                {segs.length > 1 && <button className="text-red-600" onClick={() => setSegs(segs.filter((_, j) => j !== i))} aria-label={t('Remove', 'Buang')}>✕</button>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs">{t('Lasts (s)', 'Tempoh (s)')}<input className="input mt-1" inputMode="decimal" value={s.dt} onChange={(e) => setSegs(segs.map((x, j) => (j === i ? { ...x, dt: e.target.value } : x)))} /></label>
                <label className="text-xs">{t('Velocity at end (m s⁻¹)', 'Halaju di akhir (m s⁻¹)')}<input className="input mt-1" inputMode="decimal" value={s.v} onChange={(e) => setSegs(segs.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)))} /></label>
              </div>
              {a !== undefined && pts && (
                <p className="mt-2 text-xs muted">
                  a = {fmt(a, 3)} m s⁻² ({a > 0 ? t('accelerating', 'memecut') : a < 0 ? t('decelerating', 'nyahpecut') : t('uniform velocity', 'halaju seragam')})
                  · {t('area', 'luas')} = {fmt(pts[i + 1].s - pts[i].s, 3)} m
                </p>
              )}
            </div>
          )
        })}
        {segs.length < 6 && <button className="btn-secondary w-full" onClick={() => setSegs([...segs, { dt: '5', v: segs[segs.length - 1]?.v ?? '0' }])}>+ {t('Add stage', 'Tambah peringkat')}</button>}
      </div>
      {!journey ? <Note tone="warn">{t('Each stage needs a time above 0 and an end velocity.', 'Setiap peringkat perlu masa lebih daripada 0 dan halaju akhir.')}</Note> : (
        <>
          <Graph pts={journey.pts} y={(p) => p.v} label={t('velocity', 'halaju')} unit="m s⁻¹" />
          <Graph pts={journey.pts} y={(p) => p.s} label={t('displacement', 'sesaran')} unit="m" curve />
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <Stat label={t('Total time', 'Jumlah masa')}>{fmt(journey.pts[journey.pts.length - 1].t)} s</Stat>
            <Stat label={t('Displacement (area, with sign)', 'Sesaran (luas, dengan tanda)')}>{fmt(journey.pts[journey.pts.length - 1].s)} m</Stat>
            <Stat label={t('Distance travelled', 'Jarak dilalui')}>{fmt(journey.distance)} m</Stat>
            <Stat label={t('Average speed', 'Laju purata')}>{fmt(journey.distance / journey.pts[journey.pts.length - 1].t)} m s⁻¹</Stat>
          </dl>
          <p className="text-xs muted">{t('v-t graph: gradient = acceleration, shaded area = displacement (area below the axis counts as negative). s-t graph: gradient = velocity.', 'Graf v-t: kecerunan = pecutan, luas berlorek = sesaran (luas di bawah paksi dikira negatif). Graf s-t: kecerunan = halaju.')}</p>
        </>
      )}
    </div>
  )
}
