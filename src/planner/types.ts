import type { SubjectId } from '../content/schema'

export type TaskType = 'intro' | 'quiz' | 'flashcards' | 'formula-drill' | 'tool' | 'review' | 'rest'

/**
 * refId conventions:
 *  intro / review / quiz → chapterId ('phy-02') or subtopicId ('phy-02-01')
 *  quiz → also 'bridge', 'mixed' or 'subject:phy'
 *  tool → toolId
 */
export interface StudyTask {
  id: string
  date: string // 'YYYY-MM-DD'
  type: TaskType
  refId?: string
  subjectId?: SubjectId
  minutes: number
  status: 'todo' | 'done' | 'skipped'
  completedAt?: string
  /** Moved by hand — kept when the plan is regenerated. */
  moved?: boolean
}

export interface Attempt { id: string; questionId: string; subtopicId: string; correct: boolean; at: string; timeMs: number }

export type Box = 1 | 2 | 3 | 4 | 5
export interface CardState { cardId: string; box: Box; due: string }

export interface DateRange { id: string; name: string; from: string; to: string }
export interface Exam { id: string; name: string; date: string }

export interface Settings {
  lang: 'en' | 'bm'
  theme: 'system' | 'light' | 'dark'
  onboarded: boolean
  schoolStart: string
  /** First day the plan was ever generated; phase B (bridge) runs for 14 days from here. */
  planStart: string
  planEnd: string
  exams: Exam[]
  /** Public holidays / rest days: light flashcards only. */
  holidays: DateRange[]
  minutes: { holiday: number; school: number; weekend: number }
  dailyCap: number
  /** 0 = Sunday … 6 = Saturday */
  studyDays: number[]
  confidence: Record<SubjectId, number>
  /** "Class is now on chapter X" markers for the term companion phase. */
  currentChapters: Partial<Record<SubjectId, { chapterId: string; since: string }>>
  reminderTime?: string
  /** Break reminder interval in minutes; 0 = off. */
  breakMinutes: number
  /** Layout: phone-style or wide browser layout; 'auto' picks by screen width. */
  viewMode: 'auto' | 'mobile' | 'desktop'
}
