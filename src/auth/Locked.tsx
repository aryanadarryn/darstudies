import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/ui'
import { useT } from '../i18n/useT'
import { daysLeft, type Feature } from './access'
import { useAccount, useCan } from './account'

/** Shown instead of a page or section the user may not open. */
export function LockedPanel({ subject }: { subject?: boolean }) {
  const { t } = useT()
  return (
    <div className="card flex flex-col items-center gap-3 py-10 text-center">
      <div className="text-4xl" aria-hidden>🔒</div>
      <div className="font-bold">{t('lock.title')}</div>
      <p className="max-w-xs text-sm muted">{t(subject ? 'lock.subject' : 'lock.feature')}</p>
      <Link to="/subscribe" className="btn-primary">{t('lock.cta')}</Link>
    </div>
  )
}

/** Renders children only when the feature (for the subject) is unlocked. */
export function Gate({ feature, subject, children }: { feature: Feature; subject?: string; children: ReactNode }) {
  const can = useCan()
  if (can(feature, subject)) return <>{children}</>
  // A subject that is open for other features means the feature itself is locked.
  return <LockedPanel subject={!!subject && !can('learn', subject) && !can('quiz', subject)} />
}

/** Route wrapper for whole features (quiz, flashcards, drill, tools, planner). */
export function GatedPage({ feature, children }: { feature: Feature; children: ReactNode }) {
  const can = useCan()
  const { t } = useT()
  if (can(feature)) return <>{children}</>
  return (
    <div>
      <PageHeader back title={t('lock.title')} />
      <LockedPanel />
    </div>
  )
}

/** Small banner with the trial countdown and a subscribe link (hidden for subscribers). */
export function TrialBanner() {
  const { t } = useT()
  const access = useAccount((s) => s.access)
  if (!access || access.tier === 'full') return null
  const left = daysLeft(access.trial_ends_at)
  return (
    <Link to="/subscribe" className={`mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${access.tier === 'trial' ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-100'}`}>
      <span aria-hidden>{access.tier === 'trial' ? '⏳' : '🔒'}</span>
      <span className="flex-1">{access.tier === 'trial' ? `${t('account.trial')} · ${left} ${t('account.daysLeft')}` : t('account.trialEnded')}</span>
      <span className="underline">{t('lock.cta')} →</span>
    </Link>
  )
}

export function LockBadge({ className = '' }: { className?: string }) {
  return <span className={`text-sm ${className}`} aria-label="Locked" title="Locked">🔒</span>
}
