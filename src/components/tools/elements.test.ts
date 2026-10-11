import { describe, expect, it } from 'vitest'
import { ELEMENTS, electronArrangement } from './elements'

describe('elements', () => {
  it('has all 118 elements in order', () => {
    expect(ELEMENTS).toHaveLength(118)
    expect(ELEMENTS.at(-1)!.symbol).toBe('Og')
  })

  it('places elements in the right group and period', () => {
    const at = (s: string) => ELEMENTS.find((e) => e.symbol === s)!
    expect(at('Na')).toMatchObject({ group: 1, period: 3, category: 'alkali' })
    expect(at('Al')).toMatchObject({ group: 13, period: 3 })
    expect(at('Fe')).toMatchObject({ group: 8, period: 4, category: 'transition' })
    expect(at('I')).toMatchObject({ group: 17, period: 5, category: 'halogen' })
    expect(at('Hf')).toMatchObject({ group: 4, period: 6 })
    expect(at('Rn')).toMatchObject({ group: 18, period: 6, category: 'noble' })
    expect(at('La')).toMatchObject({ fRow: 1, category: 'lanthanide' })
    expect(at('U')).toMatchObject({ fRow: 2, category: 'actinide' })
  })

  it('gives Form 4 electron arrangements', () => {
    expect(electronArrangement(19)).toBe('2.8.8.1')
    expect(electronArrangement(13)).toBe('2.8.3')
    expect(electronArrangement(2)).toBe('2')
    expect(electronArrangement(26)).toBeUndefined()
  })
})
