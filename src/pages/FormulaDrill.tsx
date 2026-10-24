import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Katex from '../components/formula/Katex'
import { PageHeader, ProgressBar } from '../components/ui'
import { formulasOf } from '../content'
import type { Form } from '../content/ids'
import { useForm } from '../components/FormSwitch'
import type { Formula } from '../content/schema'
import { useT } from '../i18n/useT'
import { addDrillRounds, completeMatching } from '../lib/actions'
import { shuffle } from '../lib/quizCheck'

const ROUNDS = 8

interface Round { target: Formula; options: Formula[] }

function buildRounds(subject: string | null, form: Form): Round[] {
  const FORMULAS = formulasOf(form)
  const pool = subject ? FORMULAS.filter((f) => f.subtopicId.startsWith(subject + '-')) : FORMULAS
  return shuffle(pool).slice(0, ROUNDS).map((target) => {
    // Distractors from the same subject look alike, which makes the drill meaningful.
    const prefix = target.subtopicId.split('-')[0]
    const same = shuffle(FORMULAS.filter((f) => f.id !== target.id && f.subtopicId.startsWith(prefix)))
    const other = shuffle(FORMULAS.filter((f) => f.id !== target.id && !f.subtopicId.startsWith(prefix)))
    return { target, options: shuffle([target, ...[...same, ...other].slice(0, 3)]) }
  })
}

export default function FormulaDrill() {
  const { t, L } = useT()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [seed, setSeed] = useState(0)
  const form = useForm()
  const rounds = useMemo(() => buildRounds(params.get('subject'), form), [params, seed, form]) // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState(0)

  const r = rounds[i]
  const pick = (f: Formula) => {
    if (picked) return
    setPicked(f.id)
    if (f.id === r.target.id) setScore((s) => s + 1)
  }
  const next = async () => {
    setPicked(null)
    setI(i + 1)
    if (i + 1 >= rounds.length) {
      await addDrillRounds(rounds.length)
      await completeMatching(params.get('task'), 'formula-drill')
    }
  }

  return (
    <div className="desk:mx-auto desk:max-w-xl">
      <PageHeader back title={`∑ ${t('drill.title')}`} />
      {i >= rounds.length ? (
        <div className="card space-y-3 text-center">
          <div className="text-5xl">{score >= rounds.length * 0.8 ? '🏆' : '💪'}</div>
          <p className="text-lg font-bold">{t('drill.done')}: {score}/{rounds.length}</p>
          <div className="flex gap-2">
            <button className="btn-secondary flex-1" onClick={() => { setSeed(seed + 1); setI(0); setScore(0) }}>{t('quiz.again')}</button>
            <button className="btn-primary flex-1" onClick={() => nav(-1)}>{t('common.done')}</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <ProgressBar value={i / rounds.length} />
          <div className="card text-center">
            <p className="text-xs font-semibold muted">{t('drill.prompt')}</p>
            <p className="mt-1 text-lg font-bold">{L(r.target.name)}</p>
          </div>
          <div className="grid gap-2">
            {r.options.map((f) => {
              const state = !picked ? '' : f.id === r.target.id ? 'border-green-600 bg-green-50 dark:bg-green-950/40' : f.id === picked ? 'border-red-500 bg-red-50 dark:bg-red-950/40' : 'opacity-50'
              return (
                <button key={f.id} onClick={() => pick(f)} disabled={!!picked}
                  className={`min-h-16 overflow-x-auto rounded-xl border-2 border-slate-200 bg-white p-3 text-lg dark:border-slate-700 dark:bg-slate-900 ${state}`}>
                  <Katex tex={f.latex} />
                </button>
              )
            })}
          </div>
          {picked && (
            <>
              {r.target.commonMistake && <p className="rounded-xl bg-amber-50 p-3 text-sm dark:bg-amber-950/30">⚠️ {L(r.target.commonMistake)}</p>}
              <button className="btn-primary w-full" onClick={next}>{i + 1 < rounds.length ? t('common.next') : t('common.finish')}</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
