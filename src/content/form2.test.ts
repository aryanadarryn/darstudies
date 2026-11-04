import { describe, expect, it } from 'vitest'
import { canUse, type Access } from '../auth/access'
import { generatePlan } from '../planner/generatePlan'
import type { Settings } from '../planner/types'
import { ALL_CHAPTERS, formulasOf, loadChapterContent, loadNotes, subjectsOf } from '.'
import { formOf, FORMS } from './ids'
import { TOOLS } from './toolIds'

describe('Form 2', () => {
  it('is one of the forms, with all 12 subjects written', () => {
    expect(FORMS).toContain(2)
    expect(formOf('f2math-08-01')).toBe(2)
    expect(formOf('f3math-08')).toBe(3)
    expect(formOf('math-08')).toBe(4)
    const subjects = subjectsOf(2)
    expect(subjects).toHaveLength(12)
    for (const s of subjects) for (const c of s.chapters) expect(c.written, c.id).toBe(true)
  })

  it('loads chapter content and notes, and has formulas and tools', async () => {
    const content = await loadChapterContent('f2math-05')
    expect(content?.questions.length).toBeGreaterThan(0)
    const notes = await loadNotes('f2math-05')
    expect(Object.keys(notes?.subtopics ?? {})).toHaveLength(3)
    expect(formulasOf(2).length).toBeGreaterThan(0)
    expect(TOOLS.some((t) => t.chapters.some((c) => formOf(c) === 2))).toBe(true)
  })

  it('is free to signed-in users like Form 3, except tools', () => {
    const expired = { tier: 'expired', subjects: [], features: [] } as unknown as Access
    expect(canUse(expired, 'quiz', 'f2math')).toBe(true)
    expect(canUse(expired, 'planner', undefined, 2)).toBe(true)
    expect(canUse(expired, 'tools', undefined, 2)).toBe(false)
    expect(canUse(expired, 'quiz', 'math')).toBe(false)
  })

  it('can generate a study plan', () => {
    const settings = {
      lang: 'en', theme: 'system', onboarded: true, schoolStart: '2027-01-11', planStart: '2026-11-04', planEnd: '2026-12-31', exams: [], holidays: [],
      minutes: { holiday: 60, school: 45, weekend: 90 }, dailyCap: 90, studyDays: [1, 2, 3, 4, 5, 6], confidence: {}, currentChapters: {},
      breakMinutes: 25, viewMode: 'auto', form: 2,
    } as Settings
    const chapters = ALL_CHAPTERS.filter((c) => c.form === 2).map((c) => ({ id: c.id, subjectId: c.subjectId, number: c.number, written: c.written }))
    const tasks = generatePlan({ from: '2026-11-04', to: '2026-11-30', settings, chapters, introDone: {}, weakSubtopics: [], hasFlashcards: true })
    expect(tasks.length).toBeGreaterThan(0)
    expect(tasks.filter((t) => t.type === 'intro').every((t) => formOf(t.refId ?? '') === 2)).toBe(true)
  })
})
