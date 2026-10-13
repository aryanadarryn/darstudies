// POST { action: 'delete', user_id } — admins only. Deleting the auth user cascades to the profile and
// subscription; payment records are kept with user_id set to null.
import { callerUser, CORS, json, serviceClient } from '../_shared/common.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  try {
    const user = await callerUser(req)
    if (!user) return json({ error: 'Not signed in' }, 401)
    const db = serviceClient()
    const { data: me } = await db.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
    if (!me?.is_admin) return json({ error: 'Admins only' }, 403)

    const body = await req.json().catch(() => ({}))
    if (body.action !== 'delete') return json({ error: 'Unknown action' }, 400)
    const target = String(body.user_id ?? '')
    if (!target) return json({ error: 'user_id required' }, 400)
    if (target === user.id) return json({ error: 'You cannot delete your own account here' }, 400)
    const { error } = await db.auth.admin.deleteUser(target)
    if (error) throw error
    return json({ ok: true })
  } catch (e) {
    console.error(e)
    return json({ error: 'Delete failed' }, 500)
  }
})
