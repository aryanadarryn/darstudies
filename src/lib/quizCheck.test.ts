import { describe, expect, it } from 'vitest'
import { checkAnswer, parseNumber, withinTolerance, normalizeText, shuffleIndices } from './quizCheck'
import type { Question } from '../content/schema'

const L = (en: string) => ({ en, bm: en })
const base = { id: 'q', subtopicId: 's', prompt: L('p'), explanation: L('e'), difficulty: 1 as const }

describe('quiz checking', () => {
  it('numeric: accepts answers within relative tolerance', () => {
    const q: Question = { ...base, type: 'numeric', answer: 19.62, tolerance: 0.02, unit: 'm s⁻¹' }
    expect(checkAnswer(q, '19.6')).toBe(true)
    expect(checkAnswer(q, '20')).toBe(true) // within 2%
    expect(checkAnswer(q, '20.1')).toBe(false)
    expect(checkAnswer(q, 'abc')).toBe(false)
  })

  it('numeric: tolerance 0 is exact, default is 2%', () => {
    expect(withinTolerance(6, 6, 0)).toBe(true)
    expect(withinTolerance(6.01, 6, 0)).toBe(false)
    expect(withinTolerance(101.9, 100)).toBe(true)
    expect(withinTolerance(0.01, 0, 0.02)).toBe(true)
  })

  it('parses numbers with commas, spaces and unicode minus', () => {
    expect(parseNumber('30,000')).toBe(30000)
    expect(parseNumber('30 000')).toBe(30000)
    expect(parseNumber('−5')).toBe(-5)
    expect(parseNumber('2,5')).toBe(2.5)
    expect(parseNumber('.5')).toBe(0.5)
    expect(parseNumber('1e3')).toBe(1000)
    expect(parseNumber('')).toBeUndefined()
  })

  it('fill: case-insensitive, ignores spaces, accepts synonyms', () => {
    const q: Question = { ...base, type: 'fill', answer: ['chloroplast', 'kloroplas'] }
    expect(checkAnswer(q, 'Chloroplast')).toBe(true)
    expect(checkAnswer(q, ' kloroplas. ')).toBe(true)
    expect(checkAnswer(q, 'mitochondria')).toBe(false)
    expect(normalizeText('(x + 3)(x − 3)')).toBe('(x+3)(x-3)')
  })

  it('mcq, multi, match, order', () => {
    expect(checkAnswer({ ...base, type: 'mcq', options: [L('a'), L('b')], answer: 1 }, 1)).toBe(true)
    const multi: Question = { ...base, type: 'multi', options: [L('a'), L('b'), L('c')], answer: [0, 2] }
    expect(checkAnswer(multi, [2, 0])).toBe(true)
    expect(checkAnswer(multi, [0])).toBe(false)
    const match: Question = { ...base, type: 'match', pairs: [{ left: L('a'), right: L('1') }, { left: L('b'), right: L('2') }] }
    expect(checkAnswer(match, [0, 1])).toBe(true)
    expect(checkAnswer(match, [1, 0])).toBe(false)
    const order: Question = { ...base, type: 'order', items: [L('a'), L('b'), L('c')] }
    expect(checkAnswer(order, [0, 1, 2])).toBe(true)
    expect(checkAnswer(order, [1, 0, 2])).toBe(false)
  })

  it('shuffleIndices never returns the solved order', () => {
    for (let i = 0; i < 50; i++) {
      const s = shuffleIndices(3)
      expect(s.some((v, j) => v !== j)).toBe(true)
    }
  })
})
