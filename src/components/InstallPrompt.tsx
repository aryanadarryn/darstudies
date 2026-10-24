import { useState } from 'react'
import { Link } from 'react-router-dom'
import { canInstall } from '../auth/access'
import { useAccount } from '../auth/account'
import { AUTH_ENABLED } from '../auth/supabase'
import { useT } from '../i18n/useT'
import { isIOS, useSession } from '../store/session'

/**
 * Android: native install prompt. iPhone: Share → Add to Home Screen instructions.
 * Only for users allowed to install; on the Me page others see which plan includes it.
 */
export default function InstallPrompt({ dismissible = false }: { dismissible?: boolean }) {
  const { t } = useT()
  const { installEvent, installed, promptInstall } = useSession()
  const access = useAccount((s) => s.access)
  const [hidden, setHidden] = useState(() => {
    try { return dismissible && localStorage.getItem('install-dismissed') === '1' } catch { return false }
  })
  if (hidden) return null
  if (!canInstall(access)) {
    if (dismissible || !AUTH_ENABLED) return null
    return (
      <div className="card flex items-center gap-3 !bg-violet-50 dark:!bg-violet-950/40">
        <span className="text-2xl" aria-hidden>📲</span>
        <div className="flex-1 text-sm">{t('install.perk')}</div>
        <Link to="/subscribe" className="btn-primary !min-h-9">{t('install.upgrade')}</Link>
      </div>
    )
  }
  if (installed) return dismissible ? null : <p className="text-sm text-violet-700 dark:text-violet-300">{t('me.installed')}</p>
  if (!installEvent && !isIOS()) return null

  const dismiss = () => {
    setHidden(true)
    try { localStorage.setItem('install-dismissed', '1') } catch { /* private mode */ }
  }

  return (
    <div className="card flex items-center gap-3 !bg-violet-50 dark:!bg-violet-950/40">
      <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" className="h-10 w-10 rounded-xl" />
      <div className="flex-1 text-sm">
        {installEvent ? <span>{t('me.installBody')}</span> : <span>{t('me.installIOS')}</span>}
      </div>
      {installEvent && <button className="btn-primary !min-h-9" onClick={promptInstall}>{t('me.install')}</button>}
      {dismissible && <button aria-label={t('common.close')} className="muted px-1 text-lg" onClick={dismiss}>×</button>}
    </div>
  )
}
