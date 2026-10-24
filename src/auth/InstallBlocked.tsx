import { useT } from '../i18n/useT'
import { useAccount } from './account'

/** Shown inside an installed app when the signed-in user is not allowed to use the installed version. */
export default function InstallBlocked() {
  const { t } = useT()
  const signOut = useAccount((s) => s.signOut)
  const site = `${location.origin}${import.meta.env.BASE_URL}`
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 p-6 text-center">
      <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" className="h-16 w-16 rounded-2xl" />
      <h1 className="text-xl font-bold">{t('install.blockedTitle')}</h1>
      <p className="muted">{t('install.blockedBody')}</p>
      <a className="btn-primary w-full" href={`${site}subscribe`} target="_blank" rel="noreferrer">⭐ {t('install.upgrade')}</a>
      <a className="btn-secondary w-full" href={site} target="_blank" rel="noreferrer">{t('install.openBrowser')}</a>
      <button className="btn-ghost" onClick={() => void signOut()}>{t('account.signOut')}</button>
    </div>
  )
}
