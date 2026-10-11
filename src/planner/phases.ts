import { addDays, dayOfWeek, isWeekend } from './dates'
import type { Settings } from './types'

/** A holiday head start · C term companion · D exam sprint · E rest day (plan §8.2) */
export type Phase = 'A' | 'C' | 'D' | 'E'

export const SPRINT_DAYS = 28
export const BRIDGE_DAYS = 14

export function isRestDay(date: string, s: Settings) {
  return !s.studyDays.includes(dayOfWeek(date)) || s.holidays.some((h) => date >= h.from && date <= h.to)
}

export function upcomingExam(date: string, s: Settings) {
  return s.exams
    .filter((e) => e.date >= date && e.date <= addDays(date, SPRINT_DAYS - 1))
    .sort((a, b) => a.date.localeCompare(b.date))[0]
}

export function phaseFor(date: string, s: Settings): { phase: Phase; bridge: boolean } {
  if (isRestDay(date, s)) return { phase: 'E', bridge: false }
  if (upcomingExam(date, s)) return { phase: 'D', bridge: false }
  if (date < s.schoolStart) return { phase: 'A', bridge: date < addDays(s.planStart, BRIDGE_DAYS) }
  return { phase: 'C', bridge: false }
}

/** Daily study budget in minutes, capped by the healthy-study daily cap. */
export function minutesFor(date: string, s: Settings) {
  if (isRestDay(date, s)) return 0
  const m = date < s.schoolStart ? s.minutes.holiday : isWeekend(date) ? s.minutes.weekend : s.minutes.school
  return Math.min(m, s.dailyCap)
}
