// Solves the equations of uniform linear motion for any unknowns, given at least three of u, v, a, s, t.
export type Var = 'u' | 'v' | 'a' | 's' | 't'
export type Known = Partial<Record<Var, number>>
export interface Step { solved: Var; equation: string; latex: string; value: number }

type Rule = { target: Var; needs: Var[]; equation: string; latex: string; f: (k: Record<Var, number>) => number | undefined }

const sqrtPos = (x: number) => (x >= 0 ? Math.sqrt(x) : undefined)
const div = (a: number, b: number) => (Math.abs(b) < 1e-12 ? undefined : a / b)

function positiveRoot(a: number, b: number, c: number) {
  // a t² + b t + c = 0, smallest positive root
  if (Math.abs(a) < 1e-12) return div(-c, b)
  const d = b * b - 4 * a * c
  if (d < 0) return undefined
  const roots = [(-b + Math.sqrt(d)) / (2 * a), (-b - Math.sqrt(d)) / (2 * a)].filter((r) => r > 1e-12).sort((x, y) => x - y)
  return roots[0]
}

const RULES: Rule[] = [
  { target: 'v', needs: ['u', 'a', 't'], equation: 'v = u + at', latex: 'v = u + at', f: (k) => k.u + k.a * k.t },
  { target: 'v', needs: ['u', 's', 't'], equation: 'v = 2s/t − u', latex: 'v = \\frac{2s}{t} - u', f: (k) => div(2 * k.s, k.t) !== undefined ? (2 * k.s) / k.t - k.u : undefined },
  { target: 'v', needs: ['u', 'a', 's'], equation: 'v = √(u² + 2as)', latex: 'v = \\sqrt{u^2 + 2as}', f: (k) => sqrtPos(k.u ** 2 + 2 * k.a * k.s) },
  { target: 'u', needs: ['v', 'a', 't'], equation: 'u = v − at', latex: 'u = v - at', f: (k) => k.v - k.a * k.t },
  { target: 'u', needs: ['v', 's', 't'], equation: 'u = 2s/t − v', latex: 'u = \\frac{2s}{t} - v', f: (k) => div(2 * k.s, k.t) !== undefined ? (2 * k.s) / k.t - k.v : undefined },
  { target: 'u', needs: ['s', 'a', 't'], equation: 'u = (s − ½at²)/t', latex: 'u = \\frac{s - \\frac12 at^2}{t}', f: (k) => div(k.s - 0.5 * k.a * k.t ** 2, k.t) },
  { target: 'u', needs: ['v', 'a', 's'], equation: 'u = √(v² − 2as)', latex: 'u = \\sqrt{v^2 - 2as}', f: (k) => sqrtPos(k.v ** 2 - 2 * k.a * k.s) },
  { target: 'a', needs: ['u', 'v', 't'], equation: 'a = (v − u)/t', latex: 'a = \\frac{v - u}{t}', f: (k) => div(k.v - k.u, k.t) },
  { target: 'a', needs: ['u', 'v', 's'], equation: 'a = (v² − u²)/2s', latex: 'a = \\frac{v^2 - u^2}{2s}', f: (k) => div(k.v ** 2 - k.u ** 2, 2 * k.s) },
  { target: 'a', needs: ['u', 's', 't'], equation: 'a = 2(s − ut)/t²', latex: 'a = \\frac{2(s - ut)}{t^2}', f: (k) => div(2 * (k.s - k.u * k.t), k.t ** 2) },
  { target: 'a', needs: ['v', 's', 't'], equation: 'a = 2(vt − s)/t²', latex: 'a = \\frac{2(vt - s)}{t^2}', f: (k) => div(2 * (k.v * k.t - k.s), k.t ** 2) },
  { target: 's', needs: ['u', 'v', 't'], equation: 's = ½(u + v)t', latex: 's = \\tfrac12(u + v)t', f: (k) => 0.5 * (k.u + k.v) * k.t },
  { target: 's', needs: ['u', 'a', 't'], equation: 's = ut + ½at²', latex: 's = ut + \\tfrac12 at^2', f: (k) => k.u * k.t + 0.5 * k.a * k.t ** 2 },
  { target: 's', needs: ['u', 'v', 'a'], equation: 's = (v² − u²)/2a', latex: 's = \\frac{v^2 - u^2}{2a}', f: (k) => div(k.v ** 2 - k.u ** 2, 2 * k.a) },
  { target: 's', needs: ['v', 'a', 't'], equation: 's = vt − ½at²', latex: 's = vt - \\tfrac12 at^2', f: (k) => k.v * k.t - 0.5 * k.a * k.t ** 2 },
  { target: 't', needs: ['u', 'v', 'a'], equation: 't = (v − u)/a', latex: 't = \\frac{v - u}{a}', f: (k) => div(k.v - k.u, k.a) },
  { target: 't', needs: ['u', 'v', 's'], equation: 't = 2s/(u + v)', latex: 't = \\frac{2s}{u + v}', f: (k) => div(2 * k.s, k.u + k.v) },
  { target: 't', needs: ['u', 'a', 's'], equation: 's = ut + ½at² (solve for t)', latex: '\\tfrac12 at^2 + ut - s = 0', f: (k) => positiveRoot(0.5 * k.a, k.u, -k.s) },
  { target: 't', needs: ['v', 'a', 's'], equation: 's = vt − ½at² (solve for t)', latex: '\\tfrac12 at^2 - vt + s = 0', f: (k) => positiveRoot(0.5 * k.a, -k.v, k.s) },
]

export function solveMotion(known: Known): { values: Known; steps: Step[]; error?: 'need3' | 'inconsistent' } {
  const given = Object.entries(known).filter(([, v]) => v !== undefined && Number.isFinite(v))
  if (given.length < 3) return { values: known, steps: [], error: 'need3' }
  const values: Known = Object.fromEntries(given)
  const steps: Step[] = []
  let progress = true
  while (progress) {
    progress = false
    for (const r of RULES) {
      if (values[r.target] !== undefined || !r.needs.every((n) => values[n] !== undefined)) continue
      const v = r.f(values as Record<Var, number>)
      if (v === undefined || !Number.isFinite(v)) continue
      values[r.target] = v
      steps.push({ solved: r.target, equation: r.equation, latex: r.latex, value: v })
      progress = true
    }
  }
  // With more than three inputs, check they agree with each other.
  if (given.length > 3) {
    const k = values as Record<Var, number>
    if ([k.u, k.v, k.a, k.s, k.t].every((x) => x !== undefined) && (Math.abs(k.v - (k.u + k.a * k.t)) > 1e-6 * Math.max(1, Math.abs(k.v)) || Math.abs(k.s - 0.5 * (k.u + k.v) * k.t) > 1e-6 * Math.max(1, Math.abs(k.s))))
      return { values, steps, error: 'inconsistent' }
  }
  return { values, steps }
}
