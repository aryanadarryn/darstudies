import { Link } from 'react-router-dom'
import { useT } from '../i18n/useT'
import { daysLeft } from './access'
import { useAccount } from './account'
import { AUTH_ENABLED } from './supabase'

/** Signed-in user, access status and subscription actions (Me page). */
export default function AccountCard() {
  const { t, lang } = useT()
  const { session, access, signOut } = useAccount()
  if (!AUTH_ENABLED || !session) return null
  const date = (iso: string) => new Date(iso).toLocaleDateString(lang === 'bm' ? 'ms-MY' : 'en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
  const sub = access?.subscription

  let status: string
  let tone = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
  if (access?.tier === 'full') {
    status = sub && !access.is_admin ? `${t('account.active')} · ${t('account.until')} ${date(sub.current_period_end)}` : t('account.active')
    tone = 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
  } else if (access?.tier === 'trial') {
    status = `${t('account.trial')} · ${daysLeft(access.trial_ends_at)} ${t('account.daysLeft')}`
    tone = 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
  } else {
    status = t('account.trialEnded')
    tone = 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200'
  }

  return (
    <section className="card space-y-3 desk:col-span-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-bold">{t('account.title')}</h2>
          <p className="truncate text-sm muted">{access?.full_name ? `${access.full_name} · ` : ''}{session.user.email}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{status}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {access?.tier !== 'full' && <Link to="/subscribe" className="btn-primary">⭐ {t('account.subscribe')}</Link>}
        {access?.tier === 'full' && sub && !access.is_admin && <Link to="/subscribe" className="btn-secondary">{t('account.renew')}</Link>}
        {access?.is_admin && <Link to="/admin" className="btn-secondary">🛠️ {t('account.admin')}</Link>}
        <button className="btn-ghost" onClick={signOut}>{t('account.signOut')}</button>
      </div>
    </section>
  )
}
