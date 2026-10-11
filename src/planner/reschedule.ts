// Missed days (plan §8.4): spread overdue tasks over the next 3 study days.
import { addDays } from './dates'
import type { StudyTask } from './types'

export const RESCHEDULE_DAYS = 3
export const RESCHEDULE_SLACK = 15
/** Above this many missed days, offer "Reset plan from today" instead. */
export const RESET_THRESHOLD = 5

export interface RescheduleResult {
  moves: { id: string; date: string }[]
  /** Daily items (flashcards, rest) or tasks already planned again later — no point moving them. */
  skip: string[]
  /** Did not fit within budget + slack. */
  unplaced: string[]
}

export const overdueTasks = (tasks: StudyTask[], today: string) => tasks.filter((t) => t.status === 'todo' && t.date < today)

export const missedDayCount = (overdue: StudyTask[]) => new Set(overdue.map((t) => t.date)).size

export function reschedule(
  overdue: StudyTask[],
  upcoming: StudyTask[],
  today: string,
  budgetFor: (date: string) => number,
): RescheduleResult {
  const days: string[] = []
  for (let d = today, i = 0; days.length < RESCHEDULE_DAYS && i < 21; d = addDays(d, 1), i++) if (budgetFor(d) > 0) days.push(d)

  const load: Record<string, number> = Object.fromEntries(days.map((d) => [d, 0]))
  for (const t of upcoming) if (t.date in load && t.status !== 'skipped') load[t.date] += t.minutes
  const planned = new Set(upcoming.filter((t) => t.status === 'todo').map((t) => `${t.type}|${t.refId ?? ''}`))

  const result: RescheduleResult = { moves: [], skip: [], unplaced: [] }
  for (const t of [...overdue].sort((a, b) => a.date.localeCompare(b.date))) {
    const key = `${t.type}|${t.refId ?? ''}`
    if (t.type === 'flashcards' || t.type === 'rest' || planned.has(key)) {
      result.skip.push(t.id)
      continue
    }
    const target = days
      .filter((d) => load[d] + t.minutes <= budgetFor(d) + RESCHEDULE_SLACK)
      .sort((a, b) => load[a] - load[b] || a.localeCompare(b))[0]
    if (!target) {
      result.unplaced.push(t.id)
      continue
    }
    load[target] += t.minutes
    planned.add(key)
    result.moves.push({ id: t.id, date: target })
  }
  return result
}
