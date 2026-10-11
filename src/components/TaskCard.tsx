import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { completeTask, reopenTask } from '../lib/actions'
import { useTaskInfo } from '../lib/taskInfo'
import { useT } from '../i18n/useT'
import type { StudyTask } from '../planner/types'
import { toast } from './ui'

export default function TaskCard({ task, showStart = true, onMenu }: { task: StudyTask; showStart?: boolean; onMenu?: () => void }) {
  const info = useTaskInfo()(task)
  const { t } = useT()
  const done = task.status === 'done'
  const skipped = task.status === 'skipped'

  const toggle = async () => {
    if (done) await reopenTask(task.id)
    else {
      await completeTask(task.id)
      toast(`+${10 + task.minutes} XP`)
    }
  }

  return (
    <motion.div layout className={`card relative flex items-center gap-3 overflow-hidden !py-3 pl-5 ${done || skipped ? 'opacity-60' : ''}`}>
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: info.color }} />
      <button
        onClick={toggle}
        aria-label={done ? 'Mark as not done' : 'Mark as done'}
        aria-pressed={done}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition ${done ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 dark:border-slate-600'}`}
      >
        {done && <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>}
      </button>
      <div className="min-w-0 flex-1" onClick={onMenu}>
        <div className={`flex items-center gap-1.5 text-sm font-semibold ${done ? 'line-through' : ''}`}>
          <span aria-hidden>{info.icon}</span>
          <span className="truncate">{info.title}</span>
        </div>
        {info.subtitle && <div className="truncate text-xs muted">{info.subtitle}</div>}
      </div>
      <span className="shrink-0 text-xs muted tabular-nums">{task.minutes} {t('common.min')}</span>
      {showStart && !done && !skipped && (
        <Link to={info.href} className="btn-primary !min-h-9 shrink-0 !px-3 !text-xs">{t('common.start')}</Link>
      )}
      {onMenu && (
        <button onClick={onMenu} aria-label="Task options" className="-mr-2 flex h-9 w-7 shrink-0 items-center justify-center muted">⋮</button>
      )}
    </motion.div>
  )
}
