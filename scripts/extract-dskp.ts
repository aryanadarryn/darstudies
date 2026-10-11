// One-off: DSKP PDFs → syllabus structure (plan §4). Run: npm run extract-dskp
//
// 1. Download the Form 4 DSKP PDFs from the BPK website by hand.
// 2. Save them as content/dskp/<subject>.pdf  (phy, chem, bio, addmath, math).
// 3. Run this script. It writes content/raw/extracted/<subject>.json plus a review report.
//
// It never overwrites content/raw/<subject>.json: copy learning standards across by hand after review.
// Only STRUCTURE is taken (numbers, titles, learning standards) — never notes or questions.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { SUBJECT_IDS } from '../src/content/ids.ts'
import type { RawSubject } from '../src/content/schema.ts'

const ROOT = join(import.meta.dirname, '..', 'content')
const OUT = join(ROOT, 'raw', 'extracted')

async function pdfLines(file: string): Promise<string[]> {
  const doc = await getDocument({ data: new Uint8Array(readFileSync(file)), useSystemFonts: true }).promise
  const lines: string[] = []
  for (let p = 1; p <= doc.numPages; p++) {
    const content = await (await doc.getPage(p)).getTextContent()
    // Group text items into lines by their y position.
    const rows = new Map<number, { x: number; s: string }[]>()
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue
      const y = Math.round(item.transform[5])
      rows.set(y, [...(rows.get(y) ?? []), { x: item.transform[4], s: item.str }])
    }
    for (const y of [...rows.keys()].sort((a, b) => b - a)) {
      lines.push(rows.get(y)!.sort((a, b) => a.x - b.x).map((i) => i.s).join(' ').replace(/\s+/g, ' ').trim())
    }
  }
  return lines
}

interface Extracted { code: string; title: string; learningStandards: { code: string; text: string }[] }

function parse(lines: string[]) {
  const subtopics: Extracted[] = []
  const report: string[] = []
  let current: Extracted | undefined
  let lastLs: { code: string; text: string } | undefined
  for (const line of lines) {
    const ls = line.match(/^(\d{1,2})\.(\d{1,2})\.(\d{1,2})\s+(.+)$/)
    const cs = !ls && line.match(/^(\d{1,2})\.(\d{1,2})\s+([A-Z].+)$/)
    if (cs) {
      const code = `${cs[1]}.${cs[2]}`
      if (subtopics.some((s) => s.code === code)) {
        current = subtopics.find((s) => s.code === code)
        continue // DSKP repeats headings on continuation pages
      }
      current = { code, title: cs[3].trim(), learningStandards: [] }
      subtopics.push(current)
      lastLs = undefined
    } else if (ls && current) {
      const code = `${ls[1]}.${ls[2]}.${ls[3]}`
      if (!code.startsWith(current.code + '.')) {
        report.push(`learning standard ${code} found under ${current.code}`)
        continue
      }
      if (current.learningStandards.some((x) => x.code === code)) continue
      lastLs = { code, text: ls[4].trim() }
      current.learningStandards.push(lastLs)
    } else if (lastLs && /^[a-z(]/.test(line) && line.length < 200) {
      lastLs.text += ' ' + line // wrapped line
    }
  }
  // Gaps in numbering are the most common symptom of messy PDF text.
  for (const s of subtopics) {
    s.learningStandards.forEach((x, i) => {
      if (Number(x.code.split('.')[2]) !== i + 1) report.push(`${s.code}: expected ${s.code}.${i + 1}, found ${x.code}`)
    })
    if (!s.learningStandards.length) report.push(`${s.code}: no learning standards found`)
  }
  return { subtopics, report }
}

mkdirSync(OUT, { recursive: true })
let found = 0
for (const sid of SUBJECT_IDS) {
  const pdf = join(ROOT, 'dskp', `${sid}.pdf`)
  if (!existsSync(pdf)) continue
  found++
  const { subtopics, report } = parse(await pdfLines(pdf))
  // Compare with the hand-entered structure.
  const raw: RawSubject = JSON.parse(readFileSync(join(ROOT, 'raw', `${sid}.json`), 'utf8'))
  const manual = new Set(raw.chapters.flatMap((c) => c.subtopics.map((s) => s.code)))
  const extracted = new Set(subtopics.map((s) => s.code))
  for (const c of manual) if (!extracted.has(c)) report.push(`in raw/${sid}.json but not found in PDF: ${c}`)
  for (const c of extracted) if (!manual.has(c)) report.push(`in PDF but not in raw/${sid}.json: ${c}`)

  writeFileSync(join(OUT, `${sid}.json`), JSON.stringify({ subjectId: sid, source: `${sid}.pdf`, subtopics }, null, 2))
  writeFileSync(join(OUT, `${sid}.report.txt`), report.join('\n') || 'No issues found.')
  console.log(`${sid}: ${subtopics.length} subtopics, ${subtopics.reduce((n, s) => n + s.learningStandards.length, 0)} learning standards, ${report.length} issue(s) → raw/extracted/${sid}.report.txt`)
}
if (!found) console.log('No PDFs found. Save DSKP files as content/dskp/<phy|chem|bio|addmath|math>.pdf and run again.')
