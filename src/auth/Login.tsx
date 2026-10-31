import { useEffect, useState, type ReactNode } from 'react'
import { useT } from '../i18n/useT'
import { useSettings } from '../store/settings'
import { useAccount } from './account'
import { forgetLastLogin, getLastLogin, getPending, setLastLogin, setPending } from './lastLogin'
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

/** Supabase lets one address request a new email every 60 seconds. */
const RESEND_S = 60

const btnOutline = 'flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
const inputCls = 'min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base dark:border-slate-700 dark:bg-slate-900'
const linkCls = 'font-semibold text-violet-700 dark:text-violet-300'

export default function Login() {
  const { t } = useT()
  const { settings, update } = useSettings()
  const linkFailed = useAccount((s) => s.linkFailed)
  const [last, setLast] = useState(getLastLogin)
  const usable = last && PROVIDERS.includes(last.method) && (last.method !== 'email' || !!last.email) ? last : null
  const [showAll, setShowAll] = useState(!usable)
  // A code sent in the last hour: reopening the app (e.g. after checking Gmail) lands back on the code box.
  const [pending, setPendingState] = useState(getPending)
  const [email, setEmail] = useState(pending?.email ?? last?.email ?? '')
  const [code, setCode] = useState('')
  const [now, setNow] = useState(Date.now())
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(linkFailed ? { ok: false, text: t('auth.linkFailed') } : null)

  const wait = pending ? Math.max(0, Math.ceil((pending.sentAt + RESEND_S * 1000 - now) / 1000)) : 0
  useEffect(() => {
    if (!wait) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [wait])

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

  const sendCode = async (raw: string) => {
    const to = raw.trim().toLowerCase()
    if (!navigator.onLine) return setMessage({ ok: false, text: t('auth.offline') })
    setBusy('email')
    setMessage(null)
    const { error } = await supabase!.auth.signInWithOtp({ email: to, options: { emailRedirectTo: REDIRECT_URL() } })
    setBusy(null)
    // 429 means an email went out moments ago, so its code still works.
    if (error && error.status !== 429) return setMessage({ ok: false, text: t('auth.error') })
    const p = { email: to, sentAt: Date.now() }
    setPending(p)
    setPendingState(p)
    setNow(p.sentAt)
    setCode('')
    setLastLogin({ method: 'email', email: to })
    setLast({ method: 'email', email: to })
  }

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pending) return
    if (!navigator.onLine) return setMessage({ ok: false, text: t('auth.offline') })
    setBusy('verify')
    setMessage(null)
    const { error } = await supabase!.auth.verifyOtp({ email: pending.email, token: code, type: 'email' })
    setBusy(null)
    // On success the account store picks up the session and the app replaces this screen.
    if (error) setMessage({ ok: false, text: t('auth.badCode') })
  }

  const changeEmail = () => {
    setPending(null)
    setPendingState(null)
    forgetLastLogin()
    setLast(null)
    setEmail('')
    setMessage(null)
    setShowAll(true)
  }

  const oauthProviders = PROVIDERS.filter((p): p is Exclude<Provider, 'email'> => p !== 'email')

  let panel: ReactNode
  if (pending) {
    panel = (
      <form onSubmit={verify} className="space-y-3">
        <h2 className="text-center font-semibold">{t('auth.code')}</h2>
        <p className="text-center text-sm">{t('auth.codeSent')} <strong className="break-all">{pending.email}</strong></p>
        <p className="text-center text-xs muted">{t('auth.codeHint')}</p>
        <input aria-label={t('auth.code')} inputMode="numeric" autoComplete="one-time-code" required autoFocus
          maxLength={10} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className={`${inputCls} text-center font-mono text-2xl tracking-[0.4em]`} />
        <button type="submit" disabled={!!busy || code.length < 6} className="btn-primary w-full disabled:opacity-60">
          {busy === 'verify' ? t('common.loading') : t('auth.verify')}
        </button>
        <div className="flex items-center justify-between gap-2 text-sm">
          <button type="button" onClick={changeEmail} className={linkCls}>{t('auth.changeEmail')}</button>
          <button type="button" onClick={() => sendCode(pending.email)} disabled={!!busy || wait > 0}
            className={`${linkCls} disabled:font-normal disabled:text-slate-500`}>
            {wait > 0 ? `${t('auth.resendIn')} ${wait}s` : t('auth.resend')}
          </button>
        </div>
      </form>
    )
  } else if (!showAll && usable) {
    // Returning user on this device: one tap.
    const m = usable.method
    panel = (
      <div className="space-y-3">
        <h2 className="text-center font-semibold">{t('auth.welcomeBack')}</h2>
        {m === 'email' ? (
          <button onClick={() => sendCode(usable.email!)} disabled={!!busy} className="btn-primary w-full disabled:opacity-60">
            <span className="block truncate">{busy === 'email' ? t('common.loading') : `${t('auth.continueAs')} ${usable.email}`}</span>
          </button>
        ) : (
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
          <button onClick={changeEmail} className="muted">{t('auth.changeEmail')}</button>
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

        {PROVIDERS.includes('email') && (
          <>
            {oauthProviders.length > 0 && (
              <div className="flex items-center gap-3 text-xs muted">
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />{t('auth.or')}<span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); void sendCode(email) }} className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="login-email">{t('auth.email')}</label>
              <input id="login-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
              <button type="submit" disabled={!!busy} className="btn-primary w-full disabled:opacity-60">
                {busy === 'email' ? t('common.loading') : t('auth.sendLink')}
              </button>
            </form>
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
