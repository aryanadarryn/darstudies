// Helpers shared by the flashcard study modes.
import { chapterById, subjectById } from '../../content'
import type { Flashcard, Lang } from '../../content/schema'

export type Mode = 'flip' | 'reverse' | 'quiz' | 'match'
export interface Result { card: Flashcard; correct: boolean }

export const chapterOfCard = (c: Flashcard) => chapterById[c.id.split('-').slice(0, 2).join('-')]
export const colorOfCard = (c: Flashcard) => {
  const ch = chapterOfCard(c)
  return ch ? subjectById[ch.subjectId].color : '#6d28d9'
}

export function shuffle<T>(xs: T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** A clue built from the answer itself: first letter of each word, digits as #. "Brain + spinal cord" → "B… + s… c…". */
export function autoHint(text: string): string {
  return text.split(/\s+/).map((w) => {
    if (!w) return w
    if (/^[^\p{L}\p{N}]+$/u.test(w)) return w
    if (/^\d/.test(w)) return w.replace(/\d/g, '#')
    return `${[...w][0]}…`
  }).join(' ')
}

/**
 * Wrong answers for the quick quiz: other cards' backs, same chapter first, then the same subject,
 * never repeating the correct answer's text.
 */
export function distractors(card: Flashcard, pool: Flashcard[], lang: keyof Lang, n = 3): Flashcard[] {
  const ch = chapterOfCard(card)
  const answer = card.back[lang].trim().toLowerCase()
  const seen = new Set([answer])
  const pick: Flashcard[] = []
  const take = (cands: Flashcard[]) => {
    for (const c of shuffle(cands)) {
      if (pick.length >= n) return
      const key = c.back[lang].trim().toLowerCase()
      if (c.id === card.id || seen.has(key)) continue
      seen.add(key)
      pick.push(c)
    }
  }
  take(pool.filter((c) => c.id.startsWith(card.id.split('-').slice(0, 2).join('-') + '-')))
  if (ch) take(pool.filter((c) => chapterOfCard(c)?.subjectId === ch.subjectId))
  take(pool)
  return pick
}

/** Reads text aloud when the device supports speech (works offline on most phones). */
export function speak(text: string, lang: 'en' | 'bm') {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang === 'bm' ? 'ms-MY' : 'en-GB'
  u.rate = 0.95
  window.speechSynthesis.speak(u)
}
export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window
