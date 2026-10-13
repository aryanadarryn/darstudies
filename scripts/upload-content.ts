// Uploads chapter content, notes and flashcards to the Supabase `content` table (where RLS decides who can read them).
// Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Run after `npm run validate`.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { SUBJECT_IDS } from '../src/content/ids.ts'
import type { ChapterContent, NotesFile } from '../src/content/schema.ts'

const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to upload content.')
  process.exit(1)
}
const db = createClient(url, key, { auth: { persistSession: false } })
const ROOT = join(import.meta.dirname, '..', 'content')
const read = <T>(file: string) => JSON.parse(readFileSync(file, 'utf8')) as T
const jsonFiles = (dir: string) => (existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith('.json')) : [])
const subjectOf = (chapterId: string) => chapterId.split('-')[0]

type Row = { id: string; kind: string; feature: string; subject_id: string; chapter_id: string; data: unknown; updated_at: string }
const rows: Row[] = []
const now = new Date().toISOString()
const add = (kind: string, feature: string, chapterId: string, data: unknown) =>
  rows.push({ id: `${kind}:${chapterId}`, kind, feature, subject_id: subjectOf(chapterId), chapter_id: chapterId, data, updated_at: now })

for (const s of SUBJECT_IDS) {
  for (const name of jsonFiles(join(ROOT, s))) {
    const ch = read<ChapterContent>(join(ROOT, s, name))
    add('intro', 'learn', ch.chapterId, { reviewed: ch.reviewed, intro: ch.intro })
    add('questions', 'quiz', ch.chapterId, ch.questions)
  }
}
for (const name of jsonFiles(join(ROOT, 'notes'))) {
  const n = read<NotesFile>(join(ROOT, 'notes', name))
  add('notes', 'learn', n.chapterId, n)
}
for (const name of jsonFiles(join(ROOT, 'flashcards'))) {
  const f = read<{ chapterId: string; cards: unknown[] }>(join(ROOT, 'flashcards', name))
  add('flashcards', 'flashcards', f.chapterId, f.cards)
}

for (let i = 0; i < rows.length; i += 50) {
  const { error } = await db.from('content').upsert(rows.slice(i, i + 50))
  if (error) throw new Error(`Upload failed: ${error.message}`)
}
// Remove rows whose source file no longer exists.
const { data: existing, error } = await db.from('content').select('id')
if (error) throw new Error(error.message)
const keep = new Set(rows.map((r) => r.id))
const stale = (existing ?? []).map((r) => r.id as string).filter((id) => !keep.has(id))
if (stale.length) {
  const { error: e } = await db.from('content').delete().in('id', stale)
  if (e) throw new Error(e.message)
}
console.log(`Uploaded ${rows.length} content rows${stale.length ? `, removed ${stale.length} stale` : ''}.`)
