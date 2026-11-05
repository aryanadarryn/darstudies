import { describe, expect, it } from 'vitest'
import { canUse, type Access } from '../auth/access'
import { ALL_CHAPTERS, formulasOf, loadChapterContent, loadNotes, subjectsOf } from '.'
import { formOf, FORMS } from './ids'
import { TOOLS } from './toolIds'

describe('Form 5', () => {
  it('is one of the forms, with all 9 subjects written', () => {
    expect(FORMS).toContain(5)
    expect(formOf('f5math-08-01')).toBe(5)
    expect(formOf('f5addmath-02')).toBe(5)
    const subjects = subjectsOf(5)
    expect(subjects).toHaveLength(9)
    for (const s of subjects) for (const c of s.chapters) expect(c.written, c.id).toBe(true)
  })

  it('has every chapter in the content list', () => {
    expect(ALL_CHAPTERS.filter((c) => formOf(c.id) === 5).length).toBe(subjectsOf(5).reduce((n, s) => n + s.chapters.length, 0))
  })

  it('loads chapter content and notes, and has formulas and tools', async () => {
    const content = await loadChapterContent('f5phy-03')
    expect(content?.questions.length).toBeGreaterThan(0)
    const notes = await loadNotes('f5phy-03')
    expect(Object.keys(notes?.subtopics ?? {})).toHaveLength(4)
    expect(formulasOf(5).length).toBeGreaterThan(0)
    expect(TOOLS.some((t) => t.chapters.some((c) => formOf(c) === 5))).toBe(true)
  })

  it('every formula points at a real subtopic, and every chapter formula exists', async () => {
    const formulas = formulasOf(5)
    const known = new Set(formulas.map((f) => f.id))
    const subtopics = new Set(subjectsOf(5).flatMap((s) => s.chapters.flatMap((c) => c.subtopics.map((t) => t.id))))
    for (const f of formulas) expect(subtopics.has(f.subtopicId), f.id).toBe(true)
    for (const s of subjectsOf(5)) {
      for (const c of s.chapters) {
        const content = await loadChapterContent(c.id)
        for (const id of content?.intro.formulaIds ?? []) expect(known.has(id), `${c.id} → ${id}`).toBe(true)
      }
    }
  })

  it('is paid like Form 4: a lapsed account is locked out', () => {
    const expired = { tier: 'expired', subjects: [], features: [] } as unknown as Access
    expect(canUse(expired, 'quiz', 'f5math')).toBe(false)
    expect(canUse(expired, 'planner', undefined, 5)).toBe(false)
  })
})
