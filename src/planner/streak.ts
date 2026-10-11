// Streak with one free rest day per week (plan §8.7) — missing one day a week never breaks it.
import { startOfISOWeek } from 'date-fns'
import { addDays, fromISO, toISO } from './dates'

export function computeStreak(activeDates: Set<string>, today: string, maxLookback = 400): number {
  // Today still counts as "in progress": a streak isn't broken until the day is over.
  let day = activeDates.has(today) ? today : addDays(today, -1)
  let streak = 0
  const freeUsed = new Set<string>()
  for (let i = 0; i < maxLookback; i++, day = addDays(day, -1)) {
    if (activeDates.has(day)) {
      streak++
      continue
    }
    const week = toISO(startOfISOWeek(fromISO(day)))
    if (freeUsed.has(week)) break
    freeUsed.add(week)
    // A free day only bridges a gap if there is activity before it.
    if (!activeDates.has(addDays(day, -1))) break
  }
  return streak
}
