// All writes to on-device data go through here.
import { canNow } from '../auth/account'
import { ALL_CHAPTERS, HAS_FLASHCARDS, loadAllFlashcards } from '../content'
import { formOf } from '../content/ids'
import type { Question } from '../content/schema'
import { db, getKV, setKV, uid } from '../db/db'
import { todayISO } from '../planner/dates'
import { generatePlan } from '../planner/generatePlan'
import { gradeCard } from '../planner/leitner'
import { minutesFor } from '../planner/phases'
import { overdueTasks, reschedule } from '../planner/reschedule'
import type { Settings, StudyTask, TaskType } from '../planner/types'
import { buildMastery } from './progress'

export const completeTask = (id: string) => db.tasks.update(id, { status: 'done', completedAt: new Date().toISOString() })
export const reopenTask = (id: string) => db.tasks.update(id, { status: 'todo', completedAt: undefined })
export const skipTask = (id: string) => db.tasks.update(id, { status: 'skipped' })
export const moveTask = (id: string, date: string) => db.tasks.update(id, { date, moved: true })

/** Called when an activity finishes: completes the task that launched it, or a matching open task up to today. */
export async function completeMatching(taskId: string | null | undefined, type: TaskType, refId?: string) {
  if (taskId) {
    const t = await db.tasks.get(taskId)
    if (t && t.status === 'todo') return completeTask(taskId)
    if (t) return
  }
  const today = todayISO()
  const open = await db.tasks.where('date').belowOrEqual(today)
    .filter((t) => t.status === 'todo' && t.type === type && (refId === undefined || t.refId === refId)).toArray()
  open.sort((a, b) => b.date.localeCompare(a.date))
  if (open[0]) await completeTask(open[0].id)
}

export async function recordAttempt(q: Question, correct: boolean, timeMs: number) {
  await db.attempts.add({ id: uid(), questionId: q.id, subtopicId: q.subtopicId, correct, at: new Date().toISOString(), timeMs })
}

export async function gradeFlashcard(cardId: string, correct: boolean) {
  const prev = await db.cards.get(cardId)
  await db.cards.put(gradeCard(cardId, prev, correct, todayISO()))
}

export async function addDrillRounds(n: number) {
  await setKV('drills', (await getKV('drills', 0)) + n)
}

/** Marks one intro section done; returns true if this completed the whole intro. */
export async function markIntroSection(chapterId: string, section: number, total: number) {
  const prev = (await db.intros.get(chapterId)) ?? { chapterId, sections: [] }
  if (prev.sections.includes(section)) return false
  const sections = [...prev.sections, section]
  const completeNow = !prev.completedAt && sections.length >= total
  await db.intros.put({ ...prev, sections, completedAt: prev.completedAt ?? (completeNow ? todayISO() : undefined) })
  if (completeNow) await onIntroCompleted(chapterId)
  return completeNow
}

export async function completeIntro(chapterId: string) {
  const prev = (await db.intros.get(chapterId)) ?? { chapterId, sections: [] }
  if (prev.completedAt) return
  await db.intros.put({ ...prev, completedAt: todayISO() })
  await onIntroCompleted(chapterId)
}

async function onIntroCompleted(chapterId: string) {
  await completeMatching(null, 'intro', chapterId)
  // Finished early? Drop the future intro task for this chapter.
  const today = todayISO()
  await db.tasks.where('date').above(today).filter((t) => t.type === 'intro' && t.refId === chapterId && t.status === 'todo').delete()
}

export async function regeneratePlan(settings: Settings) {
  const today = todayISO()
  const [intros, attempts, cards, flashcards] = await Promise.all([
    db.intros.toArray(), db.attempts.toArray(), db.cards.toArray(), loadAllFlashcards(),
  ])
  const introDone = Object.fromEntries(intros.filter((i) => i.completedAt).map((i) => [i.chapterId, i.completedAt!]))
  const form = settings.form ?? 4
  const weak = buildMastery(attempts, cards, intros, flashcards).weak.map((w) => w.id).filter((id) => formOf(id) === form)
  const future = await db.tasks.where('date').aboveOrEqual(today).toArray()
  const keep = future.filter((t) => t.status !== 'todo' || t.moved)
  const drop = future.filter((t) => !keep.includes(t)).map((t) => t.id)
  const tasks = generatePlan({
    from: today, to: settings.planEnd, settings,
    // Only plan subjects the user can open (everything when accounts are off).
    chapters: ALL_CHAPTERS.filter((c) => c.form === form && (canNow('learn', c.subjectId) || canNow('quiz', c.subjectId)))
      .map((c) => ({ id: c.id, subjectId: c.subjectId, number: c.number, written: c.written })),
    introDone, weakSubtopics: weak, hasFlashcards: HAS_FLASHCARDS && (form === 3 || canNow('flashcards')), existing: keep,
  })
  await db.transaction('rw', db.tasks, db.kv, async () => {
    await db.tasks.bulkDelete(drop)
    await db.tasks.bulkAdd(tasks)
    await setKV('lastPlanned', today)
  })
  return tasks.length
}

export async function rescheduleOverdue(settings: Settings) {
  const today = todayISO()
  const all = await db.tasks.toArray()
  const overdue = overdueTasks(all, today)
  const upcoming = all.filter((t) => t.date >= today)
  const r = reschedule(overdue, upcoming, today, (d) => minutesFor(d, settings))
  await db.transaction('rw', db.tasks, async () => {
    for (const m of r.moves) await db.tasks.update(m.id, { date: m.date, moved: true })
    for (const id of [...r.skip, ...r.unplaced]) await db.tasks.update(id, { status: 'skipped' })
  })
  return r
}

/** "Reset plan from today": drop the backlog and rebuild. */
export async function resetPlanFromToday(settings: Settings) {
  const today = todayISO()
  const overdue = overdueTasks(await db.tasks.where('date').below(today).toArray(), today)
  await db.tasks.bulkUpdate(overdue.map((t) => ({ key: t.id, changes: { status: 'skipped' as const } })))
  await regeneratePlan(settings)
}

export type { StudyTask }
