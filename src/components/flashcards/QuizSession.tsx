import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import type { Flashcard } from '../../content/schema'
import { useT } from '../../i18n/useT'
import { ProgressBar } from '../ui'
import { colorOfCard, distractors, type Result, shuffle } from './deck'

interface Props {
  deck: Flashcard[]
  pool: Flashcard[]
  onGrade: (card: Flashcard, correct: boolean) => Promise<void> | void
  onFinish: (results: Result[]) => void
}

/** Quick quiz: see the term, pick the right meaning from four. Wrong answers come from nearby cards. */
export default function QuizSession({ deck, pool, onGrade, onFinish }: Props) {
  const { t, L, L2, lang } = useT()
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [results, setResults] = useState<Result[]>([])
  const [combo, setCombo] = useState(0)
  const card = deck[i]
  const color = colorOfCard(card)
  const options = useMemo(() => shuffle([card, ...distractors(card, pool, lang)]), [card, pool, lang])

  const choose = async (opt: Flashcard) => {
    if (picked) return
    const correct = opt.id === card.id
    setPicked(opt.id)
    setCombo((c) => (correct ? c + 1 : 0))
    await onGrade(card, correct)
    setResults((r) => [...r, { card, correct }])
  }
  const next = () => {
    const done = results
    setPicked(null)
    if (i + 1 >= deck.length) onFinish(done)
    else setI(i + 1)
  }
  const wasRight = picked === card.id

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ProgressBar value={i / deck.length} color={color} />
        <span className="shrink-0 text-xs font-semibold tabular-nums muted">{i + 1}/{deck.length}</span>
      </div>
      <motion.div key={card.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border-2 bg-white p-6 text-center dark:bg-slate-900" style={{ borderColor: color }}>
        <div className="text-[11px] font-semibold uppercase tracking-wide muted">{t('flash.chooseAnswer')}</div>
        <div className="mt-2 text-2xl font-bold">{L(card.front)}</div>
        <div className="text-sm muted">{L2(card.front)}</div>
        {combo >= 3 && <div className="mt-2 text-sm font-semibold">🔥 {combo} {t('flash.combo')}</div>}
      </motion.div>
      <div className="space-y-2">
        {options.map((o) => {
          const isAnswer = o.id === card.id
          const state = !picked ? '' : isAnswer ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30' : o.id === picked ? 'border-red-500 bg-red-50 dark:bg-red-900/30' : 'opacity-60'
          return (
            <button key={o.id} disabled={!!picked} onClick={() => choose(o)}
              className={`card w-full !py-3 text-left text-sm transition ${state}`}>
              <span className="font-medium">{L(o.back)}</span>
              {picked && isAnswer && <span className="ml-1">✅</span>}
              {picked && o.id === picked && !isAnswer && <span className="ml-1">❌</span>}
            </button>
          )
        })}
      </div>
      {picked && (
        <div className="space-y-2">
          <p className={`text-center text-sm font-semibold ${wasRight ? 'text-emerald-600' : 'text-red-600'}`}>{wasRight ? `🎉 ${t('flash.correct')}` : t('flash.wrong')}</p>
          {(card.example || card.tip) && (
            <div className="card space-y-1 !py-3 text-sm">
              {card.example && <div><b>📝 {t('flash.example')}:</b> {L(card.example)}</div>}
              {card.tip && <div><b>🧠 {t('flash.tip')}:</b> {L(card.tip)}</div>}
            </div>
          )}
          <button className="btn-primary w-full" onClick={next}>{t('flash.next')} →</button>
        </div>
      )}
    </div>
  )
}
