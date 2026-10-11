import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react'

// Heavy tools are lazy-loaded (plan §11 performance).
const TOOL_COMPONENTS: Record<string, LazyExoticComponent<ComponentType>> = {
  'motion-calc': lazy(() => import('./MotionCalc')),
  'periodic-table': lazy(() => import('./PeriodicTable')),
  'graph-plotter': lazy(() => import('./GraphPlotter')),
  'cell-explorer': lazy(() => import('./CellExplorer')),
  'base-converter': lazy(() => import('./BaseConverter')),
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
