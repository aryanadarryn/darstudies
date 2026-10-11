// Daily plan generation (plan §8.3). Pure and deterministic: same input → same plan.
import { SUBJECT_IDS } from '../content/ids'
import type { SubjectId } from '../content/schema'
import { addDays, daysBetween, eachDay } from './dates'
import { minutesFor, phaseFor } from './phases'
import type { Settings, StudyTask, TaskType } from './types'

export const MINUTES = { intro: 20, preview: 10, quiz: 10, review: 10, flashcards: 10, formulaDrill: 5, rest: 10 }
/** A day may go over budget by at most this much (§8.3 step 6). */
export const OVERSHOOT = 10
export const MAX_PER_SUBJECT = 2
export const MAX_INTROS_PER_DAY = 2
/** Assumed length of the school year when estimating class pace. */
export const SCHOOL_WEEKS = 40
/** Days to wait before reviewing a chapter again. */
const REVIEW_GAP = 3

export interface PlanChapter {
  id: string
  subjectId: SubjectId
  number: number
  /** Has written intro + questions. Unwritten chapters get a shorter structure preview and no quizzes. */
  written: boolean
}

export interface PlanInput {
  from: string
  to: string
  settings: Settings
  chapters: PlanChapter[]
  /** chapterId → date the intro was completed */
  introDone: Record<string, string>
  /** Subtopics with mastery < 60%, oldest-practised first */
  weakSubtopics: string[]
  hasFlashcards: boolean
  /** Tasks kept in the range (done today, or moved by hand) — they count toward their day's budget. */
  existing?: StudyTask[]
  makeId?: (date: string, index: number) => string
}

const weightOf = (s: Settings, id: SubjectId) => 6 - Math.min(5, Math.max(1, s.confidence[id] ?? 3))

/** Weighted round robin (stride scheduling): a subject with weight 5 is picked 5× as often as weight 1. */
class Stride {
  private pass: Record<string, number> = {}
  constructor(private weights: Record<SubjectId, number>) {
    // Starting at 1/w makes heavier (weaker) subjects go first.
    for (const id of SUBJECT_IDS) this.pass[id] = 1 / weights[id]
  }
  pick(ok: (id: SubjectId) => boolean): SubjectId | undefined {
    let best: SubjectId | undefined
    for (const id of SUBJECT_IDS) if (ok(id) && (best === undefined || this.pass[id] < this.pass[best])) best = id
    if (best) this.pass[best] += 1 / this.weights[best]
    return best
  }
}

class Day {
  tasks: StudyTask[] = []
  used = 0
  private counts: Record<string, number> = {}
  private keys = new Set<string>()

  constructor(readonly date: string, readonly budget: number, existing: StudyTask[], private makeId: (d: string, i: number) => string) {
    for (const t of existing) {
      if (t.status !== 'skipped') this.used += t.minutes
      this.track(t)
    }
  }
  private track(t: { type: TaskType; refId?: string; subjectId?: SubjectId }) {
    this.keys.add(`${t.type}|${t.refId ?? ''}`)
    if (t.subjectId) this.counts[t.subjectId] = (this.counts[t.subjectId] ?? 0) + 1
  }
  hasRoom() { return this.used < this.budget }
  fits(minutes: number) { return this.hasRoom() && this.used + minutes <= this.budget + OVERSHOOT }
  subjectOk(id: SubjectId) { return (this.counts[id] ?? 0) < MAX_PER_SUBJECT }
  has(type: TaskType, refId?: string) { return this.keys.has(`${type}|${refId ?? ''}`) }
  add(type: TaskType, minutes: number, refId?: string, subjectId?: SubjectId, force = false) {
    if (this.has(type, refId)) return false
    if (!force && (!this.fits(minutes) || (subjectId && !this.subjectOk(subjectId)))) return false
    const t: StudyTask = { id: this.makeId(this.date, this.tasks.length), date: this.date, type, minutes, status: 'todo' }
    if (refId) t.refId = refId
    if (subjectId) t.subjectId = subjectId
    this.tasks.push(t)
    this.used += minutes
    this.track(t)
    return true
  }
}

/** Which chapter the class is probably on, from the user's marker or the estimated pace (§8.2 C). */
export function currentChapterNumber(subject: SubjectId, date: string, s: Settings, chapterCount: number) {
  const marker = s.currentChapters[subject]
  const baseNumber = marker ? Number(marker.chapterId.split('-')[1]) : 1
  const baseDate = marker ? marker.since : s.schoolStart
  const weeksPerChapter = SCHOOL_WEEKS / chapterCount
  const n = baseNumber + Math.floor(Math.max(0, daysBetween(baseDate, date)) / 7 / weeksPerChapter)
  return Math.min(chapterCount, Math.max(1, n))
}

export function generatePlan(input: PlanInput): StudyTask[] {
  const s = input.settings
  const salt = Math.random().toString(36).slice(2, 7)
  const makeId = input.makeId ?? ((d: string, i: number) => `${d}-${salt}-${i}`)
  const weights = Object.fromEntries(SUBJECT_IDS.map((id) => [id, weightOf(s, id)])) as Record<SubjectId, number>
  const introStride = new Stride(weights)
  const reviseStride = new Stride(weights)
  const quizStride = new Stride(weights)

  const bySubject = Object.fromEntries(SUBJECT_IDS.map((id) => [id, [] as PlanChapter[]])) as Record<SubjectId, PlanChapter[]>
  for (const c of input.chapters) bySubject[c.subjectId].push(c)
  for (const id of SUBJECT_IDS) bySubject[id].sort((a, b) => a.number - b.number)

  const introQueue = Object.fromEntries(
    SUBJECT_IDS.map((id) => [id, bySubject[id].filter((c) => !input.introDone[c.id])]),
  ) as Record<SubjectId, PlanChapter[]>
  const introDate: Record<string, string> = { ...input.introDone }
  const lastReviewed: Record<string, string> = { ...input.introDone }
  const weakQueue = [...input.weakSubtopics]
  const lastWeak: Record<string, string> = {}
  const quizSubjects = SUBJECT_IDS.filter((id) => bySubject[id].some((c) => c.written))
  const chapterIds = new Set(input.chapters.map((c) => c.id))

  const introMinutes = (c: PlanChapter) => (c.written ? MINUTES.intro : MINUTES.preview)
  const scheduleIntro = (day: Day, c: PlanChapter) => {
    if (!day.add('intro', introMinutes(c), c.id, c.subjectId)) return false
    introQueue[c.subjectId] = introQueue[c.subjectId].filter((x) => x.id !== c.id)
    introDate[c.id] = day.date
    lastReviewed[c.id] = day.date
    return true
  }

  const addWeak = (day: Day, max: number) => {
    let added = 0
    for (let i = 0; i < weakQueue.length && added < max; i++) {
      const st = weakQueue[i]
      const subj = st.split('-')[0] as SubjectId
      if (lastWeak[st] && daysBetween(lastWeak[st], day.date) < REVIEW_GAP) continue
      if (day.add('review', MINUTES.review, st, subj)) {
        lastWeak[st] = day.date
        added++
      }
    }
  }

  // Spaced review of chapters already introduced: least recently reviewed first.
  const addReviews = (day: Day) => {
    while (day.hasRoom()) {
      const candidates = input.chapters
        .filter((c) => c.written && introDate[c.id] && daysBetween(introDate[c.id], day.date) >= 2)
        .filter((c) => daysBetween(lastReviewed[c.id], day.date) >= REVIEW_GAP && day.subjectOk(c.subjectId))
        .sort((a, b) => lastReviewed[a.id].localeCompare(lastReviewed[b.id]) || a.id.localeCompare(b.id))
      const next = candidates.find((c) => !day.has('quiz', c.id))
      if (!next || !day.add('quiz', MINUTES.quiz, next.id, next.subjectId)) break
      lastReviewed[next.id] = day.date
    }
  }

  const existingByDate = new Map<string, StudyTask[]>()
  for (const t of input.existing ?? []) {
    existingByDate.set(t.date, [...(existingByDate.get(t.date) ?? []), t])
    // A kept intro means the chapter is already taken care of.
    if (t.type === 'intro' && t.refId && chapterIds.has(t.refId)) {
      const c = input.chapters.find((x) => x.id === t.refId)!
      introQueue[c.subjectId] = introQueue[c.subjectId].filter((x) => x.id !== c.id)
      introDate[c.id] ??= t.date
      lastReviewed[c.id] ??= t.date
    }
  }

  const tasks: StudyTask[] = []
  for (const date of eachDay(input.from, input.to)) {
    const { phase, bridge } = phaseFor(date, s)
    const day = new Day(date, minutesFor(date, s), existingByDate.get(date) ?? [], makeId)

    if (phase === 'E') {
      // Rest day: optional light flashcards only (≤ 15 min).
      if (input.hasFlashcards) day.add('rest', MINUTES.rest, undefined, undefined, true)
      tasks.push(...day.tasks)
      continue
    }

    if (input.hasFlashcards) day.add('flashcards', MINUTES.flashcards)

    if (phase === 'D') {
      // Exam sprint: no new intros — mixed practice, weak topics, formulas.
      day.add('formula-drill', MINUTES.formulaDrill)
      if (quizSubjects.length) day.add('quiz', MINUTES.quiz, 'mixed')
      addWeak(day, 2)
      while (day.hasRoom()) {
        const subj = quizStride.pick((id) => quizSubjects.includes(id) && day.subjectOk(id) && !day.has('quiz', `subject:${id}`))
        if (!subj || !day.add('quiz', MINUTES.quiz, `subject:${subj}`, subj)) break
      }
    } else {
      if (bridge) day.add('quiz', MINUTES.quiz, 'bridge')

      if (phase === 'A') {
        for (let n = 0; n < MAX_INTROS_PER_DAY && day.hasRoom(); n++) {
          const subj = introStride.pick(
            (id) => introQueue[id].length > 0 && day.subjectOk(id) && day.fits(introMinutes(introQueue[id][0])),
          )
          if (!subj) break
          scheduleIntro(day, introQueue[subj][0])
        }
      } else {
        // Term companion: one task on the chapter the class is on now.
        const subj = reviseStride.pick((id) => bySubject[id].length > 0 && day.subjectOk(id))
        if (subj) {
          const n = currentChapterNumber(subj, date, s, bySubject[subj].length)
          const ch = bySubject[subj][n - 1]
          if (!introDate[ch.id]) scheduleIntro(day, ch)
          else if (day.add('review', MINUTES.review, ch.id, subj)) lastReviewed[ch.id] = date
        }
      }

      addWeak(day, 1)
      addReviews(day)
    }
    tasks.push(...day.tasks)
  }
  return tasks
}

/** Convenience for the UI: the plan horizon defaults to the end of the Form 4 year (~mid-December). */
export const defaultPlanEnd = (schoolStart: string) => addDays(schoolStart, 335)
