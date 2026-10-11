// Pomodoro-style break reminder (plan §8.7): counts active time on study screens only.
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useT } from '../i18n/useT'
import { useSession } from '../store/session'
import { useSettings } from '../store/settings'
import { Sheet } from './ui'

const STUDY_ROUTES = /^\/(learn\/[^/]+\/|practice\/)/
const BREAK_SECONDS = 5 * 60

export default function BreakReminder() {
  const { t } = useT()
  const { pathname } = useLocation()
  const breakMinutes = useSettings((s) => s.settings.breakMinutes)
  const { studySeconds, tick, resetBreak } = useSession()
  const [snoozeUntil, setSnoozeUntil] = useState(0)
  const [breakLeft, setBreakLeft] = useState<number | null>(null)

  const studying = STUDY_ROUTES.test(pathname)
  useEffect(() => {
    if (!studying || !breakMinutes) return
    const id = setInterval(() => { if (document.visibilityState === 'visible') tick(5) }, 5000)
    return () => clearInterval(id)
  }, [studying, breakMinutes, tick])

  useEffect(() => {
    if (breakLeft === null || breakLeft <= 0) return
    const id = setTimeout(() => setBreakLeft(breakLeft - 1), 1000)
    return () => clearTimeout(id)
  }, [breakLeft])

  const due = !!breakMinutes && studySeconds >= breakMinutes * 60 && studySeconds >= snoozeUntil
  const open = due || breakLeft !== null

  const close = () => {
    setBreakLeft(null)
    resetBreak()
    setSnoozeUntil(0)
  }

  return (
    <Sheet open={open} onClose={() => (breakLeft === null ? setSnoozeUntil(studySeconds + 5 * 60) : close())} title={`🧘 ${t('break.title')}`}>
      {breakLeft === null ? (
        <>
          <p className="mb-4 muted">{t('break.body')}</p>
          <div className="flex gap-2">
            <button className="btn-secondary flex-1" onClick={() => setSnoozeUntil(studySeconds + 5 * 60)}>{t('break.later')}</button>
            <button className="btn-primary flex-1" onClick={() => setBreakLeft(BREAK_SECONDS)}>{t('break.start')}</button>
          </div>
        </>
      ) : breakLeft > 0 ? (
        <div className="py-6 text-center">
          <div className="text-5xl font-bold tabular-nums">{Math.floor(breakLeft / 60)}:{String(breakLeft % 60).padStart(2, '0')}</div>
          <button className="btn-ghost mt-4" onClick={close}>{t('common.skip')}</button>
        </div>
      ) : (
        <div className="py-4 text-center">
          <p className="mb-4 text-lg font-semibold">{t('break.over')}</p>
          <button className="btn-primary w-full" onClick={close}>{t('common.close')}</button>
        </div>
      )}
    </Sheet>
  )
}
