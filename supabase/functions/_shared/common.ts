// Shared helpers for the Edge Functions (Deno).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.117.3'

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

export function env(name: string): string {
  const v = Deno.env.get(name)
  if (!v) throw new Error(`Missing environment variable ${name}`)
  return v
}

/** Client with the service role: bypasses RLS. Only use after checking who the caller is. */
export const serviceClient = (): SupabaseClient => createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })

/** The signed-in user who called the function, or null. */
export async function callerUser(req: Request) {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data, error } = await serviceClient().auth.getUser(token)
  return error ? null : data.user
}

// ---- CHIP Collect (https://docs.chip-in.asia) ----
const CHIP_API = 'https://gate.chip-in.asia/api/v1'

export interface ChipPurchase {
  id: string
  status: string
  checkout_url?: string
  reference?: string
  is_test?: boolean
  transaction_data?: { payment_method?: string }
}

async function chip<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${CHIP_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${env('CHIP_SECRET_KEY')}`, 'Content-Type': 'application/json', ...init.headers },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`CHIP ${init.method ?? 'GET'} ${path} failed (${res.status}): ${text.slice(0, 500)}`)
  return JSON.parse(text) as T
}

export const chipCreatePurchase = (body: unknown) => chip<ChipPurchase>('/purchases/', { method: 'POST', body: JSON.stringify(body) })
export const chipGetPurchase = (id: string) => chip<ChipPurchase>(`/purchases/${encodeURIComponent(id)}/`)

const PAID = new Set(['paid', 'cleared', 'settled'])
const FAILED = new Set(['error', 'cancelled', 'expired', 'blocked'])

/**
 * Re-reads the purchase from CHIP (never trusting the caller's data) and records the outcome.
 * Safe to call many times for the same payment.
 */
export async function syncPayment(db: SupabaseClient, paymentId: string): Promise<string> {
  const { data: pay, error } = await db.from('payments').select('id, status, gateway_ref').eq('id', paymentId).single()
  if (error || !pay) throw new Error(`payment ${paymentId} not found`)
  if (pay.status !== 'pending' || !pay.gateway_ref) return pay.status
  const purchase = await chipGetPurchase(pay.gateway_ref)
  if (PAID.has(purchase.status)) {
    const { error: e } = await db.rpc('apply_payment', { p_payment: pay.id, p_method: purchase.transaction_data?.payment_method ?? null, p_raw: purchase })
    if (e) throw e
    return 'paid'
  }
  if (FAILED.has(purchase.status)) {
    await db.from('payments').update({ status: 'failed', raw: purchase }).eq('id', pay.id).eq('status', 'pending')
    return 'failed'
  }
  return 'pending'
}
