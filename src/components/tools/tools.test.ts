import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TOOLS } from '../../content/toolIds'
import { buildJourney } from './MotionGraph'
import { lensImage } from './RayDiagram'
import { lineThrough } from './LinePlotter'
import { classify } from './PhScale'
import { standardForm } from './UnitConverter'

const MODULES = import.meta.glob<{ default: () => unknown }>('./*.tsx')
const FILE: Record<string, string> = {
  'motion-calc': 'MotionCalc', 'motion-graph': 'MotionGraph', 'heat-calc': 'HeatCalc', 'wave-visualiser': 'WaveViz',
  'ray-diagram': 'RayDiagram', 'periodic-table': 'PeriodicTable', 'mole-calc': 'MoleCalc', 'ph-scale': 'PhScale',
  'cell-explorer': 'CellExplorer', 'cell-division': 'CellDivision', 'graph-plotter': 'GraphPlotter', 'base-converter': 'BaseConverter',
  'venn-builder': 'VennBuilder', 'unit-converter': 'UnitConverter', 'reactivity-series': 'Reactivity', 'electricity-calc': 'ElectricityCalc',
  'energy-power': 'EnergyPower', 'half-life': 'HalfLife', 'savings-calc': 'Savings', 'trig-ratios': 'TrigRatios', 'line-plotter': 'LinePlotter',
}

describe('every built tool renders', () => {
  it.each(TOOLS.filter((t) => t.built).map((t) => t.id))('%s', async (id) => {
    const load = MODULES[`./${FILE[id]}.tsx`]
    expect(load, `component file for ${id}`).toBeDefined()
    const C = (await load()).default as () => null
    expect(renderToString(createElement(C)).length).toBeGreaterThan(100)
  })
})

describe('tool maths', () => {
  it('lens formula, real-is-positive', () => {
    expect(lensImage(30, 10).v).toBeCloseTo(15) // convex, u > 2f
    expect(lensImage(20, 10)).toEqual({ v: 20, m: 1 }) // u = 2f, same size
    expect(lensImage(5, 10).v).toBeCloseTo(-10) // magnifying glass: virtual
    expect(lensImage(30, -12).v).toBeCloseTo(-60 / 7) // concave: virtual
    expect(lensImage(10, 10).v).toBe(Infinity)
  })
  it('motion journey: area and distance', () => {
    const bus = buildJourney(0, [{ dt: 10, v: 15 }, { dt: 20, v: 15 }, { dt: 5, v: 0 }])
    expect(bus.pts.at(-1)!.s).toBeCloseTo(75 + 300 + 37.5)
    const ball = buildJourney(20, [{ dt: 4, v: -20 }])
    expect(ball.pts.at(-1)!.s).toBeCloseTo(0)
    expect(ball.distance).toBeCloseTo(40)
  })
  it('straight line through two points', () => {
    expect(lineThrough(-2, -1, 4, 5)).toEqual({ m: 1, c: 1 })
    expect(lineThrough(1, 1, 1, 5).m).toBeUndefined()
  })
  it('standard form', () => {
    expect(standardForm(150000000)).toEqual({ a: 1.5, n: 8 })
    expect(standardForm(0.0000456)).toEqual({ a: 4.56, n: -5 })
    expect(standardForm(9.99996)).toEqual({ a: 10 / 10, n: 1 })
  })
  it('pH classes', () => {
    expect(classify(7).en).toBe('Neutral')
    expect(classify(1).en).toBe('Strongly acidic')
    expect(classify(13).en).toBe('Strongly alkaline')
  })
})
