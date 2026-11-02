// Admins only.
// POST { action: 'delete', user_id } — deleting the auth user cascades to the profile and subscription; payment
// records are kept with user_id set to null.
// POST { action: 'set_password', user_id, password } — for users who forgot their password (no reset emails yet).
// Also marks the email as confirmed so the user can sign in straight away.
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
    const target = String(body.user_id ?? '')
    if (!target) return json({ error: 'user_id required' }, 400)

    if (body.action === 'delete') {
      if (target === user.id) return json({ error: 'You cannot delete your own account here' }, 400)
      const { error } = await db.auth.admin.deleteUser(target)
      if (error) throw error
      return json({ ok: true })
    }

    if (body.action === 'set_password') {
      const password = String(body.password ?? '')
      if (password.length < 6) return json({ error: 'Password must be at least 6 characters' }, 400)
      const { error } = await db.auth.admin.updateUserById(target, { password, email_confirm: true })
      if (error) throw error
      return json({ ok: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (e) {
    console.error(e)
    return json({ error: 'Request failed' }, 500)
  }
})
