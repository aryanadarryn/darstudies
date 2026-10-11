// Derived progress: mastery, XP, streak and badges are all computed from stored data, so backups stay consistent.
import { SUBJECT_IDS } from '../content/ids'
import { ALL_CHAPTERS, ALL_SUBTOPICS } from '../content'
import type { Flashcard, SubjectId } from '../content/schema'
import type { IntroProgress } from '../db/db'
import { addDays, daysBetween, toISO } from '../planner/dates'
import { average, subtopicMastery, WEAK_THRESHOLD } from '../planner/mastery'
import { computeStreak } from '../planner/streak'
import type { Attempt, CardState, StudyTask } from '../planner/types'

export interface MasteryData {
  subtopic: Map<string, number>
  chapter: Map<string, number>
  subject: Map<SubjectId, number>
  /** Practised subtopics below 60%, least recently practised first. */
  weak: { id: string; mastery: number; lastAt: string }[]
}

export function buildMastery(attempts: Attempt[], cards: CardState[], intros: IntroProgress[], flashcards: Flashcard[]): MasteryData {
  const bySub = new Map<string, Attempt[]>()
  for (const a of attempts) bySub.set(a.subtopicId, [...(bySub.get(a.subtopicId) ?? []), a])
  const boxes = new Map(cards.map((c) => [c.cardId, c.box]))
  const cardsBySub = new Map<string, number[]>()
  for (const f of flashcards) cardsBySub.set(f.subtopicId, [...(cardsBySub.get(f.subtopicId) ?? []), boxes.get(f.id) ?? 0])
  const introDone = new Set(intros.filter((i) => i.completedAt).map((i) => i.chapterId))

  const subtopic = new Map<string, number>()
  const weak: MasteryData['weak'] = []
  for (const s of ALL_SUBTOPICS) {
    const atts = bySub.get(s.id) ?? []
    const m = subtopicMastery({ attempts: atts, introCompleted: introDone.has(s.chapterId), cardBoxes: cardsBySub.get(s.id) ?? [] })
    subtopic.set(s.id, m)
    if (atts.length && m < WEAK_THRESHOLD) weak.push({ id: s.id, mastery: m, lastAt: atts.map((a) => a.at).sort().at(-1)! })
  }
  const chapter = new Map(ALL_CHAPTERS.map((c) => [c.id, average(c.subtopics.map((s) => subtopic.get(s.id) ?? 0))]))
  const subject = new Map(SUBJECT_IDS.map((sid) => [sid, average(ALL_CHAPTERS.filter((c) => c.subjectId === sid).map((c) => chapter.get(c.id) ?? 0))]))
  weak.sort((a, b) => a.lastAt.localeCompare(b.lastAt))
  return { subtopic, chapter, subject, weak }
}

export const XP_PER_LEVEL = 500

export function computeXP(tasks: StudyTask[], attempts: Attempt[], intros: IntroProgress[], drills: number) {
  const fromTasks = tasks.filter((t) => t.status === 'done').reduce((s, t) => s + 10 + t.minutes, 0)
  const fromAttempts = attempts.reduce((s, a) => s + (a.correct ? 5 : 1), 0)
  const fromIntros = intros.filter((i) => i.completedAt).length * 30
  return fromTasks + fromAttempts + fromIntros + drills * 2
}

export const levelOf = (xp: number) => ({ level: Math.floor(xp / XP_PER_LEVEL) + 1, into: xp % XP_PER_LEVEL })

export function activeDates(tasks: StudyTask[], attempts: Attempt[]) {
  const s = new Set<string>()
  for (const t of tasks) if (t.status === 'done' && t.completedAt) s.add(toISO(new Date(t.completedAt)))
  for (const a of attempts) s.add(toISO(new Date(a.at)))
  return s
}

export const BADGES = ['first-chapter', 'all-physics', 'streak-7', 'formula-master', 'comeback'] as const
export type BadgeId = (typeof BADGES)[number]

export function earnedBadges(intros: IntroProgress[], active: Set<string>, drills: number): Set<BadgeId> {
  const done = new Set(intros.filter((i) => i.completedAt).map((i) => i.chapterId))
  const earned = new Set<BadgeId>()
  if (done.size > 0) earned.add('first-chapter')
  if (ALL_CHAPTERS.filter((c) => c.subjectId === 'phy').every((c) => done.has(c.id))) earned.add('all-physics')
  if (drills >= 50) earned.add('formula-master')
  const days = [...active].sort()
  // Best streak ever, checked at each active day.
  if (days.some((d) => computeStreak(active, d) >= 7)) earned.add('streak-7')
  for (let i = 1; i < days.length; i++) if (daysBetween(days[i - 1], days[i]) > 3) earned.add('comeback')
  return earned
}

export const streakNow = (active: Set<string>, today: string) => computeStreak(active, today)

/** Simple deterministic pick for "formula of the day". */
export const dayIndex = (today: string, n: number) => (n ? Math.abs(daysBetween('2026-01-01', today)) % n : 0)

export const weekStart = (d: string) => addDays(d, -((new Date(d + 'T00:00').getDay() + 6) % 7))
