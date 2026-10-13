// POST { action: 'create', plan_id } → { payment_id, checkout_url }
// POST { action: 'verify', payment_id } → { status }   (used by the return page in case the callback is slow)
import { callerUser, chipCreatePurchase, CORS, env, json, serviceClient, syncPayment } from '../_shared/common.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  try {
    const user = await callerUser(req)
    if (!user) return json({ error: 'Not signed in' }, 401)
    const body = await req.json().catch(() => ({}))
    const db = serviceClient()

    if (body.action === 'verify') {
      const { data: pay } = await db.from('payments').select('id, user_id').eq('id', String(body.payment_id ?? '')).maybeSingle()
      if (!pay || pay.user_id !== user.id) return json({ error: 'Payment not found' }, 404)
      return json({ status: await syncPayment(db, pay.id) })
    }

    if (body.action !== 'create') return json({ error: 'Unknown action' }, 400)
    const { data: plan } = await db.from('plans').select('*').eq('id', String(body.plan_id ?? '')).eq('active', true).maybeSingle()
    if (!plan) return json({ error: 'Plan not available' }, 400)

    const { data: pay, error } = await db.from('payments').insert({
      user_id: user.id, email: user.email, plan_id: plan.id, plan_name: plan.name_en, amount_sen: plan.price_sen,
    }).select('id').single()
    if (error) throw error

    const site = env('SITE_URL').replace(/\/?$/, '/')
    const back = `${site}subscribe?payment=${pay.id}`
    const purchase = await chipCreatePurchase({
      brand_id: env('CHIP_BRAND_ID'),
      client: { email: user.email, full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? undefined },
      purchase: { currency: 'MYR', products: [{ name: `Darstudies ${plan.name_en}`, price: plan.price_sen }] },
      reference: pay.id,
      success_redirect: back,
      failure_redirect: back,
      cancel_redirect: back,
      success_callback: `${env('SUPABASE_URL')}/functions/v1/chip-callback`,
    })
    await db.from('payments').update({ gateway_ref: purchase.id, checkout_url: purchase.checkout_url }).eq('id', pay.id)
    return json({ payment_id: pay.id, checkout_url: purchase.checkout_url })
  } catch (e) {
    console.error(e)
    return json({ error: 'Could not start the payment. Please try again.' }, 500)
  }
})
