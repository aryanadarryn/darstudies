import Dexie, { type Table } from 'dexie'
import type { Attempt, CardState, StudyTask } from '../planner/types'

export interface IntroProgress {
  chapterId: string
  /** Indices of completed intro sections (0–7). */
  sections: number[]
  completedAt?: string // 'YYYY-MM-DD'
}

export interface KV { key: string; value: unknown }

class StudyDB extends Dexie {
  tasks!: Table<StudyTask, string>
  attempts!: Table<Attempt, string>
  cards!: Table<CardState, string>
  intros!: Table<IntroProgress, string>
  kv!: Table<KV, string>

  constructor() {
    super('sainsku-f4')
    this.version(1).stores({
      tasks: 'id, date, status, type',
      attempts: 'id, questionId, subtopicId, at',
      cards: 'cardId, due',
      intros: 'chapterId',
      kv: 'key',
    })
  }
}

export const db = new StudyDB()

export const TABLES = ['tasks', 'attempts', 'cards', 'intros', 'kv'] as const

export async function getKV<T>(key: string, fallback: T): Promise<T> {
  const row = await db.kv.get(key)
  return row ? (row.value as T) : fallback
}
export const setKV = (key: string, value: unknown) => db.kv.put({ key, value })

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`)
