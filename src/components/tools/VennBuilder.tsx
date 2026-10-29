// Venn diagram builder: type the elements of ξ, A, B (and C), pick an operation and see it shaded and listed.
import { useId, useMemo, useState } from 'react'
import { Chip, Note, Stat, useTr } from './toolUi'

const W = 320, H = 220
const CIRCLES2 = [{ x: 125, y: 110, r: 70 }, { x: 195, y: 110, r: 70 }]
const CIRCLES3 = [{ x: 130, y: 90, r: 62 }, { x: 190, y: 90, r: 62 }, { x: 160, y: 142, r: 62 }]
const NAMES = ['A', 'B', 'C']

// Where to write elements for each region (bit i set = inside set i).
const SPOTS2: Record<number, [number, number]> = { 0: [40, 30], 1: [95, 110], 2: [225, 110], 3: [160, 110] }
const SPOTS3: Record<number, [number, number]> = { 0: [35, 25], 1: [105, 70], 2: [215, 70], 3: [160, 70], 4: [160, 180], 5: [125, 130], 6: [195, 130], 7: [160, 112] }

interface Op { label: string; sets: 2 | 3; f: (a: boolean, b: boolean, c: boolean) => boolean }
const OPS: Op[] = [
  { label: 'A ∩ B', sets: 2, f: (a, b) => a && b },
  { label: 'A ∪ B', sets: 2, f: (a, b) => a || b },
  { label: "A'", sets: 2, f: (a) => !a },
  { label: "(A ∩ B)'", sets: 2, f: (a, b) => !(a && b) },
  { label: "(A ∪ B)'", sets: 2, f: (a, b) => !(a || b) },
  { label: "A ∩ B'", sets: 2, f: (a, b) => a && !b },
  { label: "A' ∩ B", sets: 2, f: (a, b) => !a && b },
  { label: "A' ∪ B", sets: 2, f: (a, b) => !a || b },
  { label: 'A ∩ B ∩ C', sets: 3, f: (a, b, c) => a && b && c },
  { label: 'A ∪ B ∪ C', sets: 3, f: (a, b, c) => a || b || c },
  { label: '(A ∪ B) ∩ C', sets: 3, f: (a, b, c) => (a || b) && c },
  { label: 'A ∩ (B ∪ C)', sets: 3, f: (a, b, c) => a && (b || c) },
  { label: '(A ∩ B) ∪ C', sets: 3, f: (a, b, c) => (a && b) || c },
  { label: "A' ∩ B ∩ C", sets: 3, f: (a, b, c) => !a && b && c },
  { label: "A ∩ B' ∩ C'", sets: 3, f: (a, b, c) => a && !b && !c },
  { label: "(A ∪ B ∪ C)'", sets: 3, f: (a, b, c) => !(a || b || c) },
]

const split = (s: string) => [...new Set(s.split(/[,\s]+/).map((x) => x.trim()).filter(Boolean))]
const byNumber = (a: string, b: string) => (Number.isFinite(Number(a)) && Number.isFinite(Number(b)) ? Number(a) - Number(b) : a.localeCompare(b))

export default function VennBuilder() {
  const { t } = useTr()
  const uid = useId().replace(/:/g, '')
  const [three, setThree] = useState(false)
  const [xi, setXi] = useState('1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12')
  const [sets, setSets] = useState(['2, 4, 6, 8, 10, 12', '3, 6, 9, 12', '1, 2, 3, 4, 5'])
  const [opIndex, setOpIndex] = useState(0)

  const n = three ? 3 : 2
  const ops = OPS.filter((o) => o.sets === n)
  const op = ops[Math.min(opIndex, ops.length - 1)]
  const circles = three ? CIRCLES3 : CIRCLES2
  const spots = three ? SPOTS3 : SPOTS2

  const { universe, members, outside } = useMemo(() => {
    const lists = sets.slice(0, n).map(split)
    const all = split(xi)
    const extra = lists.flat().filter((e) => !all.includes(e))
    const universe = [...all, ...new Set(extra)].sort(byNumber)
    const members = universe.map((e) => ({ e, mask: lists.reduce((m, l, i) => m | (l.includes(e) ? 1 << i : 0), 0) }))
    return { universe, members, outside: [...new Set(extra)] }
  }, [xi, sets, n])

  const inOp = (mask: number) => op.f(!!(mask & 1), !!(mask & 2), !!(mask & 4))
  const result = members.filter((m) => inOp(m.mask)).map((m) => m.e)
  const regions = Array.from({ length: 1 << n }, (_, mask) => mask)

  // A region is the universe clipped by each circle it is inside, with the circles it is outside masked away.
  const region = (mask: number) => {
    let node = <rect x={4} y={4} width={W - 8} height={H - 8} rx={8} mask={`url(#${uid}-out${mask})`} fill="#a78bfa" fillOpacity={0.55} />
    circles.forEach((_, i) => { if (mask & (1 << i)) node = <g clipPath={`url(#${uid}-c${i})`}>{node}</g> })
    return <g key={mask}>{node}</g>
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Chip active={!three} onClick={() => { setThree(false); setOpIndex(0) }}>{t('2 sets', '2 set')}</Chip>
        <Chip active={three} onClick={() => { setThree(true); setOpIndex(0) }}>{t('3 sets', '3 set')}</Chip>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" role="img" aria-label={op.label}>
        <defs>
          {circles.map((c, i) => <clipPath key={i} id={`${uid}-c${i}`}><circle cx={c.x} cy={c.y} r={c.r} /></clipPath>)}
          {regions.map((mask) => (
            <mask key={mask} id={`${uid}-out${mask}`}>
              <rect x={0} y={0} width={W} height={H} fill="white" />
              {circles.map((c, i) => (mask & (1 << i) ? null : <circle key={i} cx={c.x} cy={c.y} r={c.r} fill="black" />))}
            </mask>
          ))}
        </defs>
        {regions.filter(inOp).map(region)}
        <rect x={4} y={4} width={W - 8} height={H - 8} rx={8} fill="none" className="stroke-slate-500" strokeWidth={1.5} />
        <text x={14} y={20} className="fill-slate-500 text-[12px] font-bold">ξ</text>
        {circles.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r={c.r} fill="none" stroke="#6d28d9" strokeWidth={2} />
            <text x={c.x + (i === 0 ? -c.r * 0.8 : i === 1 ? c.r * 0.8 : 0)} y={i === 2 ? c.y + c.r + 13 : c.y - c.r * 0.75} textAnchor="middle" className="fill-violet-800 text-[13px] font-bold dark:fill-violet-300">{NAMES[i]}</text>
          </g>
        ))}
        {regions.map((mask) => {
          const els = members.filter((m) => m.mask === mask).map((m) => m.e)
          const [x, y] = spots[mask]
          const rows: string[] = []
          const per = mask === 0 ? 2 : 3
          for (let i = 0; i < els.length; i += per) rows.push(els.slice(i, i + per).join(', '))
          return rows.map((row, r) => (
            <text key={`${mask}-${r}`} x={mask === 0 ? 12 : x} y={mask === 0 ? 34 + r * 12 : y + (r - (rows.length - 1) / 2) * 12} textAnchor={mask === 0 ? 'start' : 'middle'}
              className="fill-slate-900 text-[10px] font-semibold dark:fill-slate-100">{row}</text>
          ))
        })}
      </svg>

      <div className="flex flex-wrap gap-2">
        {ops.map((o, i) => <Chip key={o.label} active={o === op} onClick={() => setOpIndex(i)}><span className="font-mono">{o.label}</span></Chip>)}
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <Stat label={<span className="font-mono">{op.label}</span>}>{`{ ${result.join(', ')} }`}</Stat>
        <Stat label={<span className="font-mono">n({op.label})</span>}>{result.length}</Stat>
      </dl>

      <section className="card space-y-2">
        <label className="block">
          <span className="text-xs font-semibold">{t('Universal set ξ', 'Set semesta ξ')}</span>
          <input className="input mt-1 font-mono" value={xi} onChange={(e) => setXi(e.target.value)} />
        </label>
        {NAMES.slice(0, n).map((name, i) => (
          <label key={name} className="block">
            <span className="text-xs font-semibold">{t('Set', 'Set')} {name}</span>
            <input className="input mt-1 font-mono" value={sets[i]} onChange={(e) => setSets(sets.map((s, j) => (j === i ? e.target.value : s)))} />
          </label>
        ))}
        <p className="text-xs muted">{t('Separate elements with commas. n(ξ) =', 'Pisahkan unsur dengan koma. n(ξ) =')} {universe.length}</p>
      </section>
      {outside.length > 0 && (
        <Note tone="warn">{t(`Not in ξ: ${outside.join(', ')} — every set must be a subset of ξ, so they were added to ξ.`, `Tiada dalam ξ: ${outside.join(', ')} — setiap set mesti subset kepada ξ, jadi unsur ini ditambah ke ξ.`)}</Note>
      )}
      <p className="text-xs muted">{t("∩ = in both (and) · ∪ = in either (or) · ' = complement, everything in ξ that is not in the set.", "∩ = dalam kedua-duanya (dan) · ∪ = dalam salah satu (atau) · ' = pelengkap, semua dalam ξ yang bukan dalam set itu.")}</p>
    </div>
  )
}
