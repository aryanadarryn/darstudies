// Supabase client. When VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set, accounts are switched off and the
// app runs fully offline with all content bundled (the original behaviour).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const AUTH_ENABLED = !!(url && anonKey)

export const supabase: SupabaseClient | null = AUTH_ENABLED
  // Implicit flow: an email link signs in whichever browser opens it (Gmail's in-app browser, another browser…).
  // PKCE only worked in the browser that asked for the link, so many email sign-ins silently failed.
  ? createClient(url!, anonKey!, { auth: { flowType: 'implicit', persistSession: true, detectSessionInUrl: true } })
  : null

export type Provider = 'google' | 'apple' | 'facebook' | 'azure' | 'email'
const ALL_PROVIDERS: Provider[] = ['google', 'apple', 'facebook', 'azure', 'email']

/** Sign-in options shown on the login page (VITE_AUTH_PROVIDERS, comma-separated; defaults to all). */
export const PROVIDERS: Provider[] = ((import.meta.env.VITE_AUTH_PROVIDERS as string | undefined) || ALL_PROVIDERS.join(','))
  .split(',').map((p) => p.trim()).filter((p): p is Provider => (ALL_PROVIDERS as string[]).includes(p))

/** PROVIDERS minus any switched off in the Supabase dashboard (falls back to PROVIDERS offline). */
export async function enabledProviders(): Promise<Provider[]> {
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: anonKey! } })
    const external = (await res.json()).external as Record<string, boolean> | undefined
    return external ? PROVIDERS.filter((p) => external[p]) : PROVIDERS
  } catch {
    return PROVIDERS
  }
}

/** Where OAuth providers and email links send the user back to. */
export const REDIRECT_URL = () => `${location.origin}${import.meta.env.BASE_URL}`

/** Calls a Supabase Edge Function and returns its JSON, throwing the function's error message on failure. */
export async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('Accounts are not configured')
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) {
    let message = error.message
    try { message = (await (error as { context?: Response }).context?.json())?.error ?? message } catch { /* keep default */ }
    throw new Error(message)
  }
  return data as T
}
