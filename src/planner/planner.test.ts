import { describe, expect, it } from 'vitest'
import { generatePlan, MAX_PER_SUBJECT, OVERSHOOT, type PlanChapter, type PlanInput } from './generatePlan'
import { reschedule, missedDayCount, overdueTasks, RESCHEDULE_SLACK } from './reschedule'
import { gradeCard, isDue, dueCards, INTERVALS } from './leitner'
import { subtopicMastery, recentAccuracy, band } from './mastery'
import { computeStreak } from './streak'
import { minutesFor, phaseFor, isRestDay } from './phases'
import { addDays, dayOfWeek, eachDay } from './dates'
import type { Settings, StudyTask, Attempt } from './types'

const COUNTS = { phy: 6, chem: 8, bio: 15, addmath: 10, math: 10 } as const
const WRITTEN = new Set(['phy-02', 'chem-04', 'bio-02', 'addmath-02', 'math-02'])
const CHAPTERS: PlanChapter[] = Object.entries(COUNTS).flatMap(([s, n]) =>
  Array.from({ length: n }, (_, i) => {
    const id = `${s}-${String(i + 1).padStart(2, '0')}`
    return { id, subjectId: s as PlanChapter['subjectId'], number: i + 1, written: WRITTEN.has(id) }
  }),
)

const settings = (over: Partial<Settings> = {}): Settings => ({
  lang: 'en', theme: 'system', onboarded: true,
  schoolStart: '2027-01-11', planStart: '2026-10-12', planEnd: '2027-12-10',
  exams: [], holidays: [],
  minutes: { holiday: 60, school: 45, weekend: 90 }, dailyCap: 90,
  studyDays: [1, 2, 3, 4, 5, 6], // Sunday light
  confidence: { phy: 3, chem: 3, bio: 3, addmath: 3, math: 3 },
  currentChapters: {}, breakMinutes: 25, viewMode: 'auto',
  ...over,
})

let n = 0
const input = (over: Partial<PlanInput> = {}): PlanInput => ({
  from: '2026-10-12', to: '2027-12-10', settings: settings(), chapters: CHAPTERS,
  introDone: {}, weakSubtopics: [], hasFlashcards: true, makeId: (d, i) => `${d}#${i}#${n++}`,
  ...over,
})

const byDate = (tasks: StudyTask[]) => {
  const m = new Map<string, StudyTask[]>()
  for (const t of tasks) m.set(t.date, [...(m.get(t.date) ?? []), t])
  return m
}

describe('generatePlan', () => {
  it('never exceeds the daily budget by more than the allowed overshoot', () => {
    const inp = input({ weakSubtopics: ['phy-02-01', 'chem-04-02', 'addmath-02-01'] })
    for (const [date, ts] of byDate(generatePlan(inp))) {
      if (isRestDay(date, inp.settings)) continue
      const used = ts.reduce((s, t) => s + t.minutes, 0)
      expect(used, date).toBeLessThanOrEqual(minutesFor(date, inp.settings) + OVERSHOOT)
    }
  })

  it(`never schedules more than ${MAX_PER_SUBJECT} tasks for one subject per day`, () => {
    for (const [date, ts] of byDate(generatePlan(input({ weakSubtopics: ['phy-02-01', 'phy-02-05'] })))) {
      const counts: Record<string, number> = {}
      for (const t of ts) if (t.subjectId) counts[t.subjectId] = (counts[t.subjectId] ?? 0) + 1
      for (const c of Object.values(counts)) expect(c, date).toBeLessThanOrEqual(MAX_PER_SUBJECT)
    }
  })

  it('respects rest days: only an optional light task', () => {
    const tasks = generatePlan(input())
    const sundays = tasks.filter((t) => dayOfWeek(t.date) === 0)
    expect(sundays.length).toBeGreaterThan(0)
    for (const t of sundays) expect(t.type).toBe('rest')
    for (const t of sundays) expect(t.minutes).toBeLessThanOrEqual(15)
  })

  it('treats public holidays as rest days', () => {
    const s = settings({ holidays: [{ id: 'h', name: 'Deepavali', from: '2026-11-09', to: '2026-11-09' }] })
    const day = generatePlan(input({ settings: s })).filter((t) => t.date === '2026-11-09')
    expect(day.map((t) => t.type)).toEqual(['rest'])
  })

  it('introduces every chapter before school starts', () => {
    const intros = generatePlan(input()).filter((t) => t.type === 'intro' && t.date < '2027-01-11')
    expect(new Set(intros.map((t) => t.refId)).size).toBe(CHAPTERS.length)
  })

  it('schedules weaker subjects earlier and more often', () => {
    const s = settings({ confidence: { phy: 5, chem: 5, bio: 5, addmath: 1, math: 5 } })
    const firstWeek = generatePlan(input({ settings: s, to: '2026-10-18' })).filter((t) => t.type === 'intro')
    const am = firstWeek.filter((t) => t.subjectId === 'addmath').length
    const phy = firstWeek.filter((t) => t.subjectId === 'phy').length
    expect(firstWeek[0].subjectId).toBe('addmath')
    expect(am).toBeGreaterThan(phy)
  })

  it('adds the Form 3 bridge quiz only in the first 2 weeks', () => {
    const bridge = generatePlan(input()).filter((t) => t.refId === 'bridge')
    expect(bridge.length).toBeGreaterThan(0)
    for (const t of bridge) expect(t.date < addDays('2026-10-12', 14)).toBe(true)
  })

  it('switches to the exam sprint (no intros) in the 4 weeks before an exam', () => {
    const s = settings({ exams: [{ id: 'e', name: 'Mid-year', date: '2027-05-20' }] })
    const sprint = generatePlan(input({ settings: s })).filter((t) => t.date >= '2027-04-23' && t.date <= '2027-05-20')
    expect(sprint.some((t) => t.type === 'intro')).toBe(false)
    expect(sprint.some((t) => t.type === 'formula-drill')).toBe(true)
    expect(sprint.some((t) => t.refId === 'mixed')).toBe(true)
  })

  it('follows the class chapter marker during the term', () => {
    const s = settings({ currentChapters: { phy: { chapterId: 'phy-04', since: '2027-03-01' } } })
    const phyTerm = generatePlan(input({ settings: s, from: '2027-03-01', to: '2027-03-06', introDone: Object.fromEntries(CHAPTERS.map((c) => [c.id, '2026-12-01'])) }))
      .filter((t) => t.type === 'review' && t.subjectId === 'phy')
    expect(phyTerm.length).toBeGreaterThan(0)
    for (const t of phyTerm) expect(t.refId).toBe('phy-04')
  })

  it('regenerates correctly after the school start date changes', () => {
    const early = generatePlan(input({ settings: settings({ schoolStart: '2026-12-01' }) }))
    const late = generatePlan(input({ settings: settings({ schoolStart: '2027-02-01' }) }))
    const lastIntro = (ts: StudyTask[]) => ts.filter((t) => t.type === 'intro').at(-1)!.date
    expect(early.some((t) => t.type === 'review' && t.date === '2026-12-02')).toBe(true)
    expect(late.some((t) => t.type === 'review' && t.refId?.length === 6 && t.date === '2026-12-02')).toBe(false)
    expect(lastIntro(late) <= '2027-02-01').toBe(true)
  })

  it('does not duplicate tasks already done today and counts them toward the budget', () => {
    const done: StudyTask = { id: 'x', date: '2026-10-12', type: 'flashcards', minutes: 10, status: 'done' }
    const intro: StudyTask = { id: 'y', date: '2026-10-12', type: 'intro', refId: 'bio-01', subjectId: 'bio', minutes: 50, status: 'done' }
    const today = generatePlan(input({ to: '2026-10-12', existing: [done, intro] }))
    expect(today.some((t) => t.type === 'flashcards')).toBe(false)
    expect(today.reduce((s, t) => s + t.minutes, 60)).toBeLessThanOrEqual(60 + OVERSHOOT)
  })

  it('generates Nov 2026 – Dec 2027 in under 500 ms', () => {
    const t0 = performance.now()
    generatePlan(input({ from: '2026-11-01', to: '2027-12-31' }))
    expect(performance.now() - t0).toBeLessThan(500)
  })

  it('is deterministic', () => {
    const strip = (ts: StudyTask[]) => ts.map(({ id: _id, ...rest }) => rest)
    expect(strip(generatePlan(input()))).toEqual(strip(generatePlan(input())))
  })
})

describe('reschedule', () => {
  const s = settings({ schoolStart: '2026-10-01' })
  const budget = (d: string) => minutesFor(d, s)
  const task = (id: string, date: string, minutes: number, extra: Partial<StudyTask> = {}): StudyTask =>
    ({ id, date, type: 'quiz', refId: id, minutes, status: 'todo', ...extra })

  it('spreads overdue tasks over the next 3 study days without overloading', () => {
    const today = '2026-10-14' // Wednesday
    const overdue = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => task(id, '2026-10-12', 10))
    const upcoming = [task('u1', today, 40), task('u2', '2026-10-15', 40), task('u3', '2026-10-16', 40)]
    const r = reschedule(overdue, upcoming, today, budget)
    const load: Record<string, number> = { [today]: 40, '2026-10-15': 40, '2026-10-16': 40 }
    for (const m of r.moves) load[m.date] += 10
    for (const [d, l] of Object.entries(load)) expect(l).toBeLessThanOrEqual(budget(d) + RESCHEDULE_SLACK)
    expect(r.moves.length + r.unplaced.length).toBe(6)
    expect(new Set(r.moves.map((m) => m.date)).size).toBeGreaterThan(1)
  })

  it('skips rest days, daily flashcards and already re-planned tasks', () => {
    const today = '2026-10-17' // Saturday; Sunday is a rest day
    const overdue = [task('f', '2026-10-15', 10, { type: 'flashcards', refId: undefined }), task('dup', '2026-10-15', 10), task('m', '2026-10-15', 10)]
    const upcoming = [task('dup2', '2026-10-19', 10, { refId: 'dup' })]
    const r = reschedule(overdue, upcoming, today, budget)
    expect(r.skip.sort()).toEqual(['dup', 'f'])
    expect(r.moves.every((m) => dayOfWeek(m.date) !== 0)).toBe(true)
  })

  it('counts missed days', () => {
    const tasks = [task('a', '2026-10-01', 10), task('b', '2026-10-01', 10), task('c', '2026-10-03', 10), task('d', '2026-10-09', 10, { status: 'done' })]
    expect(missedDayCount(overdueTasks(tasks, '2026-10-10'))).toBe(2)
  })
})

describe('leitner', () => {
  it('moves up a box on correct, back to box 1 on wrong', () => {
    const s1 = gradeCard('c', undefined, true, '2026-10-12')
    expect(s1.box).toBe(2)
    expect(s1.due).toBe(addDays('2026-10-12', INTERVALS[2]))
    const s2 = gradeCard('c', { cardId: 'c', box: 4, due: '2026-10-12' }, true, '2026-10-12')
    expect(s2).toEqual({ cardId: 'c', box: 5, due: '2026-10-28' })
    const s3 = gradeCard('c', { cardId: 'c', box: 5, due: '2026-10-12' }, true, '2026-10-12')
    expect(s3.box).toBe(5)
    const s4 = gradeCard('c', s2, false, '2026-10-12')
    expect(s4).toEqual({ cardId: 'c', box: 1, due: '2026-10-13' })
  })

  it('uses intervals 1, 2, 4, 8, 16 days', () => {
    expect(Object.values(INTERVALS)).toEqual([1, 2, 4, 8, 16])
  })

  it('lists due cards before new ones', () => {
    const cards = [{ id: 'new' }, { id: 'later' }, { id: 'due' }]
    const states = new Map([
      ['later', { cardId: 'later', box: 3 as const, due: '2026-10-20' }],
      ['due', { cardId: 'due', box: 2 as const, due: '2026-10-10' }],
    ])
    expect(dueCards(cards, states, '2026-10-12').map((c) => c.id)).toEqual(['due', 'new'])
    expect(isDue(states.get('later'), '2026-10-12')).toBe(false)
  })
})

describe('mastery', () => {
  const att = (correct: boolean, i: number): Attempt => ({ id: `${i}`, questionId: 'q', subtopicId: 's', correct, at: `2026-10-${String(i).padStart(2, '0')}`, timeMs: 1 })

  it('combines quiz accuracy, intro and flashcards with weights 0.6 / 0.2 / 0.2', () => {
    expect(subtopicMastery({ attempts: [], introCompleted: false, cardBoxes: [] })).toBe(0)
    expect(subtopicMastery({ attempts: [att(true, 1)], introCompleted: true, cardBoxes: [5, 5] })).toBeCloseTo(1)
    expect(subtopicMastery({ attempts: [att(true, 1), att(false, 2)], introCompleted: true, cardBoxes: [0, 5] })).toBeCloseTo(0.3 + 0.2 + 0.1)
  })

  it('only uses the last 10 answers', () => {
    const attempts = [...Array.from({ length: 10 }, (_, i) => att(false, i + 1)), ...Array.from({ length: 10 }, (_, i) => att(true, i + 11))]
    expect(recentAccuracy(attempts)).toBe(1)
  })

  it('bands: red < 40, amber 40–70, green > 70', () => {
    expect(band(0.39)).toBe('red')
    expect(band(0.4)).toBe('amber')
    expect(band(0.7)).toBe('amber')
    expect(band(0.71)).toBe('green')
  })
})

describe('streak', () => {
  const days = (from: string, to: string, skip: string[] = []) => new Set([...eachDay(from, to)].filter((d) => !skip.includes(d)))

  it('counts consecutive active days', () => {
    expect(computeStreak(days('2026-10-05', '2026-10-11'), '2026-10-11')).toBe(7)
  })

  it('allows one free rest day per week', () => {
    expect(computeStreak(days('2026-10-05', '2026-10-11', ['2026-10-08']), '2026-10-11')).toBe(6)
  })

  it('breaks on a second missed day in the same week', () => {
    expect(computeStreak(days('2026-10-05', '2026-10-11', ['2026-10-07', '2026-10-09']), '2026-10-11')).toBe(3) // 11, 10, (free 9), 8 — stops at 7
  })

  it('does not break while today is still in progress', () => {
    expect(computeStreak(days('2026-10-05', '2026-10-10'), '2026-10-11')).toBe(6)
  })
})

describe('phases', () => {
  it('assigns holiday, term, sprint and rest phases', () => {
    const s = settings({ exams: [{ id: 'e', name: 'UASA', date: '2027-10-15' }] })
    expect(phaseFor('2026-10-12', s)).toEqual({ phase: 'A', bridge: true })
    expect(phaseFor('2026-11-12', s)).toEqual({ phase: 'A', bridge: false })
    expect(phaseFor('2027-02-02', s).phase).toBe('C')
    expect(phaseFor('2027-10-01', s).phase).toBe('D')
    expect(phaseFor('2026-10-18', s).phase).toBe('E') // Sunday
  })
})
