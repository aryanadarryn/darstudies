// Remembers how this device last signed in, so returning users get one tap instead of retyping their email.
// Kept after sign-out on purpose; it holds no secrets, only the address and the method.
import type { Session } from '@supabase/supabase-js'
import type { Provider } from './supabase'

const LAST_KEY = 'darstudies-last-login'
const PENDING_KEY = 'darstudies-pending-email'
/** Supabase email codes are valid for an hour by default. */
const PENDING_MS = 60 * 60 * 1000

export interface LastLogin { method: Provider; email?: string }
export interface PendingEmail { email: string; sentAt: number }

function read<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null } catch { return null }
}
function write(key: string, value: unknown) {
  try {
    if (value) localStorage.setItem(key, JSON.stringify(value))
    else localStorage.removeItem(key)
  } catch { /* storage unavailable */ }
}

export const getLastLogin = () => read<LastLogin>(LAST_KEY)
export const setLastLogin = (last: LastLogin) => write(LAST_KEY, last)
export const forgetLastLogin = () => write(LAST_KEY, null)

/** Called whenever a session appears, so the next sign-in screen can say "Continue as …". */
export function rememberSession(session: Session) {
  const provider = session.user.app_metadata?.provider as string | undefined
  const method: Provider = provider && provider !== 'email' ? (provider as Provider) : 'email'
  setLastLogin({ method, email: session.user.email ?? getLastLogin()?.email })
  write(PENDING_KEY, null)
}

/** An email code that was sent recently, so reopening the app returns to the code box. */
export function getPending(): PendingEmail | null {
  const p = read<PendingEmail>(PENDING_KEY)
  return p && Date.now() - p.sentAt < PENDING_MS ? p : null
}
export const setPending = (p: PendingEmail | null) => write(PENDING_KEY, p)
