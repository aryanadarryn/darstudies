import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { daysLeft } from '../auth/access'
import { useAccount } from '../auth/account'
import { callFunction, supabase } from '../auth/supabase'
import { PageHeader } from '../components/ui'
import { useT } from '../i18n/useT'
import { useAsync } from '../lib/hooks'

interface Plan { id: string; name_en: string; name_bm: string; price_sen: number; interval_days: number }

export const ringgit = (sen: number) => `RM ${(sen / 100).toFixed(2)}`

type Outcome = 'checking' | 'paid' | 'failed' | 'pending'

/** After returning from the payment page: ask the server to confirm with CHIP, retrying for ~2 minutes. */
function usePaymentResult(paymentId: string | null) {
  const refresh = useAccount((s) => s.refresh)
  const [outcome, setOutcome] = useState<Outcome | null>(paymentId ? 'checking' : null)
  useEffect(() => {
    if (!paymentId) return
    let alive = true, tries = 0
    const tick = async () => {
      tries++
      try {
        const { status } = await callFunction<{ status: string }>('checkout', { action: 'verify', payment_id: paymentId })
        if (!alive) return
        if (status === 'paid') { await refresh(); setOutcome('paid'); return }
        if (status === 'failed') { setOutcome('failed'); return }
      } catch { /* try again */ }
      if (!alive) return
      if (tries >= 30) setOutcome('pending')
      else setTimeout(tick, 4000)
    }
    tick()
    return () => { alive = false }
  }, [paymentId, refresh])
  return outcome
}

export default function Subscribe() {
  const { t, lang } = useT()
  const [params] = useSearchParams()
  const access = useAccount((s) => s.access)
  const outcome = usePaymentResult(params.get('payment'))
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { data: plans, loading } = useAsync(async () => {
    const { data, error } = await supabase!.from('plans').select('id, name_en, name_bm, price_sen, interval_days').eq('active', true).order('sort')
    if (error) throw error
    return data as Plan[]
  }, [])

  const pay = async (plan: Plan) => {
    setBusy(plan.id)
    setError(null)
    try {
      const { checkout_url } = await callFunction<{ checkout_url: string }>('checkout', { action: 'create', plan_id: plan.id })
      location.assign(checkout_url)
    } catch (e) {
      setError((e as Error).message)
      setBusy(null)
    }
  }

  const status = access?.tier === 'full' && access.subscription
    ? `${t('account.active')} · ${t('account.until')} ${new Date(access.subscription.current_period_end).toLocaleDateString(lang === 'bm' ? 'ms-MY' : 'en-MY')}`
    : access?.tier === 'trial' ? `${t('account.trial')} · ${daysLeft(access.trial_ends_at)} ${t('account.daysLeft')}`
    : access?.tier === 'full' ? t('account.active') : t('account.trialEnded')

  return (
    <div className="space-y-4 desk:mx-auto desk:max-w-2xl">
      <PageHeader back title={t('sub.title')} />

      {outcome && (
        <div role="status" className={`card text-sm font-semibold ${outcome === 'paid' ? 'border-green-300 bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-200' : outcome === 'failed' ? 'border-red-300 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200' : ''}`}>
          {t(outcome === 'checking' ? 'sub.checking' : outcome === 'paid' ? 'sub.success' : outcome === 'failed' ? 'sub.failed' : 'sub.pending')}
        </div>
      )}

      <section className="card">
        <div className="text-xs muted">{t('sub.current')}</div>
        <div className="font-bold">{status}</div>
      </section>

      <section className="card space-y-2">
        <p className="font-semibold">{t('sub.intro')}</p>
        <ul className="space-y-1 text-sm">
          {(['sub.benefit1', 'sub.benefit2', 'sub.benefit3'] as const).map((k) => <li key={k}>✅ {t(k)}</li>)}
        </ul>
      </section>

      {loading ? <p className="py-6 text-center muted">{t('common.loading')}</p> : !plans?.length ? <p className="text-center muted">{t('sub.noPlans')}</p> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {plans.map((p) => (
            <div key={p.id} className="card flex flex-col gap-2">
              <div className="font-bold">{lang === 'bm' ? p.name_bm : p.name_en}</div>
              <div className="text-2xl font-bold">{ringgit(p.price_sen)}</div>
              <div className="text-xs muted">{p.interval_days} {t('sub.days')}</div>
              <button className="btn-primary mt-auto disabled:opacity-60" disabled={!!busy} onClick={() => pay(p)}>
                {busy === p.id ? t('sub.redirecting') : `${t('sub.pay')} ${ringgit(p.price_sen)}`}
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p role="alert" className="text-center text-sm text-red-600">{error}</p>}
      <p className="text-xs muted">{t('sub.methods')}</p>
      {access?.tier === 'full' && <p className="text-xs muted">{t('sub.renewNote')}</p>}
    </div>
  )
}
