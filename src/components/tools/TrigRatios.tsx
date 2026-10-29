// Trigonometric ratios (Form 3): change the angle of a right-angled triangle and watch sin, cos and tan.
import { useState } from 'react'
import Katex from '../formula/Katex'
import { Chip, Field, Note, Stat, fmt, num, useTr } from './toolUi'

const W = 320, H = 200
const SPECIAL: Record<number, { sin: string; cos: string; tan: string }> = {
  30: { sin: '\\tfrac{1}{2}', cos: '\\tfrac{\\sqrt3}{2}', tan: '\\tfrac{1}{\\sqrt3}' },
  45: { sin: '\\tfrac{1}{\\sqrt2}', cos: '\\tfrac{1}{\\sqrt2}', tan: '1' },
  60: { sin: '\\tfrac{\\sqrt3}{2}', cos: '\\tfrac{1}{2}', tan: '\\sqrt3' },
}

export default function TrigRatios() {
  const { t } = useTr()
  const [deg, setDeg] = useState(35)
  const [hyp, setHyp] = useState('10')
  const r = (deg * Math.PI) / 180
  const sin = Math.sin(r), cos = Math.cos(r), tan = Math.tan(r)
  const h = num(hyp)

  // Draw: θ at bottom-left, right angle at bottom-right; scale so the triangle fits.
  const scale = Math.min((W - 60) / cos, (H - 40) / sin) * 0.95
  const A = { x: 30, y: H - 20 }, Bp = { x: 30 + scale * cos, y: H - 20 }, C = { x: 30 + scale * cos, y: H - 20 - scale * sin }
  const arc = 28

  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" role="img" aria-label={t('Right-angled triangle', 'Segi tiga bersudut tegak')}>
        <polygon points={`${A.x},${A.y} ${Bp.x},${Bp.y} ${C.x},${C.y}`} fill="#ede9fe" className="dark:fill-violet-950" />
        <line x1={A.x} y1={A.y} x2={Bp.x} y2={Bp.y} stroke="#0ea5e9" strokeWidth={3} />
        <line x1={Bp.x} y1={Bp.y} x2={C.x} y2={C.y} stroke="#ef4444" strokeWidth={3} />
        <line x1={A.x} y1={A.y} x2={C.x} y2={C.y} stroke="#7c3aed" strokeWidth={3} />
        <rect x={Bp.x - 10} y={Bp.y - 10} width={10} height={10} fill="none" className="stroke-slate-500" />
        <path d={`M${A.x + arc} ${A.y} A ${arc} ${arc} 0 0 0 ${A.x + arc * cos} ${A.y - arc * sin}`} fill="none" stroke="#f59e0b" strokeWidth={2} />
        <text x={A.x + arc + 4} y={A.y - 6} className="fill-amber-600 text-[11px] font-bold">θ</text>
        <text x={(A.x + Bp.x) / 2} y={A.y + 14} textAnchor="middle" className="fill-sky-600 text-[10px] font-bold">{t('adjacent', 'bersebelahan')}</text>
        <text x={Bp.x + 4} y={(Bp.y + C.y) / 2} className="fill-red-600 text-[10px] font-bold">{t('opposite', 'bertentangan')}</text>
        <text x={(A.x + C.x) / 2 - 8} y={(A.y + C.y) / 2 - 8} textAnchor="end" className="fill-violet-700 text-[10px] font-bold">{t('hypotenuse', 'hipotenus')}</text>
      </svg>
      <label className="flex items-center gap-3">
        <span className="w-10 font-mono text-lg font-bold italic">θ</span>
        <input type="range" min={1} max={89} value={deg} onChange={(e) => setDeg(Number(e.target.value))} className="flex-1" aria-label="θ" />
        <span className="w-12 text-right font-mono">{deg}°</span>
      </label>
      <div className="flex gap-2">{[30, 45, 60].map((a) => <Chip key={a} active={deg === a} onClick={() => setDeg(a)}>{a}°</Chip>)}</div>
      <dl className="grid grid-cols-3 gap-2 text-sm">
        <Stat label={<Katex tex="\sin\theta = \tfrac{\text{opp}}{\text{hyp}}" />}>{sin.toFixed(4)}{SPECIAL[deg] && <> = <Katex tex={SPECIAL[deg].sin} /></>}</Stat>
        <Stat label={<Katex tex="\cos\theta = \tfrac{\text{adj}}{\text{hyp}}" />}>{cos.toFixed(4)}{SPECIAL[deg] && <> = <Katex tex={SPECIAL[deg].cos} /></>}</Stat>
        <Stat label={<Katex tex="\tan\theta = \tfrac{\text{opp}}{\text{adj}}" />}>{tan.toFixed(4)}{SPECIAL[deg] && <> = <Katex tex={SPECIAL[deg].tan} /></>}</Stat>
      </dl>
      <Field label={t('Hypotenuse', 'Hipotenus')} unit="cm" value={hyp} onChange={setHyp} />
      {h !== undefined && h > 0 ? (
        <Note tone="ok">
          {t('Opposite', 'Bertentangan')} = {fmt(h)} × sin {deg}° = <strong>{fmt(h * sin)} cm</strong><br />
          {t('Adjacent', 'Bersebelahan')} = {fmt(h)} × cos {deg}° = <strong>{fmt(h * cos)} cm</strong>
        </Note>
      ) : <Note>{t('Enter a hypotenuse length above 0.', 'Masukkan panjang hipotenus lebih daripada 0.')}</Note>}
      <p className="text-xs muted">{t('As θ grows, sin θ rises towards 1, cos θ falls towards 0 and tan θ grows without limit. Remember: sin θ ÷ cos θ = tan θ.', 'Apabila θ bertambah, sin θ naik menghampiri 1, cos θ turun menghampiri 0 dan tan θ terus bertambah. Ingat: sin θ ÷ cos θ = tan θ.')}</p>
    </div>
  )
}
