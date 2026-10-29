import { describe, expect, it } from 'vitest'
import { formulaMass, parseFormula } from './chemFormula'

describe('parseFormula', () => {
  it('counts atoms in simple and bracketed formulas', () => {
    expect(parseFormula('H2O')).toEqual({ H: 2, O: 1 })
    expect(parseFormula('Ca(OH)2')).toEqual({ Ca: 1, O: 2, H: 2 })
    expect(parseFormula('Al2(SO4)3')).toEqual({ Al: 2, S: 3, O: 12 })
  })
  it('handles water of crystallisation', () => {
    expect(parseFormula('CuSO4.5H2O')).toEqual({ Cu: 1, S: 1, O: 9, H: 10 })
    expect(parseFormula('CuSO4·5H2O')).toEqual(parseFormula('CuSO4.5H2O'))
  })
  it('rejects bad input', () => {
    expect(() => parseFormula('h2o')).toThrow()
    expect(() => parseFormula('Ca(OH2')).toThrow()
    expect(() => parseFormula('Xy2')).toThrow()
  })
})

describe('formulaMass (SPM relative atomic masses)', () => {
  it.each([
    ['H2O', 18], ['CO2', 44], ['NaCl', 58.5], ['CaCO3', 100], ['H2SO4', 98], ['CuSO4.5H2O', 250], ['Mg(NO3)2', 148],
  ])('%s = %d', (f, mr) => expect(formulaMass(parseFormula(f))).toBeCloseTo(mr, 6))
})
