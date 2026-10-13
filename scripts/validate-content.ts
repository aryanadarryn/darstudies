// Validates all content JSON against the Zod schemas and checks cross-references.
// Runs as `prebuild`, so the build fails on any content error.
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import katex from 'katex'
import type { z } from 'zod'
import {
  RawSubjectSchema, ChapterContentSchema, FormulasFileSchema, FlashcardFileSchema, BridgeSchema, NotesFileSchema, SUBJECT_IDS,
  type Question,
} from '../src/content/schema.ts'
import { chapterId, subtopicId } from '../src/content/ids.ts'
import { TOOL_IDS } from '../src/content/toolIds.ts'

const ROOT = join(import.meta.dirname, '..', 'content')
const errors: string[] = []
const warnings: string[] = []

function load<T extends z.ZodType>(file: string, schema: T): z.infer<T> | undefined {
  let json: unknown
  try {
    json = JSON.parse(readFileSync(file, 'utf8'))
  } catch (e) {
    errors.push(`${file}: invalid JSON — ${(e as Error).message}`)
    return undefined
  }
  const r = schema.safeParse(json)
  if (!r.success) {
    for (const issue of r.error.issues) errors.push(`${file}: ${issue.path.join('.') || '(root)'} — ${issue.message}`)
    return undefined
  }
  return r.data
}

// ---- Structure ----
const chapterIds = new Set<string>()
const subtopicIds = new Set<string>()
for (const s of SUBJECT_IDS) {
  const file = join(ROOT, 'raw', `${s}.json`)
  const subj = load(file, RawSubjectSchema)
  if (!subj) continue
  if (subj.id !== s) errors.push(`${file}: id "${subj.id}" does not match file name`)
  subj.chapters.forEach((ch, i) => {
    if (ch.number !== i + 1) errors.push(`${file}: chapter ${ch.number} out of sequence (expected ${i + 1})`)
    const cid = chapterId(s, ch.number)
    chapterIds.add(cid)
    ch.subtopics.forEach((st, j) => {
      const [major, minor] = st.code.split('.').map(Number)
      if (major !== ch.number || minor !== j + 1) errors.push(`${file}: ${cid} subtopic ${st.code} out of sequence`)
      const sid = subtopicId(cid, st.code)
      if (subtopicIds.has(sid)) errors.push(`${file}: duplicate subtopic ${sid}`)
      subtopicIds.add(sid)
    })
  })
}

// ---- Formulas ----
const formulas = load(join(ROOT, 'formulas.json'), FormulasFileSchema) ?? []
const formulaIds = new Set<string>()
for (const f of formulas) {
  if (formulaIds.has(f.id)) errors.push(`formulas.json: duplicate id ${f.id}`)
  formulaIds.add(f.id)
  if (!subtopicIds.has(f.subtopicId)) errors.push(`formulas.json: ${f.id} → unknown subtopic ${f.subtopicId}`)
  if (f.toolId && !TOOL_IDS.includes(f.toolId)) errors.push(`formulas.json: ${f.id} → unknown tool ${f.toolId}`)
  try {
    katex.renderToString(f.latex, { throwOnError: true })
  } catch (e) {
    errors.push(`formulas.json: ${f.id} → LaTeX does not render: ${(e as Error).message}`)
  }
}

// ---- Questions (shared checks) ----
const questionIds = new Set<string>()
function checkQuestions(file: string, qs: Question[], validSubtopics: Set<string>) {
  for (const q of qs) {
    if (questionIds.has(q.id)) errors.push(`${file}: duplicate question id ${q.id}`)
    questionIds.add(q.id)
    if (!validSubtopics.has(q.subtopicId)) errors.push(`${file}: ${q.id} → unknown subtopic ${q.subtopicId}`)
    if (q.type === 'mcq' && q.answer >= q.options.length) errors.push(`${file}: ${q.id} answer index out of range`)
    if (q.type === 'multi' && q.answer.some((a) => a >= q.options.length)) errors.push(`${file}: ${q.id} answer index out of range`)
  }
}

// ---- Chapter content ----
let written = 0
for (const s of SUBJECT_IDS) {
  const dir = join(ROOT, s)
  if (!existsSync(dir)) continue
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
    const file = join(dir, name)
    const ch = load(file, ChapterContentSchema)
    if (!ch) continue
    written++
    if (`${ch.chapterId}.json` !== name) errors.push(`${file}: chapterId "${ch.chapterId}" does not match file name`)
    if (!chapterIds.has(ch.chapterId)) errors.push(`${file}: chapter ${ch.chapterId} not in syllabus structure`)
    for (const fid of ch.intro.formulaIds) if (!formulaIds.has(fid)) errors.push(`${file}: unknown formulaId ${fid}`)
    if (ch.intro.toolId && !TOOL_IDS.includes(ch.intro.toolId)) errors.push(`${file}: unknown toolId ${ch.intro.toolId}`)
    checkQuestions(file, ch.questions, subtopicIds)
    for (const q of ch.questions) if (!q.subtopicId.startsWith(ch.chapterId + '-')) errors.push(`${file}: ${q.id} belongs to another chapter`)
    if (ch.questions.length < 20) warnings.push(`${ch.chapterId}: ${ch.questions.length} questions (target ≥ 20)`)
    if (!ch.reviewed) warnings.push(`${ch.chapterId}: not reviewed yet (shows "draft" badge)`)
  }
}

// ---- Flashcards ----
const cardIds = new Set<string>()
const flashDir = join(ROOT, 'flashcards')
for (const name of existsSync(flashDir) ? readdirSync(flashDir).filter((n) => n.endsWith('.json')) : []) {
  const file = join(flashDir, name)
  const deck = load(file, FlashcardFileSchema)
  if (!deck) continue
  if (`${deck.chapterId}.json` !== name) errors.push(`${file}: chapterId does not match file name`)
  if (!chapterIds.has(deck.chapterId)) errors.push(`${file}: unknown chapter ${deck.chapterId}`)
  for (const c of deck.cards) {
    if (cardIds.has(c.id)) errors.push(`${file}: duplicate card id ${c.id}`)
    cardIds.add(c.id)
    if (!subtopicIds.has(c.subtopicId)) errors.push(`${file}: ${c.id} → unknown subtopic ${c.subtopicId}`)
  }
  if (deck.cards.length < 15) warnings.push(`${deck.chapterId}: ${deck.cards.length} flashcards (target ≥ 15)`)
}

// ---- Bridge ----
const bridge = load(join(ROOT, 'bridge.json'), BridgeSchema)
if (bridge) checkQuestions('bridge.json', bridge.questions, new Set(bridge.subtopics.map((s) => s.id)))

// ---- Subtopic notes ----
let noteCount = 0
const notesDir = join(ROOT, 'notes')
for (const name of existsSync(notesDir) ? readdirSync(notesDir).filter((n) => n.endsWith('.json')) : []) {
  const file = join(notesDir, name)
  const notes = load(file, NotesFileSchema)
  if (!notes) continue
  if (`${notes.chapterId}.json` !== name) errors.push(`${file}: chapterId does not match file name`)
  if (!chapterIds.has(notes.chapterId)) errors.push(`${file}: unknown chapter ${notes.chapterId}`)
  for (const sid of Object.keys(notes.subtopics)) {
    noteCount++
    if (!subtopicIds.has(sid) || !sid.startsWith(notes.chapterId + '-')) errors.push(`${file}: unknown subtopic ${sid}`)
  }
}

// ---- Manifest: which chapters have content (lets the app list chapters without bundling the content) ----
const listIds = (dir: string) => (existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith('.json')).map((n) => n.replace('.json', '')).sort() : [])
const manifest = {
  written: SUBJECT_IDS.flatMap((s) => listIds(join(ROOT, s))),
  notes: listIds(notesDir),
  flashcards: listIds(flashDir),
}
const manifestFile = join(import.meta.dirname, '..', 'src', 'content', 'manifest.json')
const manifestText = JSON.stringify(manifest, null, 2) + '\n'
if (!existsSync(manifestFile) || readFileSync(manifestFile, 'utf8') !== manifestText) {
  writeFileSync(manifestFile, manifestText)
  console.log('Updated src/content/manifest.json')
}

// ---- Report ----
console.log(`Content: ${chapterIds.size} chapters, ${subtopicIds.size} subtopics, ${written} written chapters, ` +
  `${questionIds.size} questions, ${cardIds.size} flashcards, ${formulaIds.size} formulas, ${noteCount} subtopic notes`)
if (warnings.length) console.log(`\n${warnings.length} warning(s):\n  ` + warnings.join('\n  '))
if (errors.length) {
  console.error(`\n✗ ${errors.length} error(s):\n  ` + errors.join('\n  '))
  process.exit(1)
}
console.log('\n✓ Content valid')
