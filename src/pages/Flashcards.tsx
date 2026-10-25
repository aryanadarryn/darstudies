import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from '../components/FormSwitch'
import { chapterOfCard, type Mode, type Result, shuffle } from '../components/flashcards/deck'
import FlipSession from '../components/flashcards/FlipSession'
import MatchGame from '../components/flashcards/MatchGame'
import QuizSession from '../components/flashcards/QuizSession'
import Summary from '../components/flashcards/Summary'
import { Empty, PageHeader, Segmented } from '../components/ui'
import { chapterById, subjectsOf } from '../content'
import { formOf } from '../content/ids'
import type { Flashcard } from '../content/schema'
import { db } from '../db/db'
import { useT } from '../i18n/useT'
import { completeMatching, gradeFlashcard } from '../lib/actions'
import { useFlashcards, useToday } from '../lib/hooks'
import { dueCards } from '../planner/leitner'
import type { CardState } from '../planner/types'
import { SUBJECT_EMOJI } from './Learn'

type Source = 'due' | 'mixed' | 'tricky'
type Phase = { kind: 'setup' } | { kind: 'play'; deck: Flashcard[]; mode: Mode } | { kind: 'done'; mode: Mode; results: Result[]; match?: { seconds: number; mistakes: number; best: number | null } }

const MODES: { id: Mode; icon: string }[] = [{ id: 'flip', icon: '🃏' }, { id: 'reverse', icon: '🔄' }, { id: 'quiz', icon: '🎯' }, { id: 'match', icon: '⚡' }]
const SIZES = [10, 20, 30] as const

function buildDeck(pool: Flashcard[], states: Map<string, CardState>, today: string, source: Source, size: number) {
  if (source === 'due') return dueCards(pool, states, today, size)
  if (source === 'tricky') {
    return pool.filter((c) => (states.get(c.id)?.box ?? 9) <= 2)
      .sort((a, b) => states.get(a.id)!.box - states.get(b.id)!.box || states.get(a.id)!.due.localeCompare(states.get(b.id)!.due))
      .slice(0, size)
  }
  return shuffle(pool).slice(0, size)
}

export default function Flashcards() {
  const { t, L } = useT()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const chapter = params.get('chapter'), taskId = params.get('task')
  const today = useToday()
  const form = useForm()
  const all = useFlashcards()
  const stateRows = useLiveQuery(() => db.cards.toArray(), [])
  const states = useMemo(() => new Map((stateRows ?? []).map((s) => [s.cardId, s])), [stateRows])
  const [phase, setPhase] = useState<Phase>({ kind: 'setup' })
  const [source, setSource] = useState<Source>('due')
  const [mode, setMode] = useState<Mode>('flip')
  const [size, setSize] = useState<number>(20)
  const [subject, setSubject] = useState<string>('all')
  const taskDone = useRef(false)

  const formPool = useMemo(() => (all ?? []).filter((c) => formOf(c.id) === form), [all, form])
  const scopePool = useMemo(() => {
    if (chapter) return (all ?? []).filter((c) => c.id.startsWith(chapter + '-'))
    return subject === 'all' ? formPool : formPool.filter((c) => chapterOfCard(c)?.subjectId === subject)
  }, [all, chapter, formPool, subject])
  const counts = useMemo(() => ({
    due: dueCards(scopePool, states, today, Infinity).length,
    mixed: scopePool.length,
    tricky: scopePool.filter((c) => (states.get(c.id)?.box ?? 9) <= 2).length,
  }), [scopePool, states, today])
  const subjects = useMemo(() => subjectsOf(form).map((s) => ({ s, n: formPool.filter((c) => chapterOfCard(c)?.subjectId === s.id).length })).filter((x) => x.n > 0), [form, formPool])

  // Nothing due in this scope? Start on a mixed set instead of a disabled button.
  useEffect(() => {
    if (source === 'due' && counts.due === 0 && counts.mixed > 0) setSource('mixed')
  }, [counts.due, counts.mixed, source])

  // From a study-plan task: go straight into the due cards.
  useEffect(() => {
    if (!taskId || !all || !stateRows || phase.kind !== 'setup' || taskDone.current) return
    const deck = buildDeck(scopePool, states, today, 'due', 15)
    if (deck.length) setPhase({ kind: 'play', deck, mode: 'flip' })
  }, [taskId, all, stateRows, phase.kind, scopePool, states, today])

  const start = (deck: Flashcard[], m: Mode) => setPhase({ kind: 'play', deck, mode: m })
  const finish = async (m: Mode, results: Result[], match?: { seconds: number; mistakes: number; best: number | null }) => {
    if (taskId && !taskDone.current && m !== 'match') { taskDone.current = true; await completeMatching(taskId, 'flashcards') }
    setPhase({ kind: 'done', mode: m, results, match })
  }
  const grade = (card: Flashcard, correct: boolean) => gradeFlashcard(card.id, correct)
  const box = (id: string) => states.get(id)?.box ?? 0

  const subtitle = chapter && chapterById[chapter] ? L(chapterById[chapter].title) : undefined
  const loading = !all || !stateRows

  return (
    <div className="desk:mx-auto desk:max-w-xl">
      <PageHeader back title={`🃏 ${t('flash.title')}`} subtitle={subtitle} />
      {loading ? (
        <div className="py-10 text-center muted">{t('common.loading')}</div>
      ) : phase.kind === 'play' ? (
        phase.mode === 'quiz' ? <QuizSession deck={phase.deck} pool={formPool} onGrade={grade} onFinish={(r) => finish('quiz', r)} />
          : phase.mode === 'match' ? <MatchGame deck={phase.deck} onFinish={(r, seconds, mistakes, best) => finish('match', r, { seconds, mistakes, best })} />
            : <FlipSession deck={phase.deck} reverse={phase.mode === 'reverse'} box={box} onGrade={grade} onFinish={(r) => finish(phase.mode, r)} />
      ) : phase.kind === 'done' ? (
        <Summary mode={phase.mode} results={phase.results} match={phase.match}
          onAgain={() => start(shuffle(phase.results.filter((r) => !r.correct).map((r) => r.card)), phase.mode)}
          onNew={() => setPhase({ kind: 'setup' })} onDone={() => nav(-1)} />
      ) : scopePool.length === 0 ? (
        <Empty icon="🃏">{t('flash.none')}</Empty>
      ) : (
        <div className="space-y-4">
          <section className="card space-y-2">
            <h2 className="text-sm font-semibold">{t('flash.setup.source')}</h2>
            <div className="grid grid-cols-3 gap-2">
              {(['due', 'mixed', 'tricky'] as const).map((s) => (
                <button key={s} onClick={() => setSource(s)} disabled={counts[s] === 0}
                  className={`rounded-2xl border-2 p-2 text-center text-sm transition disabled:opacity-40 ${source === s ? 'border-violet-600 bg-violet-50 dark:bg-violet-950/40' : 'border-slate-200 dark:border-slate-700'}`}>
                  <div className="text-xl">{s === 'due' ? '⏰' : s === 'mixed' ? '🎲' : '🧩'}</div>
                  <div className="font-semibold">{t(`flash.src.${s}` as const)}</div>
                  <div className="text-xs muted">{counts[s]} {t('flash.cardsAvailable')}</div>
                </button>
              ))}
            </div>
            {source === 'tricky' && <p className="text-xs muted">{t('flash.boxLegend')}</p>}
          </section>

          {!chapter && subjects.length > 1 && (
            <section className="card space-y-2">
              <h2 className="text-sm font-semibold">{t('flash.setup.subject')}</h2>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setSubject('all')} className={`rounded-full border px-3 py-1 text-sm ${subject === 'all' ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-300 dark:border-slate-600'}`}>{t('flash.allSubjects')}</button>
                {subjects.map(({ s, n }) => (
                  <button key={s.id} onClick={() => setSubject(s.id)} className="rounded-full border px-3 py-1 text-sm"
                    style={subject === s.id ? { backgroundColor: s.color, borderColor: s.color, color: 'white' } : undefined}>
                    {SUBJECT_EMOJI[s.id] ?? '📘'} {L(s.short ?? s.name)} <span className="opacity-70">{n}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="card space-y-2">
            <h2 className="text-sm font-semibold">{t('flash.setup.mode')}</h2>
            <div className="grid grid-cols-2 gap-2">
              {MODES.map((m) => (
                <button key={m.id} onClick={() => setMode(m.id)}
                  className={`rounded-2xl border-2 p-3 text-left transition ${mode === m.id ? 'border-violet-600 bg-violet-50 dark:bg-violet-950/40' : 'border-slate-200 dark:border-slate-700'}`}>
                  <div className="text-xl">{m.icon}</div>
                  <div className="text-sm font-semibold">{t(`flash.mode.${m.id}` as const)}</div>
                  <div className="text-xs muted">{t(`flash.mode.${m.id}Desc` as const)}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="card flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">{t('flash.setup.size')}</h2>
            <Segmented value={String(size)} options={SIZES.map((n) => ({ value: String(n), label: String(n) }))} onChange={(v) => setSize(Number(v))} />
          </section>

          <button className="btn-primary w-full !min-h-14 text-lg" disabled={counts[source] === 0}
            onClick={() => start(buildDeck(scopePool, states, today, source, size), mode)}>
            ▶️ {t('flash.start')}
          </button>
          {counts.due === 0 && source === 'due' && <p className="text-center text-sm muted">{t('flash.empty')}</p>}
        </div>
      )}
    </div>
  )
}
