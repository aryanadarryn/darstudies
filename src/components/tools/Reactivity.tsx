// Reactivity series of metals (Form 3 Science): how each metal reacts with oxygen, how it is extracted,
// and whether a metal (or carbon) can take the oxygen from another metal's oxide.
import { useState } from 'react'
import { Note, useTr } from './toolUi'

interface Item { s: string; en: string; bm: string; o2en: string; o2bm: string; color: string }
const SERIES: Item[] = [
  { s: 'K', en: 'Potassium', bm: 'Kalium', o2en: 'Burns very vigorously with a lilac flame', o2bm: 'Terbakar sangat cergas dengan nyalaan ungu', color: '#dc2626' },
  { s: 'Na', en: 'Sodium', bm: 'Natrium', o2en: 'Burns vigorously with a yellow flame', o2bm: 'Terbakar cergas dengan nyalaan kuning', color: '#ea580c' },
  { s: 'Ca', en: 'Calcium', bm: 'Kalsium', o2en: 'Burns brightly with a brick-red flame', o2bm: 'Terbakar terang dengan nyalaan merah bata', color: '#f97316' },
  { s: 'Mg', en: 'Magnesium', bm: 'Magnesium', o2en: 'Burns with a very bright white flame', o2bm: 'Terbakar dengan nyalaan putih yang sangat terang', color: '#f59e0b' },
  { s: 'Al', en: 'Aluminium', bm: 'Aluminium', o2en: 'Burns brightly (as a powder)', o2bm: 'Terbakar terang (dalam bentuk serbuk)', color: '#eab308' },
  { s: 'C', en: 'Carbon', bm: 'Karbon', o2en: 'Non-metal placed in the series for comparison', o2bm: 'Bukan logam yang diletakkan dalam siri untuk perbandingan', color: '#334155' },
  { s: 'Zn', en: 'Zinc', bm: 'Zink', o2en: 'Glows brightly', o2bm: 'Berbara terang', color: '#84cc16' },
  { s: 'Fe', en: 'Iron', bm: 'Ferum', o2en: 'Glows and gives off sparks', o2bm: 'Berbara dan memercikkan bunga api', color: '#22c55e' },
  { s: 'Sn', en: 'Tin', bm: 'Stanum', o2en: 'Glows dimly', o2bm: 'Berbara malap', color: '#14b8a6' },
  { s: 'Pb', en: 'Lead', bm: 'Plumbum', o2en: 'Glows dimly', o2bm: 'Berbara malap', color: '#0ea5e9' },
  { s: 'Cu', en: 'Copper', bm: 'Kuprum', o2en: 'Does not burn; the surface slowly turns black', o2bm: 'Tidak terbakar; permukaan perlahan-lahan menjadi hitam', color: '#6366f1' },
  { s: 'Ag', en: 'Silver', bm: 'Argentum', o2en: 'No reaction', o2bm: 'Tiada tindak balas', color: '#8b5cf6' },
  { s: 'Au', en: 'Gold', bm: 'Aurum', o2en: 'No reaction', o2bm: 'Tiada tindak balas', color: '#a855f7' },
]
const C_INDEX = SERIES.findIndex((x) => x.s === 'C')

export default function Reactivity() {
  const { t } = useTr()
  const [pick, setPick] = useState(3)
  const [x, setX] = useState(C_INDEX)
  const [y, setY] = useState(7)
  const m = SERIES[pick]
  const isCarbon = pick === C_INDEX

  const extraction = isCarbon ? '—'
    : pick < C_INDEX ? t('Electrolysis of the molten ore — it is more reactive than carbon, so carbon cannot remove its oxygen.', 'Elektrolisis bijih leburan — lebih reaktif daripada karbon, jadi karbon tidak dapat menyingkirkan oksigennya.')
    : pick >= SERIES.length - 2 ? t('Found as the free element (native metal) because it is so unreactive.', 'Dijumpai sebagai unsur bebas (logam asli) kerana sangat tidak reaktif.')
    : t('Heat the oxide ore with carbon (reduction), e.g. iron in a blast furnace, tin in a furnace.', 'Panaskan bijih oksida dengan karbon (penurunan), cth. besi dalam relau bagas, stanum dalam relau.')

  const oxideName = (i: number) => t(`${SERIES[i].en.toLowerCase()} oxide`, `oksida ${SERIES[i].bm.toLowerCase()}`)
  const reacts = x < y
  const productX = x === C_INDEX ? t('carbon dioxide', 'karbon dioksida') : oxideName(x)

  return (
    <div className="space-y-3">
      <p className="text-sm muted">{t('Most reactive at the top. Tap an element.', 'Paling reaktif di atas. Ketik satu unsur.')}</p>
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <div className="flex flex-col items-center">
          <span className="text-[10px] muted">{t('more', 'lebih')}</span>
          <div className="w-1.5 flex-1 rounded-full bg-gradient-to-b from-red-500 to-violet-500" />
          <span className="text-[10px] muted">{t('less', 'kurang')}</span>
        </div>
        <div className="grid grid-cols-1 gap-1">
          {SERIES.map((e, i) => (
            <button key={e.s} onClick={() => setPick(i)}
              className={`flex items-center gap-3 rounded-lg border-2 px-2 py-1 text-left text-sm ${pick === i ? 'border-violet-600 bg-violet-50 dark:bg-violet-950/40' : 'border-transparent bg-slate-50 dark:bg-slate-800/60'} ${i === C_INDEX ? 'border-dashed !border-slate-400' : ''}`}>
              <span className="w-8 rounded text-center font-mono font-bold text-white" style={{ background: e.color }}>{e.s}</span>
              <span className="flex-1">{t(e.en, e.bm)}</span>
            </button>
          ))}
        </div>
      </div>
      <section className="card space-y-1 text-sm">
        <h3 className="font-bold">{t(m.en, m.bm)}</h3>
        <p><span className="muted">{t('Heated in oxygen', 'Dipanaskan dalam oksigen')}:</span> {t(m.o2en, m.o2bm)}</p>
        {!isCarbon && <p><span className="muted">{t('Extraction', 'Pengekstrakan')}:</span> {extraction}</p>}
        {isCarbon && <p>{t('Carbon can remove oxygen from the oxides of metals below it (zinc and below).', 'Karbon boleh menyingkirkan oksigen daripada oksida logam di bawahnya (zink dan ke bawah).')}</p>}
      </section>

      <section className="card space-y-2 text-sm">
        <h3 className="font-bold">{t('Will it react when heated?', 'Adakah ia bertindak balas apabila dipanaskan?')}</h3>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <select className="input" value={x} onChange={(e) => setX(Number(e.target.value))} aria-label={t('Element', 'Unsur')}>
            {SERIES.slice(0, -1).map((e, i) => <option key={e.s} value={i}>{t(e.en, e.bm)}</option>)}
          </select>
          <span>+</span>
          <select className="input" value={y} onChange={(e) => setY(Number(e.target.value))} aria-label={t('Oxide', 'Oksida')}>
            {SERIES.map((e, i) => (i === C_INDEX || i === x ? null : <option key={e.s} value={i}>{oxideName(i)}</option>))}
          </select>
        </div>
        {x === y ? null : reacts ? (
          <Note tone="ok">
            ✅ {t('Reacts', 'Bertindak balas')}: {t(SERIES[x].en, SERIES[x].bm)} {t('is above', 'berada di atas')} {t(SERIES[y].en, SERIES[y].bm)}, {t('so it takes the oxygen.', 'jadi ia mengambil oksigen.')}
            <br /><strong>{t(SERIES[x].en, SERIES[x].bm)} + {oxideName(y)} → {productX} + {t(SERIES[y].en, SERIES[y].bm).toLowerCase()}</strong>
          </Note>
        ) : (
          <Note tone="warn">❌ {t('No reaction', 'Tiada tindak balas')}: {t(SERIES[x].en, SERIES[x].bm)} {t('is below', 'berada di bawah')} {t(SERIES[y].en, SERIES[y].bm)} {t('in the series.', 'dalam siri.')}</Note>
        )}
      </section>
    </div>
  )
}
