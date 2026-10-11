import { describe, expect, it } from 'vitest'
import { solveMotion } from './motionSolver'

describe('solveMotion', () => {
  it('solves the textbook braking example', () => {
    const { values, error } = solveMotion({ u: 20, v: 0, t: 4 })
    expect(error).toBeUndefined()
    expect(values.a).toBeCloseTo(-5)
    expect(values.s).toBeCloseTo(40)
  })

  it('finds time from s, u, a via the quadratic', () => {
    const { values } = solveMotion({ u: 10, a: 2, s: 56 })
    expect(values.t).toBeCloseTo(4)
    expect(values.v).toBeCloseTo(18)
  })

  it('needs at least three values', () => {
    expect(solveMotion({ u: 1, v: 2 }).error).toBe('need3')
  })

  it('flags inconsistent inputs', () => {
    expect(solveMotion({ u: 0, v: 10, a: 2, t: 3 }).error).toBe('inconsistent')
  })
})
