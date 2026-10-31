// Session + access state. Access is cached on the device so the app still opens offline.
import type { Session } from '@supabase/supabase-js'
import { useCallback } from 'react'
import { create } from 'zustand'
import { resetContentMemo } from '../content'
import { clearContentCache } from '../content/remote'
import { type Access, canUse, type Feature } from './access'
import { rememberSession } from './lastLogin'
import { AUTH_ENABLED, supabase } from './supabase'
import { useSettings } from '../store/settings'

const CACHE_KEY = 'darstudies-access'

interface AccountState {
  ready: boolean
  session: Session | null
  /** undefined when accounts are switched off (everything open). */
  access: Access | null | undefined
  /** An email/OAuth link came back but could not sign the user in (expired, or opened in another browser). */
  linkFailed: boolean
  init: () => Promise<void>
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

function readCache(userId: string): Access | null {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null')
    return c?.userId === userId ? (c.access as Access) : null
  } catch {
    return null
  }
}
function writeCache(userId: string, access: Access | null) {
  try {
    if (access) localStorage.setItem(CACHE_KEY, JSON.stringify({ userId, access }))
    else localStorage.removeItem(CACHE_KEY)
  } catch { /* storage unavailable */ }
}

let started = false

export const useAccount = create<AccountState>((set, get) => ({
  ready: !AUTH_ENABLED,
  session: null,
  access: AUTH_ENABLED ? null : undefined,
  linkFailed: false,

  init: async () => {
    if (!supabase || started) return
    started = true
    const returned = /[?&#](code|error|error_code)=/.test(location.search + location.hash)
    const { data } = await supabase.auth.getSession()
    set({ session: data.session, linkFailed: returned && !data.session })
    // Drop the one-time code or error from the address bar so a reload doesn't retry it.
    if (returned) {
      const u = new URL(location.href)
      for (const k of ['code', 'error', 'error_code', 'error_description']) u.searchParams.delete(k)
      if (/error|access_token/.test(u.hash)) u.hash = ''
      history.replaceState(history.state, '', u)
    }
    if (data.session) {
      rememberSession(data.session)
      const cached = readCache(data.session.user.id)
      set({ access: cached })
      // Returning users open straight away on their saved access; the server check updates it in the background.
      if (cached) void get().refresh()
      else await get().refresh()
    }
    set({ ready: true })
    supabase.auth.onAuthStateChange((event, session) => {
      const prev = get().session?.user.id
      set({ session })
      if (!session) {
        set({ access: null })
        return
      }
      if (event === 'SIGNED_IN' && prev !== session.user.id) {
        rememberSession(session)
        set({ linkFailed: false, access: readCache(session.user.id) })
        // Defer: calling Supabase inside this callback can deadlock the auth client.
        setTimeout(() => void get().refresh(), 0)
      }
    })
  },

  refresh: async () => {
    const session = get().session
    if (!supabase || !session) return
    const { data, error } = await supabase.rpc('get_my_access')
    if (error) return // offline: keep the cached access
    const before = get().access
    const access = (data ?? null) as Access | null
    writeCache(session.user.id, access)
    set({ access })
    if (JSON.stringify(before?.subjects) !== JSON.stringify(access?.subjects) || JSON.stringify(before?.features) !== JSON.stringify(access?.features) || before?.tier !== access?.tier) {
      resetContentMemo()
    }
  },

  signOut: async () => {
    const id = get().session?.user.id
    if (id) writeCache(id, null)
    await clearContentCache()
    resetContentMemo()
    await supabase?.auth.signOut()
    set({ session: null, access: null })
  },
}))

/** `can('quiz', 'phy')` — true when the signed-in user may use a feature (for a subject). */
export function useCan() {
  const access = useAccount((s) => s.access)
  const form = useSettings((s) => s.settings.form ?? 4)
  return useCallback((feature: Feature, subject?: string) => canUse(access, feature, subject, form), [access, form])
}

/** Non-hook version for plain functions (e.g. plan generation). */
export const canNow = (feature: Feature, subject?: string) =>
  canUse(useAccount.getState().access, feature, subject, useSettings.getState().settings.form ?? 4)
