import { motion } from 'framer-motion'
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import FormulaCard from '../components/formula/FormulaCard'
import { DraftBadge, MasteryRing, PageHeader } from '../components/ui'
import { chapterById, FORMULAS, loadChapterContent, loadNotes, subjectById, subtopicById } from '../content'
import { useT } from '../i18n/useT'
import { useAsync, useFlashcards, useMastery } from '../lib/hooks'
import { useCan } from '../auth/account'
import { LockedPanel } from '../auth/Locked'

function FlipRow({ front, back }: { front: string; back: string }) {
  const [open, setOpen] = useState(false)
  return (
    <button onClick={() => setOpen(!open)} className="w-full rounded-xl border border-slate-200 p-3 text-left text-sm dark:border-slate-700">
      <span className="font-semibold">{front}</span>
      {open ? <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 block text-violet-800 dark:text-violet-200">{back}</motion.span>
        : <span className="ml-2 text-xs muted">↻</span>}
    </button>
  )
}

function SubtopicView() {
  const { subjectId, chapterId = '', subtopicId = '' } = useParams()
  const { t, L, L2 } = useT()
  const [showAnswer, setShowAnswer] = useState(false)
  const mastery = useMastery()
  const flashcards = useFlashcards()
  const can = useCan()
  const allowed = can('learn', subtopicById[subtopicId]?.subjectId)
  const { data } = useAsync(async () => {
    if (!allowed) return undefined
    const [notes, content] = await Promise.all([loadNotes(chapterId), loadChapterContent(chapterId)])
    return { notes, questions: (content?.questions ?? []).filter((q) => q.subtopicId === subtopicId).length }
  }, [chapterId, subtopicId, allowed])

  const st = subtopicById[subtopicId]
  const ch = chapterById[chapterId]
  if (!st || !ch || st.chapterId !== chapterId || ch.subjectId !== subjectId) return <Navigate to="/learn" replace />
  if (!allowed) return <div><PageHeader back={`/learn/${ch.subjectId}/${ch.id}`} title={`${st.code} ${L(st.title)}`} subtitle={L2(st.title)} /><LockedPanel subject /></div>

  const color = subjectById[ch.subjectId].color
  const note = data?.notes?.subtopics[subtopicId]
  const formulas = FORMULAS.filter((f) => f.subtopicId === subtopicId)
  const cards = (flashcards ?? []).filter((c) => c.subtopicId === subtopicId)
  const idx = ch.subtopics.findIndex((s) => s.id === subtopicId)
  const prev = ch.subtopics[idx - 1], next = ch.subtopics[idx + 1]
  const base = `/learn/${ch.subjectId}/${ch.id}`

  return (
    <div className="space-y-4 desk:mx-auto desk:max-w-2xl">
      <PageHeader back={base} title={`${st.code} ${L(st.title)}`} subtitle={`${ch.number}. ${L(ch.title)} · ${L2(st.title)}`}
        right={note && !data?.notes?.reviewed ? <DraftBadge /> : undefined} />

      <div className="card flex items-center gap-3">
        <MasteryRing value={mastery?.subtopic.get(subtopicId) ?? 0} size={52} />
        <div className="flex-1 text-sm">
          <div className="font-semibold">{L(subjectById[ch.subjectId].name)}</div>
          <div className="muted">{ch.theme ? L(ch.theme) : L(ch.title)}</div>
        </div>
      </div>

      {data && (note ? (
        <section className="card">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide" style={{ color }}>💡 {t('sub.keyPoints')}</h2>
          <ul className="space-y-2.5">
            {note.keyPoints.map((p, i) => (
              <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="flex gap-2 text-sm leading-relaxed">
                <span style={{ color }}>●</span><span>{L(p)}</span>
              </motion.li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="card text-sm">📝 {t('sub.notesSoon')}</div>
      ))}

      {note?.example && (
        <section className="card">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide" style={{ color }}>✍️ {t('sub.example')}</h2>
          <p className="text-sm font-semibold">{L(note.example.question)}</p>
          {showAnswer
            ? <p className="mt-2 rounded-xl border-2 border-green-600 bg-green-50 p-3 text-sm dark:bg-green-950/40">{L(note.example.answer)}</p>
            : <button className="btn-secondary mt-3 w-full" onClick={() => setShowAnswer(true)}>{t('sub.showAnswer')}</button>}
        </section>
      )}

      {note?.tip && <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">⭐ <strong>{t('sub.tip')}:</strong> {L(note.tip)}</p>}

      {st.learningStandards.length > 0 && (
        <section className="card">
          <h2 className="mb-2 font-bold">{t('learn.learningStandards')}</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">{st.learningStandards.map((x) => <li key={x}>{x}</li>)}</ul>
        </section>
      )}

      {formulas.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-bold">∑ {t('learn.s.formulas')}</h2>
          {formulas.map((f) => <FormulaCard key={f.id} f={f} />)}
        </section>
      )}

      {cards.length > 0 && (
        <section className="card space-y-2">
          <h2 className="font-bold">🃏 {t('practice.flashcards')}</h2>
          {cards.map((c) => <FlipRow key={c.id} front={L(c.front)} back={L(c.back)} />)}
        </section>
      )}

      {data && (data.questions > 0
        ? <Link to={`/practice/quiz?subtopic=${subtopicId}`} className="btn-primary w-full">❓ {t('sub.practise')} ({data.questions})</Link>
        : <p className="text-center text-xs muted">{t('sub.noPractice')}</p>)}

      <nav className="flex gap-2">
        {prev ? <Link to={`${base}/${prev.id}`} className="btn-secondary flex-1">‹ {prev.code}</Link> : <Link to={base} className="btn-secondary flex-1">{t('sub.chapter')}</Link>}
        {next ? <Link to={`${base}/${next.id}`} className="btn-secondary flex-1">{next.code} ›</Link> : <Link to={base} className="btn-secondary flex-1">{t('sub.chapter')}</Link>}
      </nav>
    </div>
  )
}

/** Keyed by subtopic so prev/next navigation starts fresh (e.g. example answer hidden again). */
export default function SubtopicPage() {
  const { subtopicId } = useParams()
  return <SubtopicView key={subtopicId} />
}
