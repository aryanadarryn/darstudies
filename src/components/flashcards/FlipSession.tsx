import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { subjectById, subtopicById } from '../../content'
import type { Flashcard } from '../../content/schema'
import { useT } from '../../i18n/useT'
import { SUBJECT_EMOJI } from '../../pages/Learn'
import { ProgressBar } from '../ui'
import { autoHint, canSpeak, chapterOfCard, colorOfCard, type Result, speak } from './deck'

interface Props {
  deck: Flashcard[]
  reverse?: boolean
  box: (id: string) => number
  onGrade: (card: Flashcard, correct: boolean) => Promise<void> | void
  onFinish: (results: Result[]) => void
}

/** Classic flip cards (term → meaning) or reverse (meaning → term), graded by the learner. */
export default function FlipSession({ deck, reverse = false, box, onGrade, onFinish }: Props) {
  const { t, L, L2, lang } = useT()
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [hint, setHint] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const [combo, setCombo] = useState(0)
  const card = deck[i]
  const ch = chapterOfCard(card)
  const subject = ch ? subjectById[ch.subjectId] : undefined
  const sub = subtopicById[card.subtopicId]
  const color = colorOfCard(card)
  const ask = reverse ? card.back : card.front
  const answer = reverse ? card.front : card.back

  const grade = useCallback(async (correct: boolean) => {
    await onGrade(card, correct)
    const next = [...results, { card, correct }]
    setResults(next)
    setCombo((c) => (correct ? c + 1 : 0))
    setFlipped(false)
    setHint(false)
    if (i + 1 >= deck.length) onFinish(next)
    else setI(i + 1)
  }, [card, deck.length, i, onFinish, onGrade, results])

  // Desktop shortcuts: Space/Enter flip, → got it, ← not yet, H hint.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped((f) => !f) }
      else if (e.key === 'ArrowRight' && flipped) void grade(true)
      else if (e.key === 'ArrowLeft' && flipped) void grade(false)
      else if (e.key.toLowerCase() === 'h') setHint(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flipped, grade])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (!flipped) return
    if (info.offset.x > 110) void grade(true)
    else if (info.offset.x < -110) void grade(false)
  }

  const hintText = reverse ? autoHint(L(card.front)) : card.hint ? L(card.hint) : autoHint(L(card.back))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ProgressBar value={i / deck.length} color={color} />
        <span className="shrink-0 text-xs font-semibold tabular-nums muted">{i + 1}/{deck.length}</span>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs muted">
        <span className="truncate">{subject && `${SUBJECT_EMOJI[subject.id] ?? '📘'} ${L(subject.short ?? subject.name)} · ${ch!.number}. ${L(ch!.title)}`}</span>
        <span className="shrink-0">{combo >= 3 ? `🔥 ${combo} ${t('flash.combo')}` : `${t('flash.box')} ${box(card.id)}/5`}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={card.id} drag={flipped ? 'x' : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.6} onDragEnd={onDragEnd}
          initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
          <button type="button" onClick={() => setFlipped((f) => !f)} className="perspective block h-80 w-full" aria-label={t('flash.tapToFlip')}>
            <motion.div className="relative h-full w-full" style={{ transformStyle: 'preserve-3d' }} animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.45 }}>
              {/* Front */}
              <div className="backface-hidden absolute inset-0 flex flex-col rounded-3xl border-2 bg-white p-5 text-center shadow-sm dark:bg-slate-900" style={{ borderColor: color }}>
                {sub && <div className="mx-auto max-w-full truncate rounded-full px-3 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: `${color}1a`, color }}>{L(sub.title)}</div>}
                <div className="flex flex-1 flex-col items-center justify-center gap-2">
                  {reverse && <div className="text-[11px] font-semibold uppercase tracking-wide muted">{t('flash.whatTerm')}</div>}
                  <div className={`${reverse ? 'text-lg' : 'text-2xl'} font-bold leading-snug`}>{L(ask)}</div>
                  <div className="text-sm muted">{L2(ask)}</div>
                  {hint && hintText && <div className="mt-2 rounded-xl bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">💡 {hintText}</div>}
                </div>
                <div className="text-xs muted">{t('flash.tapToFlip')} ↻</div>
              </div>
              {/* Back */}
              <div className="backface-hidden absolute inset-0 flex flex-col overflow-y-auto rounded-3xl p-5 text-center text-white shadow-sm"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, transform: 'rotateY(180deg)' }}>
                <div className="flex flex-1 flex-col items-center justify-center gap-2">
                  <div className={`${reverse ? 'text-2xl' : 'text-lg'} font-bold leading-snug`}>{L(answer)}</div>
                  <div className="text-sm opacity-80">{L2(answer)}</div>
                </div>
                {(card.example || card.tip) && (
                  <div className="mt-3 space-y-1.5 text-left text-sm">
                    {card.example && <div className="rounded-xl bg-white/15 px-3 py-2"><b>📝 {t('flash.example')}:</b> {L(card.example)}</div>}
                    {card.tip && <div className="rounded-xl bg-white/15 px-3 py-2"><b>🧠 {t('flash.tip')}:</b> {L(card.tip)}</div>}
                  </div>
                )}
              </div>
            </motion.div>
          </button>
        </motion.div>
      </AnimatePresence>

      <div className="flex flex-wrap justify-center gap-2 text-sm">
        {!flipped && hintText && <button className="btn-ghost !min-h-9" onClick={() => setHint(true)} disabled={hint}>💡 {t('flash.hint')}</button>}
        {canSpeak() && <button className="btn-ghost !min-h-9" onClick={() => speak(L(flipped ? answer : ask), lang)}>🔊 {t('flash.listen')}</button>}
        {flipped && sub && ch && <Link className="btn-ghost !min-h-9" to={`/learn/${ch.subjectId}/${ch.id}/${sub.id}`}>📖 {t('flash.notes')}</Link>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button className="btn-secondary !min-h-14" disabled={!flipped} onClick={() => grade(false)}>🔁 {t('flash.notYet')}</button>
        <button className="btn-primary !min-h-14" disabled={!flipped} onClick={() => grade(true)}>✅ {t('flash.gotIt')}</button>
      </div>
      <p className="text-center text-xs muted desk:hidden">{t('flash.swipe')}</p>
      <p className="hidden text-center text-xs muted desk:block">{t('flash.keys')}</p>
    </div>
  )
}
