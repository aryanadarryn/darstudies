import { useState, type ReactNode } from 'react'
import { useT } from '../i18n/useT'
import { useSettings } from '../store/settings'
import { PROVIDERS, REDIRECT_URL, supabase, type Provider } from './supabase'

const ICON: Record<Exclude<Provider, 'email'>, ReactNode> = {
  google: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  ),
  apple: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M16.4 12.7c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.8-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9a5 5 0 0 0-4.2 2.6c-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.6-1-2.6-4.1zM13.9 5.1c.7-.9 1.2-2.1 1.1-3.3-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.2 1.1.1 2.3-.6 3-1.5z" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z" />
    </svg>
  ),
  azure: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#F25022" d="M1 1h10.5v10.5H1z" /><path fill="#7FBA00" d="M12.5 1H23v10.5H12.5z" />
      <path fill="#00A4EF" d="M1 12.5h10.5V23H1z" /><path fill="#FFB900" d="M12.5 12.5H23V23H12.5z" />
    </svg>
  ),
}

export default function Login() {
  const { t } = useT()
  const { settings, update } = useSettings()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const oauth = async (provider: Exclude<Provider, 'email'>) => {
    if (!navigator.onLine) return setMessage({ ok: false, text: t('auth.offline') })
    setBusy(provider)
    setMessage(null)
    const { error } = await supabase!.auth.signInWithOAuth({
      provider,
      // Microsoft needs the email scope to return the address.
      options: { redirectTo: REDIRECT_URL(), scopes: provider === 'azure' ? 'email' : undefined },
    })
    if (error) {
      setBusy(null)
      setMessage({ ok: false, text: t('auth.error') })
    }
  }

  const emailLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!navigator.onLine) return setMessage({ ok: false, text: t('auth.offline') })
    setBusy('email')
    const { error } = await supabase!.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: REDIRECT_URL() } })
    setBusy(null)
    setMessage(error ? { ok: false, text: t('auth.error') } : { ok: true, text: t('auth.linkSent') })
  }

  const oauthProviders = PROVIDERS.filter((p): p is Exclude<Provider, 'email'> => p !== 'email')

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" className="mx-auto h-16 w-16 rounded-2xl" />
          <h1 className="mt-3 text-2xl font-bold">Darstudies</h1>
          <p className="text-sm muted">{t('auth.tagline')}</p>
        </div>

        <div className="card space-y-3">
          <h2 className="text-center font-semibold">{t('auth.signIn')}</h2>
          {oauthProviders.map((p) => (
            <button key={p} onClick={() => oauth(p)} disabled={!!busy}
              className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
              {ICON[p]}
              {busy === p ? t('common.loading') : t(`auth.${p}`)}
            </button>
          ))}

          {PROVIDERS.includes('email') && (
            <>
              {oauthProviders.length > 0 && (
                <div className="flex items-center gap-3 text-xs muted">
                  <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />{t('auth.or')}<span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                </div>
              )}
              <form onSubmit={emailLink} className="space-y-2">
                <label className="block text-sm font-medium" htmlFor="login-email">{t('auth.email')}</label>
                <input id="login-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base dark:border-slate-700 dark:bg-slate-900" />
                <button type="submit" disabled={!!busy} className="btn-primary w-full disabled:opacity-60">
                  {busy === 'email' ? t('common.loading') : t('auth.sendLink')}
                </button>
              </form>
            </>
          )}

          {message && <p role="status" className={`text-center text-sm ${message.ok ? 'text-teal-700 dark:text-teal-300' : 'text-red-600'}`}>{message.text}</p>}
        </div>

        <p className="text-center text-xs muted">{t('auth.trialNote')}</p>
        <div className="flex justify-center gap-2 text-xs">
          {(['en', 'bm'] as const).map((l) => (
            <button key={l} onClick={() => update({ lang: l })}
              className={`rounded-full px-3 py-1 font-semibold ${settings.lang === l ? 'bg-teal-700 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>
              {l === 'en' ? 'English' : 'Bahasa Melayu'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
