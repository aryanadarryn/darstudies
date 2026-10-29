import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react'

// Heavy tools are lazy-loaded (plan §11 performance).
const TOOL_COMPONENTS: Record<string, LazyExoticComponent<ComponentType>> = {
  'motion-calc': lazy(() => import('./MotionCalc')),
  'motion-graph': lazy(() => import('./MotionGraph')),
  'heat-calc': lazy(() => import('./HeatCalc')),
  'wave-visualiser': lazy(() => import('./WaveViz')),
  'ray-diagram': lazy(() => import('./RayDiagram')),
  'periodic-table': lazy(() => import('./PeriodicTable')),
  'mole-calc': lazy(() => import('./MoleCalc')),
  'ph-scale': lazy(() => import('./PhScale')),
  'cell-explorer': lazy(() => import('./CellExplorer')),
  'cell-division': lazy(() => import('./CellDivision')),
  'graph-plotter': lazy(() => import('./GraphPlotter')),
  'base-converter': lazy(() => import('./BaseConverter')),
  'venn-builder': lazy(() => import('./VennBuilder')),
  'unit-converter': lazy(() => import('./UnitConverter')),
  'reactivity-series': lazy(() => import('./Reactivity')),
  'electricity-calc': lazy(() => import('./ElectricityCalc')),
  'energy-power': lazy(() => import('./EnergyPower')),
  'half-life': lazy(() => import('./HalfLife')),
  'savings-calc': lazy(() => import('./Savings')),
  'trig-ratios': lazy(() => import('./TrigRatios')),
  'line-plotter': lazy(() => import('./LinePlotter')),
}

export const hasToolComponent = (id: string) => id in TOOL_COMPONENTS

export function ToolEmbed({ id }: { id: string }) {
  const C = TOOL_COMPONENTS[id]
  if (!C) return null
  return (
    <Suspense fallback={<div className="py-10 text-center muted">…</div>}>
      <C />
    </Suspense>
  )
}
