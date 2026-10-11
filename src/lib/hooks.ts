import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { loadAllFlashcards } from '../content'
import type { Flashcard } from '../content/schema'
import { db } from '../db/db'
import { todayISO } from '../planner/dates'
import { buildMastery } from './progress'

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): { data: T | undefined; error: unknown; loading: boolean } {
  const [state, setState] = useState<{ data: T | undefined; error: unknown; loading: boolean }>({ data: undefined, error: undefined, loading: true })
  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true }))
    fn().then(
      (data) => alive && setState({ data, error: undefined, loading: false }),
      (error) => alive && setState({ data: undefined, error, loading: false }),
    )
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return state
}

export const useFlashcards = () => useAsync<Flashcard[]>(loadAllFlashcards, []).data

/** Today's date, refreshed when the app comes back to the foreground after midnight. */
export function useToday() {
  const [today, setToday] = useState(todayISO())
  useEffect(() => {
    const check = () => setToday(todayISO())
    document.addEventListener('visibilitychange', check)
    const id = setInterval(check, 60_000)
    return () => { document.removeEventListener('visibilitychange', check); clearInterval(id) }
  }, [])
  return today
}

export function useMastery() {
  const attempts = useLiveQuery(() => db.attempts.toArray(), [])
  const cards = useLiveQuery(() => db.cards.toArray(), [])
  const intros = useLiveQuery(() => db.intros.toArray(), [])
  const flashcards = useFlashcards()
  return useMemo(
    () => (attempts && cards && intros && flashcards ? buildMastery(attempts, cards, intros, flashcards) : undefined),
    [attempts, cards, intros, flashcards],
  )
}
