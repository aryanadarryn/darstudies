// JSON-driven infographics (plan §7.2): SVG/HTML components so they stay crisp, bilingual and animatable.
import { motion } from 'framer-motion'
import type { Infographic as InfographicData, Lang } from '../../content/schema'
import { useT } from '../../i18n/useT'

/** Greedy word wrap for SVG text. */
function wrap(text: string, max: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const w of text.split(' ')) {
    if ((line + ' ' + w).trim().length > max && line) {
      lines.push(line)
      line = w
    } else line = (line + ' ' + w).trim()
  }
  if (line) lines.push(line)
  return lines
}

type Step = { title: Lang; detail?: Lang }

export function ConceptMap({ center, nodes, color }: { center: Lang; nodes: { label: Lang; detail?: Lang }[]; color: string }) {
  const { L } = useT()
  const W = 340, H = 330, cx = W / 2, cy = H / 2
  const pts = nodes.map((_, i) => {
    const a = (i / nodes.length) * 2 * Math.PI - Math.PI / 2
    return { x: cx + 118 * Math.cos(a), y: cy + 122 * Math.sin(a) }
  })
  const centerLines = wrap(L(center), 12)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={L(center)}>
      {pts.map((p, i) => (
        <motion.line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={color} strokeOpacity={0.4} strokeWidth={2}
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.1 * i, duration: 0.4 }} />
      ))}
      <circle cx={cx} cy={cy} r={46} fill={color} />
      <text x={cx} y={cy - (centerLines.length - 1) * 7} textAnchor="middle" className="fill-white text-[12px] font-bold">
        {centerLines.map((l, i) => <tspan key={i} x={cx} dy={i ? 14 : 4}>{l}</tspan>)}
      </text>
      {nodes.map((n, i) => {
        const p = pts[i]
        const label = wrap(L(n.label), 14)
        const detail = n.detail ? wrap(L(n.detail), 16) : []
        const h = 14 * label.length + 12 * detail.length + 12
        return (
          <motion.g key={i} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + 0.1 * i }} style={{ transformOrigin: `${p.x}px ${p.y}px` }}>
            <rect x={p.x - 50} y={p.y - h / 2} width={100} height={h} rx={10} className="fill-white dark:fill-slate-800" stroke={color} strokeWidth={1.5} />
            <text textAnchor="middle" className="fill-slate-800 dark:fill-slate-100">
              {label.map((l, j) => <tspan key={j} x={p.x} y={p.y - h / 2 + 16 + j * 14} className="text-[11px] font-semibold">{l}</tspan>)}
              {detail.map((l, j) => <tspan key={`d${j}`} x={p.x} y={p.y - h / 2 + 16 + label.length * 14 + j * 12} className="fill-slate-500 text-[10px] dark:fill-slate-400">{l}</tspan>)}
            </text>
          </motion.g>
        )
      })}
    </svg>
  )
}

export function ProcessFlow({ steps, color }: { steps: Step[]; color: string }) {
  const { L } = useT()
  return (
    <ol className="relative space-y-3">
      {steps.map((s, i) => (
        <motion.li key={i} className="relative flex gap-3" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 * i }}>
          <div className="flex flex-col items-center">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: color }}>{i + 1}</span>
            {i < steps.length - 1 && <span className="mt-1 w-0.5 flex-1 rounded" style={{ backgroundColor: color, opacity: 0.35 }} />}
          </div>
          <div className="pb-1">
            <div className="font-semibold">{L(s.title)}</div>
            {s.detail && <div className="text-sm muted">{L(s.detail)}</div>}
          </div>
        </motion.li>
      ))}
    </ol>
  )
}

export function Cycle({ steps, color }: { steps: Step[]; color: string }) {
  const { L } = useT()
  const W = 320, cx = W / 2, cy = W / 2, r = 108
  return (
    <svg viewBox={`0 0 ${W} ${W}`} className="w-full" role="img">
      <defs>
        <marker id="cyc-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill={color} />
        </marker>
      </defs>
      {steps.map((_, i) => {
        const a1 = (i / steps.length) * 2 * Math.PI - Math.PI / 2 + 0.32
        const a2 = ((i + 1) / steps.length) * 2 * Math.PI - Math.PI / 2 - 0.32
        return (
          <path key={i} d={`M${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} A${r} ${r} 0 0 1 ${cx + r * Math.cos(a2)} ${cy + r * Math.sin(a2)}`}
            fill="none" stroke={color} strokeWidth={2} markerEnd="url(#cyc-arrow)" opacity={0.6} />
        )
      })}
      {steps.map((s, i) => {
        const a = (i / steps.length) * 2 * Math.PI - Math.PI / 2
        const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a)
        const lines = wrap(L(s.title), 12)
        return (
          <g key={i}>
            <rect x={x - 46} y={y - 9 - lines.length * 7} width={92} height={18 + lines.length * 14 - 4} rx={9} fill={color} />
            <text textAnchor="middle" className="fill-white text-[11px] font-semibold">
              {lines.map((l, j) => <tspan key={j} x={x} y={y - lines.length * 7 + 12 + j * 14}>{l}</tspan>)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function CompareTable({ headers, rows, color }: { headers: Lang[]; rows: { label: Lang; cells: Lang[] }[]; color: string }) {
  const { L } = useT()
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[480px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 bg-white p-2 dark:bg-slate-900" />
            {headers.map((h, i) => (
              <th key={i} className="p-2 text-left text-xs font-bold text-white first:rounded-tl-lg last:rounded-tr-lg" style={{ backgroundColor: color }}>{L(h)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 * i }}>
              <th className="sticky left-0 border-b border-slate-200 bg-white p-2 text-left text-xs font-semibold dark:border-slate-800 dark:bg-slate-900">{L(r.label)}</th>
              {r.cells.map((c, j) => <td key={j} className="border-b border-slate-200 p-2 dark:border-slate-800">{L(c)}</td>)}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Infographic({ data, color }: { data: InfographicData; color: string }) {
  switch (data.kind) {
    case 'concept-map': return <ConceptMap {...data.data} color={color} />
    case 'process': return <ProcessFlow steps={data.data.steps} color={color} />
    case 'cycle': return <Cycle steps={data.data.steps} color={color} />
    case 'compare': return <CompareTable {...data.data} color={color} />
  }
}
