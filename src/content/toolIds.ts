// Tool catalogue (plan §7.3). `built: false` tools show as "coming soon".
import type { Lang } from './schema'

export interface ToolInfo { id: string; name: Lang; chapters: string[]; built: boolean }

export const TOOLS: ToolInfo[] = [
  { id: 'motion-calc', name: { en: 'Linear motion calculator', bm: 'Kalkulator gerakan linear' }, chapters: ['phy-02'], built: true },
  { id: 'motion-graph', name: { en: 'Motion graph builder', bm: 'Pembina graf gerakan' }, chapters: ['phy-02', 'math-07'], built: false },
  { id: 'heat-calc', name: { en: 'Heat calculator', bm: 'Kalkulator haba' }, chapters: ['phy-04'], built: false },
  { id: 'wave-visualiser', name: { en: 'Wave visualiser', bm: 'Visualisasi gelombang' }, chapters: ['phy-05'], built: false },
  { id: 'ray-diagram', name: { en: 'Lens ray diagram', bm: 'Rajah sinar kanta' }, chapters: ['phy-06'], built: false },
  { id: 'periodic-table', name: { en: 'Interactive Periodic Table', bm: 'Jadual Berkala interaktif' }, chapters: ['chem-04'], built: true },
  { id: 'mole-calc', name: { en: 'Mole calculator', bm: 'Kalkulator mol' }, chapters: ['chem-03'], built: false },
  { id: 'ph-scale', name: { en: 'pH scale slider', bm: 'Gelangsar skala pH' }, chapters: ['chem-06'], built: false },
  { id: 'cell-explorer', name: { en: 'Cell explorer', bm: 'Penjelajah sel' }, chapters: ['bio-02'], built: true },
  { id: 'cell-division', name: { en: 'Mitosis & meiosis stepper', bm: 'Langkah mitosis & meiosis' }, chapters: ['bio-06'], built: false },
  { id: 'graph-plotter', name: { en: 'Quadratic graph plotter', bm: 'Pemplot graf kuadratik' }, chapters: ['addmath-01', 'addmath-02', 'math-01'], built: true },
  { id: 'base-converter', name: { en: 'Number base converter', bm: 'Penukar asas nombor' }, chapters: ['math-02'], built: true },
  { id: 'venn-builder', name: { en: 'Venn diagram builder', bm: 'Pembina gambar rajah Venn' }, chapters: ['math-04'], built: false },
  { id: 'unit-converter', name: { en: 'Unit & prefix converter', bm: 'Penukar unit & imbuhan' }, chapters: ['phy-01'], built: false },
]

export const TOOL_IDS = TOOLS.map((t) => t.id)
