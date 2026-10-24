// Installing Darstudies as an app is only offered to eligible users (see canInstall in auth/access.ts).
// Browsers only offer "Install app" when the page links a web app manifest, so the link (and the iOS
// home-screen app flag) is added for eligible users and removed for everyone else.
import { useSession } from '../store/session'

const MANIFEST_ID = 'app-manifest'
const IOS_META_ID = 'app-ios-capable'

export function setInstallable(allowed: boolean) {
  const head = document.head
  const link = document.getElementById(MANIFEST_ID)
  const meta = document.getElementById(IOS_META_ID)
  if (allowed) {
    if (!link) {
      const l = document.createElement('link')
      l.id = MANIFEST_ID
      l.rel = 'manifest'
      l.href = `${import.meta.env.BASE_URL}manifest.webmanifest`
      head.appendChild(l)
    }
    if (!meta) {
      const m = document.createElement('meta')
      m.id = IOS_META_ID
      m.name = 'apple-mobile-web-app-capable'
      m.content = 'yes'
      head.appendChild(m)
    }
  } else {
    link?.remove()
    meta?.remove()
    // Drop any install prompt the browser handed over before access was known.
    useSession.setState({ installEvent: null })
  }
}

/** True when running as an installed app (home screen / standalone window). */
export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
