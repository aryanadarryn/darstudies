// Lens ray diagram: convex or concave lens, move the object and see the three principal rays and the image.
// Uses 1/f = 1/u + 1/v with real-is-positive (f < 0 for a concave lens), as in the KSSM textbook.
import { useState } from 'react'
import Katex from '../formula/Katex'
import { Note, Stat, Tabs, fmt, useTr } from './toolUi'

const W = 360, H = 220, MID = H / 2
const RANGE = 60 // cm shown either side of the lens
const sx = (x: number) => W / 2 + (x / RANGE) * (W / 2)
const sy = (y: number) => MID - (y / RANGE) * (W / 2)

export function lensImage(u: number, f: number) {
  if (Math.abs(u - f) < 1e-9) return { v: Infinity, m: Infinity }
  const v = (u * f) / (u - f)
  return { v, m: v / u }
}

export default function RayDiagram() {
  const { t } = useTr()
  const [kind, setKind] = useState<'convex' | 'concave'>('convex')
  const [focal, setFocal] = useState(12)
  const [u, setU] = useState(30)
  const h = 8
  const f = kind === 'convex' ? focal : -focal
  const { v, m } = lensImage(u, f)
  const atInfinity = !Number.isFinite(v)
  const real = !atInfinity && v > 0
  const hi = atInfinity ? 0 : -m * h // image height (negative = inverted)

  // Where each principal ray meets the lens.
  const hits = [h, 0, Math.abs(u - f) < 1e-9 ? NaN : (h * f) / (f - u)]
  const P = { x: -u, y: h }
  const I = { x: v, y: hi }
  const edge = RANGE * 1.2

  const out = (y: number) => {
    // Outgoing ray from (0, y): towards the image if real, away from the virtual image otherwise.
    let dx: number, dy: number
    if (atInfinity) { dx = u; dy = -h } else if (real) { dx = I.x; dy = I.y - y } else { dx = -I.x; dy = y - I.y }
    const s = edge / Math.abs(dx || 1e-9)
    return { x: dx * s, y: y + dy * s }
  }

  const colors = ['#ef4444', '#0ea5e9', '#16a34a']
  const rays = hits.map((y, i) => {
    if (!Number.isFinite(y) || Math.abs(y) > RANGE) return null
    const o = out(y)
    return (
      <g key={i} stroke={colors[i]} strokeWidth={1.8} fill="none">
        <line x1={sx(P.x)} y1={sy(P.y)} x2={sx(0)} y2={sy(y)} />
        <line x1={sx(0)} y1={sy(y)} x2={sx(o.x)} y2={sy(o.y)} />
        {!atInfinity && !real && <line x1={sx(0)} y1={sy(y)} x2={sx(I.x)} y2={sy(I.y)} strokeDasharray="4 3" strokeOpacity={0.7} />}
      </g>
    )
  })

  const arrow = (x: number, y: number, color: string, dashed = false) => (
    <g stroke={color} fill={color} strokeWidth={2.5} strokeDasharray={dashed ? '4 3' : undefined}>
      <line x1={sx(x)} y1={sy(0)} x2={sx(x)} y2={sy(y)} />
      <polygon points={`${sx(x) - 5},${sy(y) + (y > 0 ? 7 : -7)} ${sx(x) + 5},${sy(y) + (y > 0 ? 7 : -7)} ${sx(x)},${sy(y)}`} strokeDasharray="none" />
    </g>
  )

  const traits = atInfinity
    ? [t('Image formed at infinity (rays leave parallel)', 'Imej terbentuk di infiniti (sinar keluar selari)')]
    : [
        real ? t('Real', 'Nyata') : t('Virtual', 'Maya'),
        hi < 0 ? t('Inverted', 'Songsang') : t('Upright', 'Tegak'),
        Math.abs(m) > 1.001 ? t('Magnified', 'Diperbesar') : Math.abs(m) < 0.999 ? t('Diminished', 'Dikecilkan') : t('Same size', 'Sama saiz'),
        real ? t('On the opposite side of the lens', 'Di sebelah bertentangan kanta') : t('On the same side as the object', 'Di sebelah yang sama dengan objek'),
      ]

  const uses = kind === 'concave'
    ? t('Concave lenses always give a virtual, upright, diminished image — used in spectacles for short sight.', 'Kanta cekung sentiasa memberi imej maya, tegak, dikecilkan — digunakan dalam cermin mata rabun jauh.')
    : u > 2 * focal ? t('u > 2f: camera, eye', 'u > 2f: kamera, mata')
    : Math.abs(u - 2 * focal) < 0.5 ? t('u = 2f: photocopier (same size)', 'u = 2f: mesin fotostat (sama saiz)')
    : u > focal ? t('f < u < 2f: projector', 'f < u < 2f: projektor')
    : atInfinity ? t('u = f: spotlight (parallel beam)', 'u = f: lampu sorot (alur selari)')
    : t('u < f: magnifying glass', 'u < f: kanta pembesar')

  return (
    <div className="space-y-3">
      <Tabs value={kind} onChange={setKind} items={[{ k: 'convex', label: t('Convex lens', 'Kanta cembung') }, { k: 'concave', label: t('Concave lens', 'Kanta cekung') }]} />
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" role="img" aria-label={t('Ray diagram', 'Rajah sinar')}>
        <line x1={0} y1={MID} x2={W} y2={MID} className="stroke-slate-400" />
        {/* lens */}
        <line x1={sx(0)} y1={12} x2={sx(0)} y2={H - 12} stroke="#7c3aed" strokeWidth={3} />
        {kind === 'convex'
          ? <><polygon points={`${sx(0) - 6},20 ${sx(0) + 6},20 ${sx(0)},8`} fill="#7c3aed" /><polygon points={`${sx(0) - 6},${H - 20} ${sx(0) + 6},${H - 20} ${sx(0)},${H - 8}`} fill="#7c3aed" /></>
          : <><polygon points={`${sx(0) - 6},8 ${sx(0) + 6},8 ${sx(0)},20`} fill="#7c3aed" /><polygon points={`${sx(0) - 6},${H - 8} ${sx(0) + 6},${H - 8} ${sx(0)},${H - 20}`} fill="#7c3aed" /></>}
        {[-1, 1].flatMap((side) => [1, 2].map((n) => (
          <g key={`${side}${n}`} className="fill-slate-500 text-[9px]">
            <circle cx={sx(side * n * focal)} cy={MID} r={2.5} />
            <text x={sx(side * n * focal)} y={MID + 12} textAnchor="middle">{n === 1 ? 'F' : '2F'}</text>
          </g>
        )))}
        {rays}
        {arrow(-u, h, '#0f172a')}
        {!atInfinity && Math.abs(v) <= RANGE && Math.abs(hi) <= RANGE && arrow(v, hi, '#f59e0b', !real)}
      </svg>
      <div className="flex flex-wrap gap-3 text-xs">
        <span><span className="text-red-500">━</span> {t('parallel → through F', 'selari → melalui F')}</span>
        <span><span className="text-sky-500">━</span> {t('through optical centre', 'melalui pusat optik')}</span>
        <span><span className="text-green-600">━</span> {t('through F → parallel', 'melalui F → selari')}</span>
      </div>
      <label className="flex items-center gap-3">
        <span className="w-36 shrink-0 text-sm">{t('Object distance u', 'Jarak objek u')}</span>
        <input type="range" min={2} max={55} step={0.5} value={u} onChange={(e) => setU(Number(e.target.value))} className="flex-1" />
        <span className="w-16 text-right font-mono text-sm">{u} cm</span>
      </label>
      <label className="flex items-center gap-3">
        <span className="w-36 shrink-0 text-sm">{t('Focal length |f|', 'Panjang fokus |f|')}</span>
        <input type="range" min={5} max={20} step={1} value={focal} onChange={(e) => setFocal(Number(e.target.value))} className="flex-1" />
        <span className="w-16 text-right font-mono text-sm">{focal} cm</span>
      </label>
      <div className="rounded-xl bg-slate-50 py-2 text-center dark:bg-slate-800/60">
        <Katex tex={`\\frac{1}{f} = \\frac{1}{u} + \\frac{1}{v} \\Rightarrow \\frac{1}{${f}} = \\frac{1}{${u}} + \\frac{1}{v}`} />
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <Stat label={t('Image distance v', 'Jarak imej v')}>{atInfinity ? '∞' : `${fmt(v, 3)} cm`}</Stat>
        <Stat label={<>{t('Magnification', 'Pembesaran')} <Katex tex="m = \tfrac{v}{u}" /></>}>{atInfinity ? '∞' : fmt(Math.abs(m), 3)}</Stat>
        <Stat label={t('Power', 'Kuasa')}>{fmt(100 / f, 3)} D</Stat>
        <Stat label={t('Image height', 'Tinggi imej')}>{atInfinity ? '—' : `${fmt(Math.abs(hi), 3)} cm (${t('object', 'objek')} ${h} cm)`}</Stat>
      </dl>
      <Note tone="ok"><strong>{traits.join(' · ')}</strong><br />{uses}</Note>
      <p className="text-xs muted">{t('A negative v means a virtual image on the object side. Power P = 1/f with f in metres; concave lenses have negative power.', 'v negatif bermaksud imej maya di sebelah objek. Kuasa P = 1/f dengan f dalam meter; kanta cekung mempunyai kuasa negatif.')}</p>
    </div>
  )
}
