import { Link } from 'react-router-dom'
import type { Formula } from '../../content/schema'
import { TOOLS } from '../../content/toolIds'
import { useT } from '../../i18n/useT'
import Katex from './Katex'

export default function FormulaCard({ f, compact = false }: { f: Formula; compact?: boolean }) {
  const { L, L2, lang } = useT()
  const tool = TOOLS.find((x) => x.id === f.toolId && x.built)
  return (
    <div className="card">
      <div className="mb-1 text-sm font-semibold">{L(f.name)}</div>
      <div className="text-xs muted">{L2(f.name)}</div>
      <div className="my-3 rounded-xl bg-slate-50 px-2 py-3 text-center text-lg dark:bg-slate-800/60">
        <Katex tex={f.latex} block />
      </div>
      {!compact && (
        <>
          {f.symbols.length > 0 && (
            <dl className="mb-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              {f.symbols.map((s) => (
                <div key={s.symbol} className="contents">
                  <dt className="font-mono font-semibold">{s.symbol}</dt>
                  <dd>
                    {L(s.meaning)}
                    {s.unit && <span className="muted"> ({s.unit})</span>}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <p className="text-sm"><span className="font-semibold">{lang === 'en' ? 'When to use: ' : 'Bila digunakan: '}</span>{L(f.whenToUse)}</p>
          {f.commonMistake && (
            <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
              ⚠️ {L(f.commonMistake)}
            </p>
          )}
          {tool && (
            <Link to={`/practice/tools/${tool.id}`} className="btn-ghost mt-2 -ml-2">🧪 {L(tool.name)} →</Link>
          )}
        </>
      )}
    </div>
  )
}
