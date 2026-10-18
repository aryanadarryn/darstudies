import { AnimatePresence, motion } from 'framer-motion'
import { useRef, useState } from 'react'
import type { Question } from '../../content/schema'
import { useT } from '../../i18n/useT'
import { recordAttempt } from '../../lib/actions'
import { checkAnswer, shuffleIndices, type QuizResponse } from '../../lib/quizCheck'
import { ProgressBar } from '../ui'
import Fill from './Fill'
import Match from './Match'
import Mcq from './Mcq'
import Multi from './Multi'
import Numeric from './Numeric'
import Order from './Order'

const initialResponse = (q: Question): QuizResponse | undefined =>
  q.type === 'order' ? shuffleIndices(q.items.length) : q.type === 'match' ? Array<number>(q.pairs.length).fill(-1) : undefined

function isComplete(q: Question, r: QuizResponse | undefined) {
  if (r === undefined) return false
  if (q.type === 'match') return Array.isArray(r) && r.every((v) => v >= 0)
  if (q.type === 'multi') return Array.isArray(r) && r.length > 0
  if (typeof r === 'string') return r.trim().length > 0
  return true
}

function QuestionBody({ q, ...p }: { q: Question; value: QuizResponse | undefined; onChange: (v: QuizResponse) => void; submitted: boolean }) {
  switch (q.type) {
    case 'mcq': return <Mcq q={q} {...p} />
    case 'multi': return <Multi q={q} {...p} />
    case 'numeric': return <Numeric q={q} {...p} />
    case 'fill': return <Fill q={q} {...p} />
    case 'match': return <Match q={q} {...p} />
    case 'order': return <Order q={q} {...p} />
  }
}

export interface QuizResult { correct: number; total: number }

export default function QuizRunner({ questions, color = '#6d28d9', onFinish, onRestart, onDone }: {
  questions: Question[]
  color?: string
  onFinish?: (r: QuizResult) => void
  onRestart?: () => void
  onDone?: () => void
}) {
  const { t, L, L2, lang } = useT()
  const [idx, setIdx] = useState(0)
  const [response, setResponse] = useState<QuizResponse | undefined>(() => (questions[0] ? initialResponse(questions[0]) : undefined))
  const [submitted, setSubmitted] = useState(false)
  const [results, setResults] = useState<boolean[]>([])
  const [showOther, setShowOther] = useState(false)
  const started = useRef(Date.now())

  const q = questions[idx]
  const finished = idx >= questions.length

  const submit = async () => {
    const correct = checkAnswer(q, response!)
    setSubmitted(true)
    setResults((r) => [...r, correct])
    await recordAttempt(q, correct, Date.now() - started.current)
  }

  const next = () => {
    const n = idx + 1
    setIdx(n)
    setSubmitted(false)
    setShowOther(false)
    started.current = Date.now()
    if (n < questions.length) setResponse(initialResponse(questions[n]))
    else onFinish?.({ correct: results.filter(Boolean).length, total: questions.length })
  }

  if (finished) {
    const score = results.filter(Boolean).length
    const pct = questions.length ? score / questions.length : 0
    return (
      <div className="space-y-4">
        <div className="card text-center">
          <div className="text-5xl">{pct >= 0.8 ? '🏆' : pct >= 0.5 ? '👍' : '💪'}</div>
          <div className="mt-2 text-sm muted">{t('quiz.score')}</div>
          <div className="text-4xl font-bold" style={{ color }}>{score}/{questions.length}</div>
        </div>
        <ul className="card divide-y divide-slate-100 !p-0 dark:divide-slate-800">
          {questions.map((qq, i) => (
            <li key={qq.id} className="flex gap-2 p-3 text-sm">
              <span>{results[i] ? '✅' : '❌'}</span>
              <span className="line-clamp-2">{L(qq.prompt)}</span>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          {onRestart && <button className="btn-secondary flex-1" onClick={onRestart}>{t('quiz.again')}</button>}
          {onDone && <button className="btn-primary flex-1" onClick={onDone}>{t('common.done')}</button>}
        </div>
      </div>
    )
  }

  const correct = submitted && results[idx]
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 flex items-center justify-between text-xs font-semibold muted">
          <span>{t('quiz.question')} {idx + 1} {t('quiz.of')} {questions.length}</span>
          <span className="flex items-center gap-1">
            {q.tp && q.tp >= 5 && <span className="rounded bg-purple-100 px-1.5 py-0.5 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200">KBAT</span>}
            {q.tp && <span>TP{q.tp}</span>}
            <span aria-label={`Difficulty ${q.difficulty}`}>{'●'.repeat(q.difficulty)}{'○'.repeat(3 - q.difficulty)}</span>
          </span>
        </div>
        <ProgressBar value={(idx + (submitted ? 1 : 0)) / questions.length} color={color} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={q.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
          <div>
            <p className="text-base font-semibold leading-relaxed">{L(q.prompt)}</p>
            <button className="mt-1 text-xs font-semibold text-violet-700 dark:text-violet-300" onClick={() => setShowOther((s) => !s)}>
              {showOther ? '−' : '+'} {lang === 'en' ? 'BM' : 'EN'}
            </button>
            {showOther && <p className="mt-1 text-sm muted">{L2(q.prompt)}</p>}
          </div>
          <QuestionBody q={q} value={response} onChange={setResponse} submitted={submitted} />
        </motion.div>
      </AnimatePresence>

      {submitted && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl p-4 ${correct ? 'bg-green-50 dark:bg-green-950/40' : 'bg-red-50 dark:bg-red-950/40'}`} role="status">
          <div className="mb-1 font-bold">{correct ? `✅ ${t('quiz.correct')}` : `❌ ${t('quiz.wrong')}`}</div>
          <p className="text-sm">{L(q.explanation)}</p>
        </motion.div>
      )}

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 desk:bottom-4">
        {!submitted ? (
          <button className="btn-primary w-full shadow-lg" disabled={!isComplete(q, response)} onClick={submit}>{t('common.check')}</button>
        ) : (
          <button className="btn-primary w-full shadow-lg" onClick={next}>{idx + 1 < questions.length ? t('common.next') : t('common.finish')}</button>
        )}
      </div>
    </div>
  )
}
