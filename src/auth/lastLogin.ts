// Remembers how this device last signed in, so returning users get their email filled in or one tap for Google.
// Kept after sign-out on purpose; it holds no secrets, only the address and the method.
import type { Session } from '@supabase/supabase-js'
import type { Provider } from './supabase'

const LAST_KEY = 'darstudies-last-login'

export interface LastLogin { method: Provider; email?: string }

export function getLastLogin(): LastLogin | null {
  try { return JSON.parse(localStorage.getItem(LAST_KEY) ?? 'null') as LastLogin | null } catch { return null }
}
export function setLastLogin(last: LastLogin | null) {
  try {
    if (last) localStorage.setItem(LAST_KEY, JSON.stringify(last))
    else localStorage.removeItem(LAST_KEY)
  } catch { /* storage unavailable */ }
}
export const forgetLastLogin = () => setLastLogin(null)

/** Called whenever a session appears, so the next sign-in screen can welcome the user back. */
export function rememberSession(session: Session) {
  const provider = session.user.app_metadata?.provider as string | undefined
  const method: Provider = provider && provider !== 'email' ? (provider as Provider) : 'email'
  setLastLogin({ method, email: session.user.email ?? getLastLogin()?.email })
}
