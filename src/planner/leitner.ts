// Leitner boxes (plan §8.5): correct → next box, wrong → box 1.
import { addDays } from './dates'
import type { Box, CardState } from './types'

/** Review interval in days for boxes 1–5. */
export const INTERVALS: Record<Box, number> = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 }

export function gradeCard(cardId: string, prev: CardState | undefined, correct: boolean, today: string): CardState {
  const box = (correct ? Math.min(5, (prev?.box ?? 1) + 1) : 1) as Box
  return { cardId, box, due: addDays(today, INTERVALS[box]) }
}

/** New cards (no state yet) are due immediately. */
export const isDue = (state: CardState | undefined, today: string) => !state || state.due <= today

/** Due cards first (oldest due date first), then new cards, capped at `limit`. */
export function dueCards<T extends { id: string }>(cards: T[], states: Map<string, CardState>, today: string, limit = 20): T[] {
  const due = cards.filter((c) => states.has(c.id) && isDue(states.get(c.id), today))
    .sort((a, b) => states.get(a.id)!.due.localeCompare(states.get(b.id)!.due))
  const fresh = cards.filter((c) => !states.has(c.id))
  return [...due, ...fresh].slice(0, limit)
}
