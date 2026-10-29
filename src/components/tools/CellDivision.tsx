// Mitosis & meiosis stepper: a 2n = 4 cell (red = from the mother, blue = from the father) drawn at each stage.
import { useState } from 'react'
import { Tabs, useTr } from './toolUi'

const R = '#ef4444', B = '#3b82f6'
const LONG = 30, SHORT = 18

/** A chromatid: its colour and, after crossing over, the colour of its swapped tip. */
type Chromatid = [string, string?]
interface Chrom { x: number; y: number; L: number; a: Chromatid; b?: Chromatid }
interface Cell {
  cx: number; cy: number; rx: number; ry: number
  nucleus?: 'solid' | 'fading'; nr?: number
  chromatin?: boolean
  chroms?: Chrom[]
  poles?: [number, number][]
}
interface Stage { en: string; bm: string; ten: string; tbm: string; cells: Cell[]; pinch?: boolean }

const d = (x: number, y: number, L: number, a: Chromatid, b: Chromatid): Chrom => ({ x, y, L, a, b })
const s = (x: number, y: number, L: number, a: Chromatid): Chrom => ({ x, y, L, a })
const one: Omit<Cell, 'chroms'> = { cx: 160, cy: 100, rx: 130, ry: 85 }
const poles: [number, number][] = [[40, 100], [280, 100]]

const MITOSIS: Stage[] = [
  { en: 'Interphase', bm: 'Interfasa', cells: [{ ...one, nucleus: 'solid', nr: 50, chromatin: true }],
    ten: 'The longest stage. The cell grows, makes new organelles and copies its DNA (S phase), so each chromosome will have two sister chromatids. Chromosomes are long thin chromatin threads.',
    tbm: 'Peringkat paling lama. Sel membesar, menghasilkan organel baharu dan menyalin DNA (fasa S), maka setiap kromosom akan mempunyai dua kromatid kembar. Kromosom wujud sebagai benang kromatin yang panjang dan halus.' },
  { en: 'Prophase', bm: 'Profasa', cells: [{ ...one, nucleus: 'fading', nr: 55, poles,
      chroms: [d(125, 80, LONG, [R], [R]), d(195, 85, LONG, [B], [B]), d(140, 125, SHORT, [R], [R]), d(185, 125, SHORT, [B], [B])] }],
    ten: 'Chromatin condenses into visible chromosomes, each made of two sister chromatids joined at a centromere. The nucleolus and nuclear membrane disappear; centrioles move to opposite poles and spindle fibres form.',
    tbm: 'Kromatin memendek dan menebal menjadi kromosom yang kelihatan, setiap satu terdiri daripada dua kromatid kembar yang bercantum pada sentromer. Nukleolus dan membran nukleus hilang; sentriol bergerak ke kutub bertentangan dan gentian gelendong terbentuk.' },
  { en: 'Metaphase', bm: 'Metafasa', cells: [{ ...one, poles,
      chroms: [d(160, 45, LONG, [R], [R]), d(160, 82, LONG, [B], [B]), d(160, 116, SHORT, [R], [R]), d(160, 146, SHORT, [B], [B])] }],
    ten: 'Chromosomes line up in a single row on the metaphase plate (the equator). Spindle fibres from each pole attach to the centromeres.',
    tbm: 'Kromosom tersusun dalam satu baris di plat metafasa (khatulistiwa). Gentian gelendong dari setiap kutub bercantum pada sentromer.' },
  { en: 'Anaphase', bm: 'Anafasa', cells: [{ ...one, poles,
      chroms: [s(95, 45, LONG, [R]), s(95, 82, LONG, [B]), s(95, 116, SHORT, [R]), s(95, 146, SHORT, [B]),
        s(225, 45, LONG, [R]), s(225, 82, LONG, [B]), s(225, 116, SHORT, [R]), s(225, 146, SHORT, [B])] }],
    ten: 'Centromeres split. Spindle fibres shorten and pull the sister chromatids apart to opposite poles. Each chromatid is now a chromosome.',
    tbm: 'Sentromer terpisah. Gentian gelendong memendek dan menarik kromatid kembar ke kutub bertentangan. Setiap kromatid kini menjadi kromosom.' },
  { en: 'Telophase', bm: 'Telofasa', pinch: true, cells: [
      { cx: 95, cy: 100, rx: 90, ry: 80, nucleus: 'solid', nr: 42, chroms: [s(80, 70, LONG, [R]), s(110, 70, LONG, [B]), s(80, 125, SHORT, [R]), s(110, 125, SHORT, [B])] },
      { cx: 225, cy: 100, rx: 90, ry: 80, nucleus: 'solid', nr: 42, chroms: [s(210, 70, LONG, [R]), s(240, 70, LONG, [B]), s(210, 125, SHORT, [R]), s(240, 125, SHORT, [B])] }],
    ten: 'Chromosomes reach the poles and uncoil. A new nuclear membrane and nucleolus form around each set. Cytokinesis usually begins.',
    tbm: 'Kromosom tiba di kutub dan memanjang semula. Membran nukleus dan nukleolus baharu terbentuk di sekeliling setiap set. Sitokinesis biasanya bermula.' },
  { en: 'Cytokinesis', bm: 'Sitokinesis', cells: [
      { cx: 82, cy: 100, rx: 72, ry: 66, nucleus: 'solid', nr: 32, chromatin: true },
      { cx: 238, cy: 100, rx: 72, ry: 66, nucleus: 'solid', nr: 32, chromatin: true }],
    ten: 'The cytoplasm divides: a cleavage furrow in animal cells, a cell plate in plant cells. Result: two daughter cells, each diploid (2n = 4) and genetically identical to the parent.',
    tbm: 'Sitoplasma membahagi: alur pembelahan dalam sel haiwan, plat sel dalam sel tumbuhan. Hasil: dua sel anak, setiap satu diploid (2n = 4) dan seiras secara genetik dengan sel induk.' },
]

const lp: [number, number][] = [[20, 100], [145, 100]], rp: [number, number][] = [[175, 100], [300, 100]]
const halves = (left: Omit<Cell, 'cx' | 'rx' | 'ry' | 'cy'>, right: Omit<Cell, 'cx' | 'rx' | 'ry' | 'cy'>): Cell[] => [
  { cx: 82, cy: 100, rx: 72, ry: 70, ...left }, { cx: 238, cy: 100, rx: 72, ry: 70, ...right }]

const MEIOSIS: Stage[] = [
  { en: 'Prophase I', bm: 'Profasa I', cells: [{ ...one, nucleus: 'fading', nr: 60,
      chroms: [d(140, 80, LONG, [R], [R, B]), d(156, 80, LONG, [B, R], [B]), d(170, 128, SHORT, [R], [R, B]), d(186, 128, SHORT, [B, R], [B])] }],
    ten: 'After DNA is copied, homologous chromosomes pair up (synapsis) to form bivalents. Non-sister chromatids exchange segments at chiasmata — crossing over — creating new combinations of genes.',
    tbm: 'Selepas DNA disalin, kromosom homolog berpasangan (sinapsis) membentuk bivalen. Kromatid bukan kembar bertukar segmen di kiasma — pindah silang — menghasilkan kombinasi gen baharu.' },
  { en: 'Metaphase I', bm: 'Metafasa I', cells: [{ ...one, poles,
      chroms: [d(148, 70, LONG, [R], [R, B]), d(172, 70, LONG, [B, R], [B]), d(148, 130, SHORT, [B, R], [B]), d(172, 130, SHORT, [R], [R, B])] }],
    ten: 'Homologous pairs line up side by side on the metaphase plate. Which side each pair faces is random — independent assortment.',
    tbm: 'Pasangan kromosom homolog tersusun bersebelahan di plat metafasa. Arah setiap pasangan adalah rawak — penyusunan bebas.' },
  { en: 'Anaphase I', bm: 'Anafasa I', cells: [{ ...one, poles,
      chroms: [d(90, 70, LONG, [R], [R, B]), d(90, 130, SHORT, [B, R], [B]), d(230, 70, LONG, [B, R], [B]), d(230, 130, SHORT, [R], [R, B])] }],
    ten: 'Homologous chromosomes are pulled to opposite poles. Sister chromatids stay joined at their centromeres.',
    tbm: 'Kromosom homolog ditarik ke kutub bertentangan. Kromatid kembar masih bercantum pada sentromer.' },
  { en: 'Telophase I', bm: 'Telofasa I', cells: halves(
      { nucleus: 'solid', nr: 40, chroms: [d(70, 85, LONG, [R], [R, B]), d(96, 115, SHORT, [B, R], [B])] },
      { nucleus: 'solid', nr: 40, chroms: [d(226, 85, LONG, [B, R], [B]), d(252, 115, SHORT, [R], [R, B])] }),
    ten: 'Nuclei re-form and the cytoplasm divides. Two cells, each haploid (n = 2): one chromosome from each pair, still as two chromatids.',
    tbm: 'Nukleus terbentuk semula dan sitoplasma membahagi. Dua sel, setiap satu haploid (n = 2): satu kromosom daripada setiap pasangan, masih dua kromatid.' },
  { en: 'Metaphase II', bm: 'Metafasa II', cells: halves(
      { poles: lp, chroms: [d(82, 70, LONG, [R], [R, B]), d(82, 125, SHORT, [B, R], [B])] },
      { poles: rp, chroms: [d(238, 70, LONG, [B, R], [B]), d(238, 125, SHORT, [R], [R, B])] }),
    ten: 'In Prophase II new spindles form (no DNA copying in between). In Metaphase II the chromosomes line up singly on the metaphase plate of each cell.',
    tbm: 'Dalam Profasa II gelendong baharu terbentuk (tiada penyalinan DNA di antara). Dalam Metafasa II kromosom tersusun satu-satu di plat metafasa setiap sel.' },
  { en: 'Anaphase II', bm: 'Anafasa II', cells: halves(
      { poles: lp, chroms: [s(50, 70, LONG, [R]), s(50, 125, SHORT, [B, R]), s(114, 70, LONG, [R, B]), s(114, 125, SHORT, [B])] },
      { poles: rp, chroms: [s(206, 70, LONG, [B, R]), s(206, 125, SHORT, [R]), s(270, 70, LONG, [B]), s(270, 125, SHORT, [R, B])] }),
    ten: 'Centromeres split and sister chromatids are pulled to opposite poles of each cell.',
    tbm: 'Sentromer terpisah dan kromatid kembar ditarik ke kutub bertentangan dalam setiap sel.' },
  { en: 'Telophase II', bm: 'Telofasa II', cells: [
      { cx: 50, cy: 100, rx: 38, ry: 46, nucleus: 'solid', nr: 26, chroms: [s(40, 100, LONG, [R]), s(60, 100, SHORT, [B, R])] },
      { cx: 130, cy: 100, rx: 38, ry: 46, nucleus: 'solid', nr: 26, chroms: [s(120, 100, LONG, [R, B]), s(140, 100, SHORT, [B])] },
      { cx: 190, cy: 100, rx: 38, ry: 46, nucleus: 'solid', nr: 26, chroms: [s(180, 100, LONG, [B, R]), s(200, 100, SHORT, [R])] },
      { cx: 270, cy: 100, rx: 38, ry: 46, nucleus: 'solid', nr: 26, chroms: [s(260, 100, LONG, [B]), s(280, 100, SHORT, [R, B])] }],
    ten: 'Four haploid daughter cells (n = 2). Crossing over and independent assortment make every one genetically different — the source of variation. In humans these become gametes.',
    tbm: 'Empat sel anak haploid (n = 2). Pindah silang dan penyusunan bebas menjadikan setiap satu berbeza secara genetik — punca variasi. Pada manusia sel ini menjadi gamet.' },
]

function Chromatid({ x, y, L, c: [col, tip] }: { x: number; y: number; L: number; c: Chromatid }) {
  return (
    <g>
      <rect x={x - 2.5} y={y - L / 2} width={5} height={L} rx={2.5} fill={col} />
      {tip && <rect x={x - 2.5} y={y + L / 2 - L * 0.35} width={5} height={L * 0.35} rx={2.5} fill={tip} />}
    </g>
  )
}

function Drawing({ stage }: { stage: Stage }) {
  const chromatin = (c: Cell) => [R, B, R, B].map((col, i) => {
    const r = (c.nr ?? 30) * 0.55, a = (i * Math.PI) / 2
    const x0 = c.cx + Math.cos(a) * r * 0.4, y0 = c.cy + Math.sin(a) * r * 0.4
    return <path key={i} d={`M${x0 - r * 0.6} ${y0} q ${r * 0.3} ${-r * 0.5} ${r * 0.6} 0 t ${r * 0.6} 0`} stroke={col} strokeWidth={1.5} fill="none" />
  })
  return (
    <svg viewBox="0 0 320 200" className="w-full rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" role="img" aria-label={stage.en}>
      {/* outlines first, then fills, so touching cells (telophase) read as one pinched cell */}
      {stage.cells.map((c, i) => <ellipse key={`o${i}`} cx={c.cx} cy={c.cy} rx={c.rx} ry={c.ry} fill="none" stroke="#64748b" strokeWidth={stage.pinch ? 4 : 2.5} />)}
      {stage.cells.map((c, i) => <ellipse key={`f${i}`} cx={c.cx} cy={c.cy} rx={c.rx - (stage.pinch ? 1.5 : 1)} ry={c.ry - (stage.pinch ? 1.5 : 1)} fill="#fef9c3" className="dark:fill-slate-800" />)}
      {stage.cells.map((c, i) => (
        <g key={i}>
          {c.nucleus && <circle cx={c.cx} cy={c.cy} r={c.nr} fill={c.nucleus === 'solid' ? '#ede9fe' : 'none'} stroke="#7c3aed" strokeWidth={1.5} strokeDasharray={c.nucleus === 'fading' ? '5 5' : undefined} className={c.nucleus === 'solid' ? 'dark:fill-violet-950' : ''} />}
          {c.chromatin && chromatin(c)}
          {c.poles?.map(([px, py], j) => (
            <g key={j}>
              {(c.chroms ?? []).map((ch, k) => <line key={k} x1={px} y1={py} x2={ch.x} y2={ch.y} stroke="#94a3b8" strokeWidth={0.8} />)}
              <rect x={px - 4} y={py - 4} width={8} height={8} fill="#0f766e" transform={`rotate(45 ${px} ${py})`} />
            </g>
          ))}
          {c.chroms?.map((ch, k) => ch.b ? (
            <g key={k}>
              <Chromatid x={ch.x - 3} y={ch.y} L={ch.L} c={ch.a} />
              <Chromatid x={ch.x + 3} y={ch.y} L={ch.L} c={ch.b} />
              <circle cx={ch.x} cy={ch.y} r={3} fill="#0f172a" />
            </g>
          ) : <Chromatid key={k} x={ch.x} y={ch.y} L={ch.L} c={ch.a} />)}
        </g>
      ))}
    </svg>
  )
}

export default function CellDivision() {
  const { t } = useTr()
  const [kind, setKind] = useState<'mitosis' | 'meiosis'>('mitosis')
  const [i, setI] = useState(0)
  const stages = kind === 'mitosis' ? MITOSIS : MEIOSIS
  const stage = stages[Math.min(i, stages.length - 1)]
  const at = Math.min(i, stages.length - 1)

  return (
    <div className="space-y-3">
      <Tabs value={kind} onChange={(k) => { setKind(k); setI(0) }} items={[{ k: 'mitosis', label: t('Mitosis', 'Mitosis') }, { k: 'meiosis', label: t('Meiosis', 'Meiosis') }]} />
      <div className="flex gap-1 overflow-x-auto">
        {stages.map((st, j) => (
          <button key={st.en} onClick={() => setI(j)}
            className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${j === at ? 'bg-violet-700 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
            {j + 1}. {t(st.en, st.bm)}
          </button>
        ))}
      </div>
      <Drawing stage={stage} />
      <section className="card">
        <h3 className="font-bold">{at + 1}. {t(stage.en, stage.bm)}</h3>
        <p className="mt-1 text-sm">{t(stage.ten, stage.tbm)}</p>
      </section>
      <div className="flex gap-2">
        <button className="btn-secondary flex-1" disabled={at === 0} onClick={() => setI(at - 1)}>← {t('Back', 'Kembali')}</button>
        <button className="btn-primary flex-1" disabled={at === stages.length - 1} onClick={() => setI(at + 1)}>{t('Next', 'Seterusnya')} →</button>
      </div>
      <p className="text-xs muted">
        <span className="font-bold text-red-500">■</span> {t('from the mother', 'daripada ibu')} · <span className="font-bold text-blue-500">■</span> {t('from the father', 'daripada bapa')} · {t('long and short = two homologous pairs (2n = 4). Mixed colours show crossing over.', 'panjang dan pendek = dua pasangan homolog (2n = 4). Warna bercampur menunjukkan pindah silang.')}
      </p>
      <section className="card text-sm">
        <h3 className="mb-1 font-bold">{t('Mitosis vs meiosis', 'Mitosis lwn meiosis')}</h3>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 text-xs muted dark:border-slate-700"><th /><th className="py-1">Mitosis</th><th className="py-1">Meiosis</th></tr>
          </thead>
          <tbody>
            {[
              [t('Divisions', 'Pembahagian'), '1', '2'],
              [t('Daughter cells', 'Sel anak'), '2', '4'],
              [t('Chromosome number', 'Bilangan kromosom'), t('Diploid (2n), same as parent', 'Diploid (2n), sama dengan induk'), t('Haploid (n), half', 'Haploid (n), separuh')],
              [t('Crossing over', 'Pindah silang'), t('No', 'Tidak'), t('Yes (Prophase I)', 'Ya (Profasa I)')],
              [t('Genetically', 'Secara genetik'), t('Identical', 'Seiras'), t('Different', 'Berbeza')],
              [t('Where', 'Di mana'), t('Somatic cells: growth, repair', 'Sel soma: pertumbuhan, pembaikan'), t('Reproductive organs: gametes', 'Organ pembiakan: gamet')],
            ].map(([a, m, me]) => (
              <tr key={a} className="border-b border-slate-100 align-top dark:border-slate-800">
                <th className="py-1 pr-2 font-semibold">{a}</th><td className="py-1 pr-2">{m}</td><td className="py-1">{me}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
