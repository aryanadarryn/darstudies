import { addDays as dfAddDays, differenceInCalendarDays, format, parseISO } from 'date-fns'

/** All planner dates are local 'YYYY-MM-DD' strings, which also sort correctly as strings. */
export const toISO = (d: Date) => format(d, 'yyyy-MM-dd')
export const fromISO = (s: string) => parseISO(s)
export const todayISO = () => toISO(new Date())
export const addDays = (s: string, n: number) => toISO(dfAddDays(parseISO(s), n))
export const daysBetween = (from: string, to: string) => differenceInCalendarDays(parseISO(to), parseISO(from))
export const dayOfWeek = (s: string) => parseISO(s).getDay()
export const isWeekend = (s: string) => [0, 6].includes(dayOfWeek(s))

export function* eachDay(from: string, to: string) {
  for (let d = from; d <= to; d = addDays(d, 1)) yield d
}
