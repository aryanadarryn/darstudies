// Protected content from Supabase (only rows the user may read come back — see the RLS policy on `content`).
// Network first, with a copy kept in IndexedDB so content already opened still works offline.
import { supabase } from '../auth/supabase'
import { db } from '../db/db'

async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  try {
    const data = await fetcher()
    await db.contentCache.put({ key, data, at: new Date().toISOString() })
    return data
  } catch (e) {
    const hit = await db.contentCache.get(key)
    if (hit) return hit.data as T
    throw e
  }
}

/** One row's data, or undefined when it does not exist or the user may not read it. */
export function fetchRow<T>(id: string): Promise<T | undefined> {
  return cached(`row:${id}`, async () => {
    const { data, error } = await supabase!.from('content').select('data').eq('id', id).maybeSingle()
    if (error) throw error
    return (data?.data ?? undefined) as T | undefined
  })
}

/** Data of every readable row of one kind. */
export function fetchKind<T>(kind: 'questions' | 'flashcards'): Promise<T[]> {
  return cached(`kind:${kind}`, async () => {
    const { data, error } = await supabase!.from('content').select('data').eq('kind', kind)
    if (error) throw error
    return (data ?? []).map((r) => r.data as T)
  })
}

export const clearContentCache = () => db.contentCache.clear()
