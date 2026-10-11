// Mastery score (plan §8.6).
import type { Attempt } from './types'

export const RECENT_ATTEMPTS = 10
export const WEAK_THRESHOLD = 0.6

export interface SubtopicEvidence {
  /** Attempts on this subtopic's questions, any order. */
  attempts: Attempt[]
  introCompleted: boolean
  /** Leitner box of every flashcard in the subtopic; 0 for cards never studied. */
  cardBoxes: number[]
}

export function recentAccuracy(attempts: Attempt[]) {
  const recent = [...attempts].sort((a, b) => a.at.localeCompare(b.at)).slice(-RECENT_ATTEMPTS)
  return recent.length ? recent.filter((a) => a.correct).length / recent.length : 0
}

export function subtopicMastery(e: SubtopicEvidence) {
  const boxAvg = e.cardBoxes.length ? e.cardBoxes.reduce((s, b) => s + b, 0) / e.cardBoxes.length : 0
  return 0.6 * recentAccuracy(e.attempts) + 0.2 * (e.introCompleted ? 1 : 0) + 0.2 * (boxAvg / 5)
}

export const average = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0)

export type MasteryBand = 'red' | 'amber' | 'green'
export const band = (m: number): MasteryBand => (m < 0.4 ? 'red' : m <= 0.7 ? 'amber' : 'green')
