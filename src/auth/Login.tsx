import { useEffect, useState, type ReactNode } from 'react'
import type { StringKey } from '../i18n/strings'
import { useT } from '../i18n/useT'
import { useSettings } from '../store/settings'
import { useAccount } from './account'
import { forgetLastLogin, getLastLogin, setLastLogin } from './lastLogin'
import { enabledProviders, PROVIDERS, REDIRECT_URL, supabase, type Provider } from './supabase'

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

/** Supabase's default minimum password length. */
const MIN_PASSWORD = 6

const btnOutline = 'flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
const inputCls = 'min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base dark:border-slate-700 dark:bg-slate-900'
const linkCls = 'font-semibold text-violet-700 dark:text-violet-300'

/** Supabase error codes → message keys. */
const ERRORS: Record<string, StringKey> = {
  invalid_credentials: 'auth.wrongPassword',
  user_already_exists: 'auth.exists',
  email_exists: 'auth.exists',
  weak_password: 'auth.weakPassword',
  email_not_confirmed: 'auth.notConfirmed',
  signup_disabled: 'auth.signupOff',
  email_provider_disabled: 'auth.signupOff',
  over_email_send_rate_limit: 'auth.notConfirmed',
}

export default function Login() {
  const { t } = useT()
  const { settings, update } = useSettings()
  const linkFailed = useAccount((s) => s.linkFailed)
  // Start from the build's list, then drop any method switched off in Supabase so no button leads to an error.
  const [providers, setProviders] = useState(PROVIDERS)
  useEffect(() => { void enabledProviders().then(setProviders) }, [])
  const [last, setLast] = useState(getLastLogin)
  const usable = last && providers.includes(last.method) && (last.method !== 'email' || !!last.email) ? last : null
  const [showAll, setShowAll] = useState(!usable)
  const [mode, setMode] = useState<'signin' | 'signup'>(last ? 'signin' : 'signup')
  const [email, setEmail] = useState(last?.email ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(linkFailed ? { ok: false, text: t('auth.linkFailed') } : null)

  const oauth = async (provider: Exclude<Provider, 'email'>) => {
    if (!navigator.onLine) return setMessage({ ok: false, text: t('auth.offline') })
    setBusy(provider)
    setMessage(null)
    setLastLogin({ method: provider, email: last?.email })
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!navigator.onLine) return setMessage({ ok: false, text: t('auth.offline') })
    const address = email.trim().toLowerCase()
    if (password.length < MIN_PASSWORD) return setMessage({ ok: false, text: t('auth.weakPassword') })
    setBusy('password')
    setMessage(null)
    const { data, error } = mode === 'signin'
      ? await supabase!.auth.signInWithPassword({ email: address, password })
      : await supabase!.auth.signUp({ email: address, password })
    setBusy(null)
    if (error) return setMessage({ ok: false, text: t(ERRORS[error.code ?? ''] ?? 'auth.error') })
    // No session after sign-up means Supabase still wants the address confirmed by email.
    if (!data.session) return setMessage({ ok: false, text: t('auth.notConfirmed') })
    // Signed in: the account store picks up the session and the app replaces this screen.
    setLastLogin({ method: 'email', email: address })
  }

  const switchAccount = () => {
    forgetLastLogin()
    setLast(null)
    setEmail('')
    setPassword('')
    setMessage(null)
    setShowAll(true)
  }

  const oauthProviders = providers.filter((p): p is Exclude<Provider, 'email'> => p !== 'email')
  const returning = !showAll && usable?.method === 'email'

  const passwordForm = (
    <form onSubmit={submit} className="space-y-2">
      {!returning && (
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-semibold dark:bg-slate-800">
          {(['signin', 'signup'] as const).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => { setMode(m); setMessage(null) }}
              className={`rounded-lg py-2 ${mode === m ? 'bg-white shadow-sm dark:bg-slate-900' : 'muted'}`}>
              {t(m === 'signin' ? 'auth.tabSignIn' : 'auth.tabSignUp')}
            </button>
          ))}
        </div>
      )}
      {returning ? (
        <p className="truncate text-center text-sm"><strong>{email}</strong></p>
      ) : (
        <>
          <label className="block text-sm font-medium" htmlFor="login-email">{t('auth.email')}</label>
          <input id="login-email" type="email" required autoComplete={mode === 'signin' ? 'username' : 'email'} value={email}
            onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </>
      )}
      {/* Hidden username keeps password managers matching the saved login when only the password box shows. */}
      {returning && <input type="email" autoComplete="username" value={email} readOnly hidden />}
      <label className="block text-sm font-medium" htmlFor="login-password">{t('auth.password')}</label>
      <div className="relative">
        <input id="login-password" type={showPassword ? 'text' : 'password'} required minLength={MIN_PASSWORD} autoFocus={returning}
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password}
          onChange={(e) => setPassword(e.target.value)} className={`${inputCls} pr-16`} />
        <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute inset-y-0 right-0 px-3 text-xs font-semibold muted">
          {t(showPassword ? 'auth.hide' : 'auth.show')}
        </button>
      </div>
      {mode === 'signup' && <p className="text-xs muted">{t('auth.passwordHint')}</p>}
      <button type="submit" disabled={!!busy} className="btn-primary w-full disabled:opacity-60">
        {busy === 'password' ? t('common.loading') : t(mode === 'signin' ? 'auth.tabSignIn' : 'auth.createAccount')}
      </button>
      {mode === 'signin' && <p className="text-center text-xs muted">{t('auth.forgot')}</p>}
    </form>
  )

  let panel: ReactNode
  if (!showAll && usable) {
    // Returning user on this device: their email is already filled in, or one tap for Google/Facebook.
    const m = usable.method
    panel = (
      <div className="space-y-3">
        <h2 className="text-center font-semibold">{t('auth.welcomeBack')}</h2>
        {m === 'email' ? passwordForm : (
          <>
            <button onClick={() => oauth(m)} disabled={!!busy} className={btnOutline}>
              {ICON[m]}
              {busy === m ? t('common.loading') : t(`auth.${m}`)}
            </button>
            {usable.email && <p className="text-center text-xs muted">{t('auth.lastUsed')}: {usable.email}</p>}
          </>
        )}
        <div className="flex items-center justify-between gap-2 text-sm">
          <button onClick={() => setShowAll(true)} className={linkCls}>{t('auth.otherWays')}</button>
          <button onClick={switchAccount} className="muted">{t('auth.changeEmail')}</button>
        </div>
      </div>
    )
  } else {
    panel = (
      <>
        <h2 className="text-center font-semibold">{t('auth.signIn')}</h2>
        {oauthProviders.map((p) => (
          <button key={p} onClick={() => oauth(p)} disabled={!!busy} className={btnOutline}>
            {ICON[p]}
            {busy === p ? t('common.loading') : t(`auth.${p}`)}
          </button>
        ))}

        {providers.includes('email') && (
          <>
            {oauthProviders.length > 0 && (
              <div className="flex items-center gap-3 text-xs muted">
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />{t('auth.or')}<span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              </div>
            )}
            {passwordForm}
          </>
        )}
      </>
    )
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" className="mx-auto h-16 w-16 rounded-2xl" />
          <h1 className="mt-3 text-2xl font-bold">Darstudies</h1>
          <p className="text-sm muted">{t('auth.tagline')}</p>
        </div>

        <div className="card space-y-3">
          {panel}
          {message && <p role="status" className={`text-center text-sm ${message.ok ? 'text-violet-700 dark:text-violet-300' : 'text-red-600'}`}>{message.text}</p>}
        </div>

        <p className="text-center text-xs muted">{t('auth.stay')} {t('auth.trialNote')}</p>
        <div className="flex justify-center gap-2 text-xs">
          {(['en', 'bm'] as const).map((l) => (
            <button key={l} onClick={() => update({ lang: l })}
              className={`rounded-full px-3 py-1 font-semibold ${settings.lang === l ? 'bg-violet-700 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>
              {l === 'en' ? 'English' : 'Bahasa Melayu'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
