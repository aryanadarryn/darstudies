import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import FormulaCard from '../components/formula/FormulaCard'
import Infographic from '../components/infographic/Infographic'
import QuizRunner from '../components/quiz/QuizRunner'
import SubtopicList from '../components/SubtopicList'
import { ToolEmbed, hasToolComponent } from '../components/tools/registry'
import { DraftBadge, PageHeader, ProgressBar, toast } from '../components/ui'
import { chapterById, formulaById, loadChapterContent, subjectById } from '../content'
import { useCan } from '../auth/account'
import { LockedPanel } from '../auth/Locked'
import type { ChapterContent, Lang, Question } from '../content/schema'
import { db } from '../db/db'
import type { StringKey } from '../i18n/strings'
import { useT } from '../i18n/useT'
import { completeIntro, completeMatching, markIntroSection } from '../lib/actions'
import { useAsync } from '../lib/hooks'
import { shuffle } from '../lib/quizCheck'

const SECTIONS: { key: StringKey; icon: string }[] = [
  { key: 'learn.s.hook', icon: '🤔' }, { key: 'learn.s.bigIdeas', icon: '💡' }, { key: 'learn.s.infographic', icon: '🗺️' },
  { key: 'learn.s.keyTerms', icon: '🔤' }, { key: 'learn.s.formulas', icon: '∑' }, { key: 'learn.s.tryIt', icon: '🧪' },
  { key: 'learn.s.example', icon: '✍️' }, { key: 'learn.s.check', icon: '✅' },
]

function FlipCard({ front, sub, back }: { front: string; sub: string; back: string }) {
  const [flipped, setFlipped] = useState(false)
  return (
    <button className="perspective h-32 w-full text-left" onClick={() => setFlipped((f) => !f)} aria-label={front}>
      <motion.div className="relative h-full w-full" style={{ transformStyle: 'preserve-3d' }} animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.4 }}>
        <div className="backface-hidden absolute inset-0 flex flex-col justify-center rounded-xl border-2 border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
          <div className="font-bold">{front}</div>
          <div className="text-xs muted">{sub}</div>
        </div>
        <div className="backface-hidden absolute inset-0 flex items-center rounded-xl bg-violet-700 p-3 text-sm text-white" style={{ transform: 'rotateY(180deg)' }}>{back}</div>
      </motion.div>
    </button>
  )
}

function WorkedExample({ ex }: { ex: NonNullable<ChapterContent['intro']['workedExample']> }) {
  const { t, L } = useT()
  const [shown, setShown] = useState(1)
  return (
    <div className="space-y-3">
      <p className="font-semibold">{L(ex.question)}</p>
      <ol className="space-y-2">
        {ex.steps.slice(0, shown).map((s, i) => (
          <motion.li key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
            <span className="font-bold text-violet-700 dark:text-violet-300">{i + 1}.</span><span>{L(s)}</span>
          </motion.li>
        ))}
      </ol>
      {shown < ex.steps.length ? (
        <button className="btn-secondary w-full" onClick={() => setShown(shown + 1)}>{t('learn.showStep')} ({shown}/{ex.steps.length})</button>
      ) : (
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-xl border-2 border-green-600 bg-green-50 p-3 text-sm dark:bg-green-950/40">
          <strong>{t('learn.answer')}: </strong>{L(ex.answer)}
        </motion.div>
      )}
    </div>
  )
}

function pickCheckQuestions(qs: Question[]) {
  // 5 questions, favouring easier ones for a first look.
  const easy = shuffle(qs.filter((q) => q.difficulty < 3))
  const hard = shuffle(qs.filter((q) => q.difficulty === 3))
  return [...easy.slice(0, 4), ...hard.slice(0, 1), ...easy.slice(4)].slice(0, 5)
}

function Preview({ chapterId, taskId }: { chapterId: string; taskId: string | null }) {
  const { t } = useT()
  const nav = useNavigate()
  const intro = useLiveQuery(() => db.intros.get(chapterId), [chapterId])
  const done = async () => {
    await completeIntro(chapterId)
    if (taskId) await completeMatching(taskId, 'review', chapterId)
    toast('✓')
    nav(-1)
  }
  return (
    <div className="space-y-4">
      <div className="card text-sm">📝 {t('learn.previewOnly')}</div>
      <SubtopicList chapterId={chapterId} />
      {!intro?.completedAt && <button className="btn-primary w-full" onClick={done}>{t('learn.markPreview')}</button>}
    </div>
  )
}

export default function ChapterPage() {
  const { subjectId, chapterId = '' } = useParams()
  const [params] = useSearchParams()
  const taskId = params.get('task')
  const { t, L, L2 } = useT()
  const ch = chapterById[chapterId]
  const can = useCan()
  const allowed = !!ch && can('learn', ch.subjectId)
  const { data: content, loading } = useAsync(() => (allowed ? loadChapterContent(chapterId) : Promise.resolve(undefined)), [chapterId, allowed])
  const progress = useLiveQuery(() => db.intros.get(chapterId), [chapterId])
  const [step, setStep] = useState<number | null>(null)
  const sectionRefs = useRef<(HTMLElement | null)[]>([])
  const checkQs = useMemo(() => (content ? pickCheckQuestions(content.questions) : []), [content])

  const subject = ch ? subjectById[ch.subjectId] : undefined
  const intro = content?.intro
  const formulas = (intro?.formulaIds ?? []).map((id) => formulaById[id]).filter(Boolean)
  const toolOk = !!intro?.toolId && hasToolComponent(intro.toolId)
  // Sections with nothing to show count as done automatically.
  const empty = [false, false, !intro?.infographic, false, formulas.length === 0, !toolOk, !intro?.workedExample, checkQs.length === 0]

  const doneSet = new Set(progress?.sections ?? [])
  const firstOpen = SECTIONS.findIndex((_, i) => !doneSet.has(i) && !empty[i])
  const current = step ?? (progress?.completedAt ? SECTIONS.length : firstOpen === -1 ? SECTIONS.length : firstOpen)

  useEffect(() => {
    if (step !== null) sectionRefs.current[step]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [step])

  if (!ch || ch.subjectId !== subjectId) return <Navigate to="/learn" replace />
  if (!allowed) return <div><PageHeader back={`/learn/${ch.subjectId}`} title={`${ch.number}. ${L(ch.title)}`} subtitle={L2(ch.title)} /><LockedPanel subject /></div>

  const complete = async (i: number) => {
    let finished = false
    for (let k = 0; k <= i; k++) if (empty[k] || k === i) finished = (await markIntroSection(chapterId, k, SECTIONS.length)) || finished
    // Mark any trailing empty sections too.
    let next = i + 1
    while (next < SECTIONS.length && empty[next]) {
      finished = (await markIntroSection(chapterId, next, SECTIONS.length)) || finished
      next++
    }
    if (finished) toast(`🎉 ${t('learn.introDone')}`)
    setStep(next)
  }

  const body = (i: number): ReactNode => {
    if (!intro || !subject) return null
    switch (i) {
      case 0: return <p className="text-base leading-relaxed">{L(intro.hook)}</p>
      case 1: return (
        <ul className="space-y-2">
          {intro.bigIdeas.map((b, k) => (
            <motion.li key={k} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: k * 0.08 }} className="flex gap-2 text-sm">
              <span style={{ color: subject.color }}>●</span><span>{L(b)}</span>
            </motion.li>
          ))}
        </ul>
      )
      case 2: return intro.infographic ? <Infographic data={intro.infographic} color={subject.color} /> : null
      case 3: return (
        <div>
          <p className="mb-2 text-xs muted">{t('learn.tapToFlip')}</p>
          <div className="grid grid-cols-2 gap-2">
            {intro.keyTerms.map((k) => <FlipCard key={k.term.en} front={L(k.term)} sub={L2(k.term)} back={L(k.definition)} />)}
          </div>
        </div>
      )
      case 4: return <div className="space-y-3">{formulas.map((f) => <FormulaCard key={f.id} f={f} />)}</div>
      case 5: return intro.toolId ? (
        <div>
          <ToolEmbed id={intro.toolId} />
          <Link to={`/practice/tools/${intro.toolId}`} className="btn-ghost mt-2 -ml-2">{t('learn.openTool')} →</Link>
        </div>
      ) : null
      case 6: return intro.workedExample ? <WorkedExample ex={intro.workedExample} /> : null
      case 7: return <QuizRunner key="check" questions={checkQs} color={subject.color} onFinish={() => complete(7)} />
    }
  }

  const title = (x: Lang) => `${ch.number}. ${L(x)}`
  return (
    <div className="desk:mx-auto desk:max-w-2xl">
      <PageHeader back={`/learn/${ch.subjectId}`} title={title(ch.title)} subtitle={`${L(subject!.name)} · ${L2(ch.title)}`} right={content && !content.reviewed ? <DraftBadge /> : undefined} />
      {loading ? (
        <div className="py-10 text-center muted">{t('common.loading')}</div>
      ) : !content ? (
        <Preview chapterId={chapterId} taskId={taskId} />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <ProgressBar value={Math.min(doneSet.size, SECTIONS.length) / SECTIONS.length} color={subject!.color} />
            <span className="shrink-0 text-xs font-semibold tabular-nums muted">{Math.min(doneSet.size, SECTIONS.length)}/{SECTIONS.length}</span>
          </div>
          {!content.reviewed && <p className="text-xs muted">⚠️ {t('learn.draftNote')}</p>}
          {SECTIONS.map((s, i) => {
            if (i > current || empty[i]) return null
            const isDone = doneSet.has(i)
            return (
              <motion.section key={s.key} ref={(el) => { sectionRefs.current[i] = el }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card scroll-mt-20">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide" style={{ color: subject!.color }}>
                  <span aria-hidden>{s.icon}</span> {t(s.key)} {isDone && <span className="ml-auto text-green-600">✓</span>}
                </h2>
                {body(i)}
                {i === current && i !== 7 && (
                  <button className="btn-primary mt-4 w-full" onClick={() => complete(i)}>{t('common.next')} ↓</button>
                )}
              </motion.section>
            )
          })}
          {current >= SECTIONS.length && progress?.completedAt && (
            <div className="card text-center">
              <div className="text-4xl">🎉</div>
              <p className="font-semibold">{t('learn.introDone').replace(' +30 XP', '')}</p>
              <div className="mt-3 flex gap-2">
                <Link to={`/practice/quiz?chapter=${chapterId}`} className="btn-secondary flex-1">❓ {t('practice.quiz')}</Link>
                <Link to={`/practice/flashcards?chapter=${chapterId}`} className="btn-secondary flex-1">🃏 {t('practice.flashcards')}</Link>
              </div>
            </div>
          )}
          <SubtopicList chapterId={chapterId} />
        </div>
      )}
    </div>
  )
}
