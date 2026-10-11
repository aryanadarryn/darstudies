// Content loaders. Structure is bundled eagerly (small); chapter content and flashcards are lazy chunks.
import phyRaw from '../../content/raw/phy.json'
import chemRaw from '../../content/raw/chem.json'
import bioRaw from '../../content/raw/bio.json'
import addmathRaw from '../../content/raw/addmath.json'
import mathRaw from '../../content/raw/math.json'
import formulasJson from '../../content/formulas.json'
import { chapterId, subtopicId, SUBJECT_IDS } from './ids'
import type { Bridge, ChapterContent, Flashcard, Formula, Lang, NotesFile, Question, RawSubject, SubjectId } from './schema'

export interface Subtopic { id: string; code: string; title: Lang; learningStandards: string[] }
export interface Chapter {
  id: string
  subjectId: SubjectId
  number: number
  title: Lang
  theme?: Lang
  subtopics: Subtopic[]
  /** Has a written intro + questions (content/<subject>/<chapter>.json). */
  written: boolean
}
export interface Subject { id: SubjectId; name: Lang; color: string; chapters: Chapter[] }

const contentModules = import.meta.glob<{ default: ChapterContent }>('../../content/{phy,chem,bio,addmath,math}/*.json')
const flashModules = import.meta.glob<{ default: { chapterId: string; cards: Flashcard[] } }>('../../content/flashcards/*.json')

const fileId = (path: string) => path.split('/').pop()!.replace('.json', '')
const contentByChapter = Object.fromEntries(Object.entries(contentModules).map(([p, load]) => [fileId(p), load]))
const flashByChapter = Object.fromEntries(Object.entries(flashModules).map(([p, load]) => [fileId(p), load]))

const RAW: Record<SubjectId, RawSubject> = {
  phy: phyRaw as RawSubject, chem: chemRaw as RawSubject, bio: bioRaw as RawSubject,
  addmath: addmathRaw as RawSubject, math: mathRaw as RawSubject,
}

export const SUBJECTS: Subject[] = SUBJECT_IDS.map((sid) => {
  const raw = RAW[sid]
  return {
    id: sid,
    name: raw.name,
    color: raw.color,
    chapters: raw.chapters.map((c) => {
      const id = chapterId(sid, c.number)
      return {
        id, subjectId: sid, number: c.number, title: c.title, theme: c.theme, written: id in contentByChapter,
        subtopics: c.subtopics.map((s) => ({ id: subtopicId(id, s.code), code: s.code, title: s.title, learningStandards: s.learningStandards ?? [] })),
      }
    }),
  }
})

export const subjectById = Object.fromEntries(SUBJECTS.map((s) => [s.id, s])) as Record<SubjectId, Subject>
export const ALL_CHAPTERS = SUBJECTS.flatMap((s) => s.chapters)
export const chapterById = Object.fromEntries(ALL_CHAPTERS.map((c) => [c.id, c])) as Record<string, Chapter>
export const ALL_SUBTOPICS = ALL_CHAPTERS.flatMap((c) => c.subtopics.map((s) => ({ ...s, chapterId: c.id, subjectId: c.subjectId })))
export const subtopicById = Object.fromEntries(ALL_SUBTOPICS.map((s) => [s.id, s]))
export const HAS_FLASHCARDS = Object.keys(flashByChapter).length > 0

export const FORMULAS = formulasJson as Formula[]
export const formulaById = Object.fromEntries(FORMULAS.map((f) => [f.id, f])) as Record<string, Formula>

const contentCache = new Map<string, Promise<ChapterContent | undefined>>()
export function loadChapterContent(id: string): Promise<ChapterContent | undefined> {
  if (!contentCache.has(id)) contentCache.set(id, contentByChapter[id] ? contentByChapter[id]().then((m) => m.default) : Promise.resolve(undefined))
  return contentCache.get(id)!
}

export async function loadAllContent(): Promise<ChapterContent[]> {
  const all = await Promise.all(ALL_CHAPTERS.filter((c) => c.written).map((c) => loadChapterContent(c.id)))
  return all.filter((c): c is ChapterContent => !!c)
}

export async function loadAllQuestions(): Promise<Question[]> {
  return (await loadAllContent()).flatMap((c) => c.questions)
}

let flashPromise: Promise<Flashcard[]> | undefined
export function loadAllFlashcards(): Promise<Flashcard[]> {
  flashPromise ??= Promise.all(Object.values(flashByChapter).map((load) => load().then((m) => m.default.cards))).then((d) => d.flat())
  return flashPromise
}

let bridgePromise: Promise<Bridge> | undefined
export function loadBridge(): Promise<Bridge> {
  bridgePromise ??= import('../../content/bridge.json').then((m) => m.default as Bridge)
  return bridgePromise
}

const notesModules = import.meta.glob<{ default: NotesFile }>('../../content/notes/*.json')
const notesByChapter = Object.fromEntries(Object.entries(notesModules).map(([p, load]) => [fileId(p), load]))

export function loadNotes(chapterId: string): Promise<NotesFile | undefined> {
  return notesByChapter[chapterId] ? notesByChapter[chapterId]().then((m) => m.default) : Promise.resolve(undefined)
}
