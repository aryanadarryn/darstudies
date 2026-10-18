import { useLiveQuery } from 'dexie-react-hooks'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Empty, PageHeader, ProgressBar } from '../components/ui'
import { chapterById, subjectById } from '../content'
import type { Flashcard } from '../content/schema'
import { db } from '../db/db'
import { useT } from '../i18n/useT'
import { completeMatching, gradeFlashcard } from '../lib/actions'
import { useFlashcards, useToday } from '../lib/hooks'
import { dueCards } from '../planner/leitner'

const SESSION_SIZE = 15

export default function Flashcards() {
  const { t, L, L2 } = useT()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const chapter = params.get('chapter'), taskId = params.get('task')
  const today = useToday()
  const all = useFlashcards()
  const states = useLiveQuery(() => db.cards.toArray(), [])
  const [deck, setDeck] = useState<Flashcard[] | null>(null)
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState(0)

  // Build the session once, when data is ready, so grading doesn't reshuffle it.
  useEffect(() => {
    if (deck || !all || !states) return
    const pool = chapter ? all.filter((c) => c.id.startsWith(chapter + '-')) : all
    setDeck(dueCards(pool, new Map(states.map((s) => [s.cardId, s])), today, SESSION_SIZE))
  }, [all, states, chapter, today, deck])

  const grade = async (correct: boolean) => {
    const card = deck![i]
    await gradeFlashcard(card.id, correct)
    if (correct) setKnown((k) => k + 1)
    setFlipped(false)
    const next = i + 1
    setI(next)
    if (next >= deck!.length) await completeMatching(taskId, 'flashcards')
  }

  const card = deck?.[i]
  const state = card && states?.find((s) => s.cardId === card.id)
  const ch = card ? chapterById[card.id.split('-').slice(0, 2).join('-')] : undefined
  const color = ch ? subjectById[ch.subjectId].color : '#6d28d9'

  return (
    <div className="desk:mx-auto desk:max-w-xl">
      <PageHeader back title={`🃏 ${t('flash.title')}`} subtitle={chapter && chapterById[chapter] ? L(chapterById[chapter].title) : undefined} />
      {!deck ? (
        <div className="py-10 text-center muted">{t('common.loading')}</div>
      ) : deck.length === 0 ? (
        <Empty icon="🎉">{t('flash.empty')}</Empty>
      ) : i >= deck.length ? (
        <div className="card space-y-3 text-center">
          <div className="text-5xl">🧠</div>
          <p className="text-lg font-bold">{deck.length} {t('flash.reviewed')}</p>
          <p className="muted">✅ {known} · 🔁 {deck.length - known}</p>
          <button className="btn-primary w-full" onClick={() => nav(-1)}>{t('common.done')}</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <ProgressBar value={i / deck.length} color={color} />
            <span className="shrink-0 text-xs font-semibold tabular-nums muted">{i + 1}/{deck.length}</span>
          </div>
          <div className="flex justify-between text-xs muted">
            <span>{ch && `${L(subjectById[ch.subjectId].name)} · ${ch.number}. ${L(ch.title)}`}</span>
            <span>{t('flash.box')} {state?.box ?? 0}/5</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.button
              key={card!.id} onClick={() => setFlipped((f) => !f)} className="perspective block h-72 w-full"
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} aria-label={t('flash.tapToFlip')}
            >
              <motion.div className="relative h-full w-full" style={{ transformStyle: 'preserve-3d' }} animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.45 }}>
                <div className="backface-hidden absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-3xl border-2 bg-white p-6 text-center dark:bg-slate-900" style={{ borderColor: color }}>
                  <div className="text-2xl font-bold">{L(card!.front)}</div>
                  <div className="text-sm muted">{L2(card!.front)}</div>
                  <div className="absolute bottom-4 text-xs muted">{t('flash.tapToFlip')} ↻</div>
                </div>
                <div className="backface-hidden absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-3xl p-6 text-center text-white" style={{ backgroundColor: color, transform: 'rotateY(180deg)' }}>
                  <div className="text-lg font-semibold">{L(card!.back)}</div>
                  <div className="text-sm opacity-80">{L2(card!.back)}</div>
                </div>
              </motion.div>
            </motion.button>
          </AnimatePresence>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-secondary !min-h-14" disabled={!flipped} onClick={() => grade(false)}>🔁 {t('flash.notYet')}</button>
            <button className="btn-primary !min-h-14" disabled={!flipped} onClick={() => grade(true)}>✅ {t('flash.gotIt')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
