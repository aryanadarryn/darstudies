import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Flashcard } from '../../content/schema'
import { useT } from '../../i18n/useT'
import { colorOfCard, type Result, shuffle } from './deck'

const PAIRS_PER_ROUND = 5
const BEST_KEY = 'flash-match-best'

interface Props { deck: Flashcard[]; onFinish: (results: Result[], seconds: number, mistakes: number, best: number | null) => void }

const readBest = (): number | null => {
  try { const v = Number(localStorage.getItem(BEST_KEY)); return v > 0 ? v : null } catch { return null }
}

/** Match game: tap a term, then its meaning. Rounds of five pairs against the clock. Practice only (no box changes). */
export default function MatchGame({ deck, onFinish }: Props) {
  const { t, L } = useT()
  const rounds = useMemo(() => {
    const r: Flashcard[][] = []
    for (let k = 0; k < deck.length; k += PAIRS_PER_ROUND) r.push(deck.slice(k, k + PAIRS_PER_ROUND))
    return r
  }, [deck])
  const [round, setRound] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [wrongPair, setWrongPair] = useState<[string, string] | null>(null)
  const [mistakes, setMistakes] = useState(0)
  const missed = useRef(new Set<string>())
  const started = useRef(Date.now())
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(id) }, [])

  const cards = rounds[round]
  const terms = useMemo(() => shuffle(cards), [cards])
  const meanings = useMemo(() => shuffle(cards), [cards])
  const seconds = Math.floor((now - started.current) / 1000)

  const tapMeaning = (id: string) => {
    if (!selected || matched.has(id)) return
    if (id === selected) {
      const next = new Set(matched).add(id)
      setMatched(next)
      setSelected(null)
      if (next.size === cards.length) {
        if (round + 1 < rounds.length) {
          setTimeout(() => { setRound(round + 1); setMatched(new Set()) }, 350)
        } else {
          const total = Math.round((Date.now() - started.current) / 1000)
          const prev = readBest()
          const best = deck.length >= PAIRS_PER_ROUND && (!prev || total < prev) ? total : prev
          try { if (best) localStorage.setItem(BEST_KEY, String(best)) } catch { /* storage unavailable */ }
          onFinish(deck.map((c) => ({ card: c, correct: !missed.current.has(c.id) })), total, mistakes, best)
        }
      }
    } else {
      missed.current.add(selected).add(id)
      setMistakes((m) => m + 1)
      setWrongPair([selected, id])
      setSelected(null)
      setTimeout(() => setWrongPair(null), 500)
    }
  }

  const tile = (active: boolean, done: boolean, wrong: boolean) =>
    `card w-full !p-3 text-left text-sm transition ${done ? 'pointer-events-none opacity-30' : ''} ${wrong ? '!border-red-500 animate-pulse' : ''} ${active ? '!border-2 shadow-md' : ''}`

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm font-semibold">
        <span>{t('flash.round')} {round + 1}/{rounds.length}</span>
        <span className="tabular-nums">⏱️ {seconds}s · ❌ {mistakes}</span>
      </div>
      <p className="text-center text-xs muted">{t('flash.matchTitle')}</p>
      <motion.div key={round} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          {terms.map((c) => (
            <button key={c.id} className={tile(selected === c.id, matched.has(c.id), wrongPair?.[0] === c.id)}
              style={selected === c.id ? { borderColor: colorOfCard(c) } : undefined} onClick={() => setSelected(c.id)}>
              <span className="font-semibold">{L(c.front)}</span>
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {meanings.map((c) => (
            <button key={c.id} className={tile(false, matched.has(c.id), wrongPair?.[1] === c.id)} onClick={() => tapMeaning(c.id)}>
              {L(c.back)}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
