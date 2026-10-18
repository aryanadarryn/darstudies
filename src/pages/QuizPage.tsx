import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import QuizRunner from '../components/quiz/QuizRunner'
import { Empty, PageHeader } from '../components/ui'
import { chapterById, loadAllFlashcards, loadAllQuestions, loadBridge, SUBJECTS, subjectById, subtopicById } from '../content'
import type { Lang, Question, SubjectId } from '../content/schema'
import { db } from '../db/db'
import { useT } from '../i18n/useT'
import { completeMatching } from '../lib/actions'
import { useAsync } from '../lib/hooks'
import { buildMastery } from '../lib/progress'
import { shuffle } from '../lib/quizCheck'
import type { TaskType } from '../planner/types'
import { SUBJECT_EMOJI } from './Learn'
import { useCan } from '../auth/account'
import { LockedPanel } from '../auth/Locked'

const QUIZ_SIZE = 10

/** Unseen and previously-wrong questions first, then the rest, shuffled within each group. */
async function prioritise(qs: Question[], n: number) {
  const attempts = await db.attempts.toArray()
  const last = new Map<string, boolean>()
  for (const a of attempts.sort((x, y) => x.at.localeCompare(y.at))) last.set(a.questionId, a.correct)
  const fresh = shuffle(qs.filter((q) => !last.has(q.id) || !last.get(q.id)))
  const known = shuffle(qs.filter((q) => last.get(q.id)))
  return [...fresh, ...known].slice(0, n)
}

function ScopePicker() {
  const { t, L } = useT()
  const can = useCan()
  return (
    <div className="space-y-4">
      <p className="text-sm muted">{t('practice.chooseScope')}</p>
      <Link to="?mode=mixed" className="card flex items-center gap-3 font-semibold">🎲 {t('practice.mixed')}</Link>
      {SUBJECTS.map((s) => {
        const written = s.chapters.filter((c) => c.written)
        if (!written.length || !can('quiz', s.id)) return null
        return (
          <section key={s.id} className="card space-y-2" style={{ borderLeft: `4px solid ${s.color}` }}>
            <Link to={`?subject=${s.id}`} className="flex items-center gap-2 font-bold">{SUBJECT_EMOJI[s.id]} {L(s.name)} →</Link>
            {written.map((c) => (
              <Link key={c.id} to={`?chapter=${c.id}`} className="block rounded-lg px-2 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
                {c.number}. {L(c.title)}
              </Link>
            ))}
          </section>
        )
      })}
    </div>
  )
}

export default function QuizPage() {
  const { t, L } = useT()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [round, setRound] = useState(0)
  const chapter = params.get('chapter'), subject = params.get('subject') as SubjectId | null
  const subtopic = params.get('subtopic'), mode = params.get('mode'), set = params.get('set'), taskId = params.get('task')
  const hasScope = !!(chapter || subject || subtopic || mode || set)
  const can = useCan()
  const scopeSubject = subject ?? (chapter ? chapterById[chapter]?.subjectId : subtopic ? subtopicById[subtopic]?.subjectId : undefined)
  const locked = !!scopeSubject && !can('quiz', scopeSubject)

  const { data: questions, loading } = useAsync(async () => {
    if (!hasScope || locked) return []
    if (set === 'bridge') return prioritise((await loadBridge()).questions, QUIZ_SIZE)
    const all = await loadAllQuestions()
    if (chapter) return prioritise(all.filter((q) => q.subtopicId.startsWith(chapter + '-')), QUIZ_SIZE)
    if (subtopic) {
      const own = await prioritise(all.filter((q) => q.subtopicId === subtopic), QUIZ_SIZE)
      // Pad short subtopic sets with questions from the same chapter.
      const pad = own.length < 5 ? await prioritise(all.filter((q) => q.subtopicId.startsWith(subtopicById[subtopic]?.chapterId + '-') && !own.includes(q)), 5 - own.length) : []
      return [...own, ...pad]
    }
    if (subject) return prioritise(all.filter((q) => q.subtopicId.startsWith(subject + '-')), QUIZ_SIZE)
    if (mode === 'weak') {
      const [attempts, cards, intros, flash] = await Promise.all([db.attempts.toArray(), db.cards.toArray(), db.intros.toArray(), loadAllFlashcards()])
      const weak = buildMastery(attempts, cards, intros, flash).weak.sort((a, b) => a.mastery - b.mastery).map((w) => w.id)
      const picked: Question[] = []
      for (const st of weak) picked.push(...(await prioritise(all.filter((q) => q.subtopicId === st), 3)))
      return picked.slice(0, QUIZ_SIZE)
    }
    return prioritise(all, QUIZ_SIZE)
  }, [chapter, subject, subtopic, mode, set, round, locked])

  let title: string = t('practice.quiz')
  let subtitle: string | undefined
  let color = '#6d28d9'
  const name = (x: Lang) => L(x)
  if (chapter && chapterById[chapter]) {
    const c = chapterById[chapter]
    title = `${c.number}. ${name(c.title)}`
    subtitle = name(subjectById[c.subjectId].name)
    color = subjectById[c.subjectId].color
  } else if (subject && subjectById[subject]) {
    title = name(subjectById[subject].name)
    color = subjectById[subject].color
  } else if (subtopic && subtopicById[subtopic]) {
    const s = subtopicById[subtopic]
    title = `${s.code} ${name(s.title)}`
    subtitle = t('task.weak')
    color = subjectById[s.subjectId].color
  } else if (mode === 'weak') title = t('practice.weak')
  else if (mode === 'mixed') title = t('task.mixed')
  else if (set === 'bridge') title = t('task.bridge')

  const finish = async () => {
    const [type, ref]: [TaskType, string | undefined] = subtopic ? ['review', subtopic] : chapter ? ['quiz', chapter]
      : subject ? ['quiz', `subject:${subject}`] : set === 'bridge' ? ['quiz', 'bridge'] : mode === 'mixed' ? ['quiz', 'mixed'] : ['quiz', undefined]
    if (taskId || ref) await completeMatching(taskId, type, ref)
  }

  return (
    <div className="desk:mx-auto desk:max-w-2xl">
      <PageHeader back title={title} subtitle={subtitle} />
      {!hasScope ? (
        <ScopePicker />
      ) : locked ? (
        <LockedPanel subject />
      ) : loading ? (
        <div className="py-10 text-center muted">{t('common.loading')}</div>
      ) : !questions?.length ? (
        <Empty icon="📝">{mode === 'weak' ? t('practice.noWeak') : t('quiz.noQuestions')}</Empty>
      ) : (
        <QuizRunner key={round} questions={questions} color={color} onFinish={finish} onRestart={() => setRound((r) => r + 1)} onDone={() => nav(-1)} />
      )}
    </div>
  )
}
