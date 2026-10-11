import { useState } from 'react'
import { useT } from '../i18n/useT'
import { isIOS, useSession } from '../store/session'

/** Android: native install prompt. iPhone: Share → Add to Home Screen instructions. */
export default function InstallPrompt({ dismissible = false }: { dismissible?: boolean }) {
  const { t } = useT()
  const { installEvent, installed, promptInstall } = useSession()
  const [hidden, setHidden] = useState(() => {
    try { return dismissible && localStorage.getItem('install-dismissed') === '1' } catch { return false }
  })
  if (hidden) return null
  if (installed) return dismissible ? null : <p className="text-sm text-teal-700 dark:text-teal-300">{t('me.installed')}</p>
  if (!installEvent && !isIOS()) return null

  const dismiss = () => {
    setHidden(true)
    try { localStorage.setItem('install-dismissed', '1') } catch { /* private mode */ }
  }

  return (
    <div className="card flex items-center gap-3 !bg-teal-50 dark:!bg-teal-950/40">
      <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" className="h-10 w-10 rounded-xl" />
      <div className="flex-1 text-sm">
        {installEvent ? <span>{t('me.installBody')}</span> : <span>{t('me.installIOS')}</span>}
      </div>
      {installEvent && <button className="btn-primary !min-h-9" onClick={promptInstall}>{t('me.install')}</button>}
      {dismissible && <button aria-label={t('common.close')} className="muted px-1 text-lg" onClick={dismiss}>×</button>}
    </div>
  )
}
