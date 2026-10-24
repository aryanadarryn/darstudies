// Content schemas. Used at build time by scripts/validate-content.ts; the app imports only the types.
import { z } from 'zod'
import { SUBJECT_IDS } from './ids'

export { SUBJECT_IDS }

export const LangSchema = z.object({ en: z.string().min(1), bm: z.string().min(1) })
export type Lang = z.infer<typeof LangSchema>

export const SubjectIdSchema = z.enum(SUBJECT_IDS)
export type SubjectId = z.infer<typeof SubjectIdSchema>

// ---- Structure (content/raw/<subject>.json) — from the DSKP, no learning content ----
export const RawSubtopicSchema = z.object({
  code: z.string().regex(/^\d+\.\d+$/),
  title: LangSchema,
  learningStandards: z.array(z.string()).default([]),
})
export const RawChapterSchema = z.object({
  number: z.number().int().positive(),
  title: LangSchema,
  theme: LangSchema.optional(),
  subtopics: z.array(RawSubtopicSchema).min(1),
})
export const RawSubjectSchema = z.object({
  id: SubjectIdSchema,
  name: LangSchema,
  // Short label for tight spaces such as chart axes; defaults to the first word of the name.
  short: LangSchema.optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  source: z.string(),
  chapters: z.array(RawChapterSchema).min(1),
})
export type RawSubject = z.infer<typeof RawSubjectSchema>
export type RawChapter = z.infer<typeof RawChapterSchema>
export type RawSubtopic = z.infer<typeof RawSubtopicSchema>

// ---- Infographics ----
const ConceptMapSchema = z.object({
  kind: z.literal('concept-map'),
  data: z.object({
    center: LangSchema,
    nodes: z.array(z.object({ label: LangSchema, detail: LangSchema.optional() })).min(2).max(8),
  }),
})
const ProcessSchema = z.object({
  kind: z.literal('process'),
  data: z.object({ steps: z.array(z.object({ title: LangSchema, detail: LangSchema.optional() })).min(2) }),
})
const CycleSchema = z.object({
  kind: z.literal('cycle'),
  data: z.object({ steps: z.array(z.object({ title: LangSchema, detail: LangSchema.optional() })).min(3).max(8) }),
})
const CompareSchema = z.object({
  kind: z.literal('compare'),
  data: z.object({
    headers: z.array(LangSchema).min(2),
    rows: z.array(z.object({ label: LangSchema, cells: z.array(LangSchema) })).min(1),
  }),
})
export const InfographicSchema = z.discriminatedUnion('kind', [ConceptMapSchema, ProcessSchema, CycleSchema, CompareSchema])
export type Infographic = z.infer<typeof InfographicSchema>

// ---- Questions ----
const QBase = {
  id: z.string(),
  subtopicId: z.string(),
  prompt: LangSchema,
  explanation: LangSchema,
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  tp: z.number().int().min(1).max(6).optional(),
}
export const QuestionSchema = z.discriminatedUnion('type', [
  z.object({ ...QBase, type: z.literal('mcq'), options: z.array(LangSchema).min(2), answer: z.number().int().min(0) }),
  z.object({ ...QBase, type: z.literal('multi'), options: z.array(LangSchema).min(2), answer: z.array(z.number().int().min(0)).min(1) }),
  // tolerance is relative (0.02 = ±2%); 0 means exact.
  z.object({ ...QBase, type: z.literal('numeric'), answer: z.number(), tolerance: z.number().min(0).max(0.1).optional(), unit: z.string().optional() }),
  // answer lists every accepted spelling (EN and BM), compared case-insensitively.
  z.object({ ...QBase, type: z.literal('fill'), answer: z.array(z.string().min(1)).min(1) }),
  z.object({ ...QBase, type: z.literal('match'), pairs: z.array(z.object({ left: LangSchema, right: LangSchema })).min(2) }),
  // items are stored in the correct order and shuffled on display.
  z.object({ ...QBase, type: z.literal('order'), items: z.array(LangSchema).min(3) }),
])
export type Question = z.infer<typeof QuestionSchema>
export type QuestionType = Question['type']

// ---- Chapter learning content (content/<subject>/<chapter>.json) ----
export const ChapterContentSchema = z.object({
  chapterId: z.string().regex(/^[a-z0-9]+-\d{2}$/),
  reviewed: z.boolean(),
  intro: z.object({
    hook: LangSchema,
    bigIdeas: z.array(LangSchema).min(1).max(5),
    infographic: InfographicSchema.optional(),
    keyTerms: z.array(z.object({ term: LangSchema, definition: LangSchema })).min(1),
    formulaIds: z.array(z.string()),
    toolId: z.string().optional(),
    workedExample: z.object({ question: LangSchema, steps: z.array(LangSchema).min(1), answer: LangSchema }).optional(),
  }),
  questions: z.array(QuestionSchema),
})
export type ChapterContent = z.infer<typeof ChapterContentSchema>

// ---- Formulas ----
export const FormulaSchema = z.object({
  id: z.string(),
  subtopicId: z.string(),
  latex: z.string(),
  name: LangSchema,
  symbols: z.array(z.object({ symbol: z.string(), meaning: LangSchema, unit: z.string().optional() })),
  whenToUse: LangSchema,
  commonMistake: LangSchema.optional(),
  toolId: z.string().optional(),
})
export const FormulasFileSchema = z.array(FormulaSchema)
export type Formula = z.infer<typeof FormulaSchema>

// ---- Flashcards (content/flashcards/<chapterId>.json) ----
export const FlashcardSchema = z.object({ id: z.string(), subtopicId: z.string(), front: LangSchema, back: LangSchema })
export const FlashcardFileSchema = z.object({ chapterId: z.string(), cards: z.array(FlashcardSchema) })
export type Flashcard = z.infer<typeof FlashcardSchema>

// ---- Form 3 bridge set ----
export const BridgeSchema = z.object({
  subtopics: z.array(z.object({ id: z.string().startsWith('bridge-'), title: LangSchema })),
  questions: z.array(QuestionSchema),
})
export type Bridge = z.infer<typeof BridgeSchema>

// ---- Subtopic notes (content/notes/<chapterId>.json) ----
export const SubtopicNoteSchema = z.object({
  keyPoints: z.array(LangSchema).min(1),
  example: z.object({ question: LangSchema, answer: LangSchema }).optional(),
  tip: LangSchema.optional(),
})
export const NotesFileSchema = z.object({
  chapterId: z.string(),
  reviewed: z.boolean(),
  subtopics: z.record(z.string(), SubtopicNoteSchema),
})
export type SubtopicNote = z.infer<typeof SubtopicNoteSchema>
export type NotesFile = z.infer<typeof NotesFileSchema>
