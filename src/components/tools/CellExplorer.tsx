// Tool #9 — cell explorer: tap organelles to learn them, then "Find it" mode tests you.
import { useMemo, useState } from 'react'
import { useT } from '../../i18n/useT'
import { shuffle } from '../../lib/quizCheck'

type Part = 'membrane' | 'wall' | 'nucleus' | 'mito' | 'ribosome' | 'rer' | 'ser' | 'golgi' | 'lysosome' | 'centriole' | 'chloroplast' | 'vacuole' | 'cytoplasm'

const INFO: Record<Part, { en: string; bm: string; fen: string; fbm: string; color: string }> = {
  membrane: { en: 'Plasma membrane', bm: 'Membran plasma', fen: 'Semi-permeable; controls what enters and leaves the cell.', fbm: 'Separa telap; mengawal bahan masuk dan keluar sel.', color: '#0ea5e9' },
  wall: { en: 'Cell wall', bm: 'Dinding sel', fen: 'Cellulose layer, fully permeable; gives shape and support.', fbm: 'Lapisan selulosa, telap sepenuhnya; memberi bentuk dan sokongan.', color: '#65a30d' },
  nucleus: { en: 'Nucleus', bm: 'Nukleus', fen: 'Contains DNA; controls all cell activities.', fbm: 'Mengandungi DNA; mengawal semua aktiviti sel.', color: '#7c3aed' },
  mito: { en: 'Mitochondrion', bm: 'Mitokondrion', fen: 'Site of aerobic respiration — releases energy.', fbm: 'Tapak respirasi aerob — membebaskan tenaga.', color: '#ea580c' },
  ribosome: { en: 'Ribosomes', bm: 'Ribosom', fen: 'Site of protein synthesis.', fbm: 'Tapak sintesis protein.', color: '#1e293b' },
  rer: { en: 'Rough ER', bm: 'Jalinan endoplasma kasar', fen: 'Has ribosomes; transports proteins.', fbm: 'Ada ribosom; mengangkut protein.', color: '#db2777' },
  ser: { en: 'Smooth ER', bm: 'Jalinan endoplasma licin', fen: 'Makes lipids; detoxifies.', fbm: 'Mensintesis lipid; menyahtoksik.', color: '#f472b6' },
  golgi: { en: 'Golgi apparatus', bm: 'Jasad Golgi', fen: 'Modifies, packages and transports proteins.', fbm: 'Mengubah suai, membungkus dan mengangkut protein.', color: '#ca8a04' },
  lysosome: { en: 'Lysosome', bm: 'Lisosom', fen: 'Contains enzymes that digest worn-out organelles.', fbm: 'Mengandungi enzim yang mencerna organel usang.', color: '#dc2626' },
  centriole: { en: 'Centrioles', bm: 'Sentriol', fen: 'Form spindle fibres in cell division (animal cells).', fbm: 'Membentuk gentian gelendong semasa pembahagian sel (sel haiwan).', color: '#0f766e' },
  chloroplast: { en: 'Chloroplast', bm: 'Kloroplas', fen: 'Contains chlorophyll; site of photosynthesis.', fbm: 'Mengandungi klorofil; tapak fotosintesis.', color: '#16a34a' },
  vacuole: { en: 'Vacuole', bm: 'Vakuol', fen: 'Stores cell sap; keeps plant cells turgid.', fbm: 'Menyimpan sap sel; mengekalkan kesegahan sel tumbuhan.', color: '#38bdf8' },
  cytoplasm: { en: 'Cytoplasm', bm: 'Sitoplasma', fen: 'Jelly-like medium where reactions happen.', fbm: 'Medium seperti jeli tempat tindak balas berlaku.', color: '#94a3b8' },
}

const ANIMAL: Part[] = ['membrane', 'cytoplasm', 'nucleus', 'mito', 'ribosome', 'rer', 'ser', 'golgi', 'lysosome', 'centriole']
const PLANT: Part[] = ['wall', 'membrane', 'cytoplasm', 'vacuole', 'nucleus', 'chloroplast', 'mito', 'ribosome', 'rer', 'golgi']

function CellSvg({ kind, onPick, active }: { kind: 'animal' | 'plant'; onPick: (p: Part) => void; active: Part | null }) {
  const hit = (p: Part) => ({
    onClick: (e: React.MouseEvent) => { e.stopPropagation(); onPick(p) },
    // Highlight with a filter so the part keeps its own stroke.
    style: { cursor: 'pointer', filter: active === p ? 'drop-shadow(0 0 2px #0f172a) drop-shadow(0 0 4px #fbbf24)' : undefined },
  })
  const c = (p: Part) => INFO[p].color
  const plant = kind === 'plant'
  return (
    <svg viewBox="0 0 320 240" className="w-full" role="img" aria-label={kind}>
      {plant ? (
        <>
          <rect x={10} y={10} width={300} height={220} rx={14} fill={c('wall')} {...hit('wall')} />
          <rect x={20} y={20} width={280} height={200} rx={10} fill="#e0f2fe" {...hit('cytoplasm')} />
          <rect x={20} y={20} width={280} height={200} rx={10} fill="none" stroke={c('membrane')} strokeWidth={4} {...hit('membrane')} />
          <rect x={95} y={55} width={150} height={130} rx={40} fill={c('vacuole')} opacity={0.75} {...hit('vacuole')} />
          <circle cx={58} cy={60} r={24} fill={c('nucleus')} {...hit('nucleus')} />
          {[[45, 150], [270, 70], [265, 170], [150, 205]].map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx={20} ry={10} fill={c('chloroplast')} {...hit('chloroplast')} />
          ))}
          <ellipse cx={60} cy={200} rx={14} ry={7} fill={c('mito')} {...hit('mito')} />
          <path d="M255 115 q10 -8 20 0 q10 8 20 0" fill="none" stroke={c('rer')} strokeWidth={5} {...hit('rer')} />
          <path d="M100 205 h40 M104 212 h32" stroke={c('golgi')} strokeWidth={4} {...hit('golgi')} />
          {[[40, 100], [80, 110], [285, 145], [210, 30]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={3} fill={c('ribosome')} {...hit('ribosome')} />)}
        </>
      ) : (
        <>
          <ellipse cx={160} cy={120} rx={150} ry={110} fill="#fef3c7" {...hit('cytoplasm')} />
          <ellipse cx={160} cy={120} rx={150} ry={110} fill="none" stroke={c('membrane')} strokeWidth={5} {...hit('membrane')} />
          <circle cx={160} cy={115} r={34} fill={c('nucleus')} {...hit('nucleus')} />
          {[[70, 90], [240, 160], [110, 185]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx={20} ry={10} fill={c('mito')} {...hit('mito')} />)}
          <path d="M215 70 q10 -10 20 0 q10 10 20 0 q10 -10 20 0" fill="none" stroke={c('rer')} strokeWidth={5} {...hit('rer')} />
          <path d="M60 140 q12 8 24 0 q12 -8 24 0" fill="none" stroke={c('ser')} strokeWidth={5} {...hit('ser')} />
          <path d="M190 180 h40 M194 188 h32 M198 196 h24" stroke={c('golgi')} strokeWidth={4} {...hit('golgi')} />
          <circle cx={110} cy={60} r={9} fill={c('lysosome')} {...hit('lysosome')} />
          <g {...hit('centriole')}><rect x={235} y={110} width={6} height={20} fill={c('centriole')} /><rect x={243} y={117} width={20} height={6} fill={c('centriole')} /></g>
          {[[220, 60], [250, 80], [80, 120], [150, 175], [200, 140]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={3} fill={c('ribosome')} {...hit('ribosome')} />)}
        </>
      )}
    </svg>
  )
}

export default function CellExplorer() {
  const { lang } = useT()
  const t = (en: string, bm: string) => (lang === 'en' ? en : bm)
  const [kind, setKind] = useState<'animal' | 'plant'>('animal')
  const [active, setActive] = useState<Part | null>(null)
  const [quiz, setQuiz] = useState(false)
  const [round, setRound] = useState(0)
  const [feedback, setFeedback] = useState<'right' | 'wrong' | null>(null)
  const [score, setScore] = useState(0)

  const parts = kind === 'animal' ? ANIMAL : PLANT
  const order = useMemo(() => shuffle(parts.filter((p) => p !== 'cytoplasm')), [parts, quiz]) // eslint-disable-line react-hooks/exhaustive-deps
  const target = order[round % order.length]

  const pick = (p: Part) => {
    if (!quiz) return setActive(p)
    if (feedback) return
    setActive(p)
    if (p === target) {
      setFeedback('right')
      setScore((s) => s + 1)
    } else setFeedback('wrong')
  }
  const nextRound = () => { setRound((r) => r + 1); setFeedback(null); setActive(null) }
  const info = active ? INFO[active] : null

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(['animal', 'plant'] as const).map((k) => (
          <button key={k} onClick={() => { setKind(k); setActive(null); setRound(0); setScore(0); setFeedback(null) }}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold ${kind === k ? 'bg-green-700 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
            {k === 'animal' ? t('🐾 Animal cell', '🐾 Sel haiwan') : t('🌱 Plant cell', '🌱 Sel tumbuhan')}
          </button>
        ))}
      </div>
      <button onClick={() => { setQuiz(!quiz); setRound(0); setScore(0); setFeedback(null); setActive(null) }} className="btn-secondary w-full">
        {quiz ? t('← Explore mode', '← Mod teroka') : t('🎯 Find it! (quiz mode)', '🎯 Cari! (mod kuiz)')}
      </button>
      {quiz && (
        <div className="rounded-xl bg-slate-100 p-3 text-center text-sm dark:bg-slate-800">
          {t('Tap the', 'Ketik')} <strong>{INFO[target][lang]}</strong> · {score}/{round + (feedback ? 1 : 0)}
        </div>
      )}
      <div className="card !p-2"><CellSvg kind={kind} onPick={pick} active={active} /></div>
      {info && (
        <div className={`card ${feedback === 'right' ? '!bg-green-50 dark:!bg-green-950/40' : feedback === 'wrong' ? '!bg-red-50 dark:!bg-red-950/40' : ''}`}>
          {feedback && <p className="mb-1 font-bold">{feedback === 'right' ? t('✅ Correct!', '✅ Betul!') : t('❌ That is the…', '❌ Itu ialah…')}</p>}
          <div className="flex items-center gap-2 font-bold"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: info.color }} />{info[lang]}</div>
          <div className="text-xs muted">{lang === 'en' ? info.bm : info.en}</div>
          <p className="mt-1 text-sm">{lang === 'en' ? info.fen : info.fbm}</p>
          {feedback && <button className="btn-primary mt-3 w-full" onClick={nextRound}>{t('Next', 'Seterusnya')}</button>}
        </div>
      )}
      {!quiz && !info && <p className="text-center text-sm muted">{t('Tap any part of the cell.', 'Ketik mana-mana bahagian sel.')}</p>}
    </div>
  )
}
