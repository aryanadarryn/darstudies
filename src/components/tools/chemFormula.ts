// Chemical formula parser and relative formula mass, for the mole calculator.
import { ELEMENTS } from './elements'

// Relative atomic masses as printed in SPM papers; other elements fall back to the periodic table (1 d.p.).
const SPM_AR: Record<string, number> = {
  H: 1, He: 4, Li: 7, Be: 9, B: 11, C: 12, N: 14, O: 16, F: 19, Ne: 20, Na: 23, Mg: 24, Al: 27, Si: 28, P: 31, S: 32,
  Cl: 35.5, Ar: 40, K: 39, Ca: 40, Ti: 48, Cr: 52, Mn: 55, Fe: 56, Co: 59, Ni: 59, Cu: 64, Zn: 65, Br: 80, Ag: 108,
  Sn: 119, I: 127, Ba: 137, Pt: 195, Au: 197, Hg: 201, Pb: 207,
}

export function relativeAtomicMass(symbol: string): number | undefined {
  if (symbol in SPM_AR) return SPM_AR[symbol]
  const e = ELEMENTS.find((x) => x.symbol === symbol)
  const n = e ? Number(e.mass) : NaN
  return Number.isFinite(n) ? n : undefined
}

export type Counts = Record<string, number>

/** Parses formulas such as H2O, Ca(OH)2, CuSO4.5H2O or CuSO4·5H2O into atom counts. Throws on bad input. */
export function parseFormula(input: string): Counts {
  const s = input.replace(/\s+/g, '').replace(/[·*]/g, '.')
  if (!s) throw new Error('empty')
  const total: Counts = {}
  for (const part of s.split('.')) {
    const m = /^(\d*)(.+)$/.exec(part)
    if (!m) throw new Error('bad')
    const mult = m[1] ? Number(m[1]) : 1
    const counts = parseGroup(m[2])
    for (const [el, n] of Object.entries(counts)) total[el] = (total[el] ?? 0) + n * mult
  }
  return total
}

function parseGroup(s: string): Counts {
  let i = 0
  const readNum = () => {
    const m = /^\d+/.exec(s.slice(i))
    if (!m) return 1
    i += m[0].length
    return Number(m[0])
  }
  const group = (close?: string): Counts => {
    const counts: Counts = {}
    const add = (c: Counts, k: number) => { for (const [el, n] of Object.entries(c)) counts[el] = (counts[el] ?? 0) + n * k }
    while (i < s.length) {
      const ch = s[i]
      if (ch === '(' || ch === '[') {
        i++
        const inner = group(ch === '(' ? ')' : ']')
        add(inner, readNum())
      } else if (ch === ')' || ch === ']') {
        if (ch !== close) throw new Error('bracket')
        i++
        return counts
      } else {
        const m = /^[A-Z][a-z]?/.exec(s.slice(i))
        if (!m) throw new Error('symbol')
        if (relativeAtomicMass(m[0]) === undefined) throw new Error(`unknown ${m[0]}`)
        i += m[0].length
        add({ [m[0]]: 1 }, readNum())
      }
    }
    if (close) throw new Error('bracket')
    return counts
  }
  return group()
}

export function formulaMass(counts: Counts): number {
  return Object.entries(counts).reduce((sum, [el, n]) => sum + relativeAtomicMass(el)! * n, 0)
}
