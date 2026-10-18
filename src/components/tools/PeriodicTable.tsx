// Tool #6 — interactive periodic table with Form 4 group/period highlights.
import { useState } from 'react'
import { useT } from '../../i18n/useT'
import { CATEGORY_INFO, ELEMENTS, electronArrangement, type Element } from './elements'

type Filter = 'all' | 'g1' | 'g17' | 'g18' | 'p3' | 'transition'

const FILTERS: { id: Filter; en: string; bm: string; match: (e: Element) => boolean; note?: { en: string; bm: string } }[] = [
  { id: 'all', en: 'All', bm: 'Semua', match: () => true },
  { id: 'g1', en: 'Group 1', bm: 'Kumpulan 1', match: (e) => e.group === 1 && e.z !== 1,
    note: { en: 'Soft metals, 1 valence electron. Reactivity increases down the group. React with water → alkali + H₂.', bm: 'Logam lembut, 1 elektron valens. Kereaktifan bertambah menuruni kumpulan. Bertindak balas dengan air → alkali + H₂.' } },
  { id: 'g17', en: 'Group 17', bm: 'Kumpulan 17', match: (e) => e.group === 17,
    note: { en: 'Diatomic non-metals, 7 valence electrons. Reactivity decreases down the group; colour darkens.', bm: 'Bukan logam dwiatom, 7 elektron valens. Kereaktifan berkurang menuruni kumpulan; warna semakin gelap.' } },
  { id: 'g18', en: 'Group 18', bm: 'Kumpulan 18', match: (e) => e.group === 18,
    note: { en: 'Monatomic, inert gases with a stable duplet/octet.', bm: 'Gas monoatom yang lengai dengan duplet/oktet stabil.' } },
  { id: 'p3', en: 'Period 3', bm: 'Kala 3', match: (e) => e.period === 3,
    note: { en: 'Na → Ar: atomic radius decreases, electronegativity increases; oxides go basic → amphoteric → acidic.', bm: 'Na → Ar: jejari atom berkurang, keelektronegatifan bertambah; oksida bes → amfoterik → asid.' } },
  { id: 'transition', en: 'Transition', bm: 'Peralihan', match: (e) => e.category === 'transition',
    note: { en: 'Coloured compounds, catalysts, several oxidation numbers, form complex ions.', bm: 'Sebatian berwarna, mangkin, beberapa nombor pengoksidaan, membentuk ion kompleks.' } },
]

const CELL = 36

export default function PeriodicTable() {
  const { lang } = useT()
  const [filter, setFilter] = useState<Filter>('all')
  const [sel, setSel] = useState<Element>(ELEMENTS[10]) // sodium
  const f = FILTERS.find((x) => x.id === filter)!

  const cell = (e: Element, col: number, row: number) => {
    const on = f.match(e)
    return (
      <button key={e.z} onClick={() => setSel(e)} aria-label={`${e.name}, ${e.z}`}
        className={`absolute flex flex-col items-center justify-center rounded-md text-slate-900 transition ${sel.z === e.z ? 'z-10 ring-2 ring-slate-900 dark:ring-white' : ''}`}
        style={{ left: col * CELL, top: row * CELL, width: CELL - 2, height: CELL - 2, backgroundColor: CATEGORY_INFO[e.category].color, opacity: on ? 1 : 0.18 }}>
        <span className="text-[8px] leading-none">{e.z}</span>
        <span className="text-[13px] font-bold leading-none">{e.symbol}</span>
      </button>
    )
  }

  const ea = electronArrangement(sel.z)
  const valence = ea ? Number(ea.split('.').at(-1)) : undefined
  const info = CATEGORY_INFO[sel.category]

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((x) => (
          <button key={x.id} onClick={() => setFilter(x.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${filter === x.id ? 'bg-violet-700 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
            {x[lang]}
          </button>
        ))}
      </div>
      {f.note && <p className="rounded-xl bg-violet-50 p-3 text-sm dark:bg-violet-950/40">{f.note[lang]}</p>}

      <div className="card flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl text-slate-900" style={{ backgroundColor: info.color }}>
          <span className="text-xs">{sel.z}</span>
          <span className="text-3xl font-bold leading-none">{sel.symbol}</span>
          <span className="text-[10px]">{sel.mass}</span>
        </div>
        <div className="min-w-0 text-sm">
          <div className="text-lg font-bold">{lang === 'bm' ? sel.bm ?? sel.name : sel.name}</div>
          {sel.bm && <div className="text-xs muted">{lang === 'bm' ? sel.name : sel.bm}</div>}
          <div>{info[lang]}</div>
          <div className="muted">
            {sel.group ? `${lang === 'en' ? 'Group' : 'Kumpulan'} ${sel.group} · ` : ''}{lang === 'en' ? 'Period' : 'Kala'} {sel.period}
          </div>
          {ea && <div>{lang === 'en' ? 'Electrons' : 'Susunan elektron'}: <strong>{ea}</strong> · {lang === 'en' ? 'valence' : 'valens'} {valence}</div>}
        </div>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <div className="relative" style={{ width: 18 * CELL, height: 10.6 * CELL }}>
          {Array.from({ length: 18 }, (_, g) => (
            <span key={g} className="absolute text-center text-[9px] muted" style={{ left: g * CELL, top: -2, width: CELL - 2 }}>{g + 1}</span>
          ))}
          {ELEMENTS.map((e) => {
            if (e.fRow) return cell(e, e.z - (e.fRow === 1 ? 57 : 89) + 3, 7.5 + e.fRow)
            return cell(e, e.group! - 1, e.period - 0.6)
          })}
          <span className="absolute flex items-center justify-center rounded-md border border-dashed border-slate-400 text-[8px] muted" style={{ left: 2 * CELL, top: 5.4 * CELL, width: CELL - 2, height: CELL - 2 }}>57–71</span>
          <span className="absolute flex items-center justify-center rounded-md border border-dashed border-slate-400 text-[8px] muted" style={{ left: 2 * CELL, top: 6.4 * CELL, width: CELL - 2, height: CELL - 2 }}>89–103</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
        {Object.values(CATEGORY_INFO).map((c) => (
          <span key={c.en} className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm" style={{ backgroundColor: c.color }} />{c[lang]}</span>
        ))}
      </div>
    </div>
  )
}
