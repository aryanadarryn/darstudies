import type { Question } from '../content/schema'

/**
 * mcq → option index · multi → option indices · numeric/fill → typed text
 * match → for each left item, the index of the chosen right item · order → item indices in the chosen order
 */
export type QuizResponse = number | number[] | string

export const DEFAULT_TOLERANCE = 0.02

export function normalizeText(s: string) {
  return s
    .toLowerCase()
    .replace(/[−–—]/g, '-')
    .replace(/\s+/g, '')
    .replace(/[.。]+$/, '')
}

export function parseNumber(s: string): number | undefined {
  const cleaned = s.trim().replace(/[−–]/g, '-').replace(/\s/g, '').replace(/,(?=\d{3}(\D|$))/g, '').replace(',', '.')
  if (!/^-?\d*\.?\d+(e-?\d+)?$/i.test(cleaned)) return undefined
  return Number(cleaned)
}

export function withinTolerance(value: number, answer: number, tolerance = DEFAULT_TOLERANCE) {
  if (tolerance === 0) return Math.abs(value - answer) < 1e-9
  // Relative tolerance; for an answer of 0, treat it as absolute.
  const allowed = answer === 0 ? tolerance : Math.abs(answer) * tolerance
  return Math.abs(value - answer) <= allowed + 1e-12
}

const sameSet = (a: number[], b: number[]) => a.length === b.length && [...a].sort().every((x, i) => x === [...b].sort()[i])

export function checkAnswer(q: Question, r: QuizResponse): boolean {
  switch (q.type) {
    case 'mcq':
      return r === q.answer
    case 'multi':
      return Array.isArray(r) && sameSet(r, q.answer)
    case 'numeric': {
      const v = typeof r === 'string' ? parseNumber(r) : typeof r === 'number' ? r : undefined
      return v !== undefined && withinTolerance(v, q.answer, q.tolerance)
    }
    case 'fill':
      return typeof r === 'string' && q.answer.some((a) => normalizeText(a) === normalizeText(r))
    case 'match':
      return Array.isArray(r) && r.length === q.pairs.length && r.every((v, i) => v === i)
    case 'order':
      return Array.isArray(r) && r.length === q.items.length && r.every((v, i) => v === i)
  }
}

export function shuffle<T>(xs: T[], rand = Math.random): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Shuffle that never returns the original order (for order/match questions). */
export function shuffleIndices(n: number, rand = Math.random): number[] {
  const ids = Array.from({ length: n }, (_, i) => i)
  if (n < 2) return ids
  for (let tries = 0; tries < 10; tries++) {
    const s = shuffle(ids, rand)
    if (s.some((v, i) => v !== i)) return s
  }
  return [...ids.slice(1), ids[0]]
}
