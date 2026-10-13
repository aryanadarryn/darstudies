// CHIP success_callback. The body is only used to find the purchase id; the status is re-read from CHIP
// with our secret key, so a forged request cannot unlock anything. CHIP retries until it gets a 2xx.
import { json, serviceClient, syncPayment } from '../_shared/common.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  try {
    const body = await req.json().catch(() => null)
    const purchaseId = typeof body?.id === 'string' ? body.id : null
    if (!purchaseId) return json({ ok: true, ignored: 'no purchase id' })
    const db = serviceClient()
    const { data: pay } = await db.from('payments').select('id').eq('gateway_ref', purchaseId).maybeSingle()
    if (!pay) return json({ ok: true, ignored: 'unknown purchase' })
    return json({ ok: true, status: await syncPayment(db, pay.id) })
  } catch (e) {
    console.error(e)
    // A non-2xx makes CHIP retry later.
    return json({ error: 'temporary failure' }, 500)
  }
})
