/**
 * Purge Testing Sandbox data.
 *
 * POST /api/admin/purge-test-data
 * Header: X-Purge-Secret: <PURGE_SECRET> (optional; if set in env, required)
 *
 * Deletes:
 * - All tracks where metadata->>'is_test_data' = 'true'
 * - Sandbox organizations (Neon Records, Basement Tapes) and their memberships
 * - Sandbox staff_members (free@, starter@, pro@, agent@soundpath.app)
 * - Auth users for those 4 emails (via Supabase Auth Admin)
 *
 * Env: SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL (or SUPABASE_URL), optional PURGE_SECRET
 */
import { createClient } from '@supabase/supabase-js'

const SANDBOX_EMAILS = [
  'free@soundpath.app',
  'starter@soundpath.app',
  'pro@soundpath.app',
  'agent@soundpath.app',
]

function json(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-purge-secret')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  return res.end(JSON.stringify(body))
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return json(res, 200, { ok: true })
  }

  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' })
  }

  const purgeSecret = process.env.PURGE_SECRET
  if (purgeSecret && req.headers['x-purge-secret'] !== purgeSecret) {
    return json(res, 403, { error: 'Forbidden' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return json(res, 500, { error: 'Server misconfiguration: missing Supabase credentials' })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

  try {
    const { data: rpcResult, error: rpcError } = await supabase.rpc('purge_test_data')
    if (rpcError) {
      console.error('purge_test_data RPC error:', rpcError)
      return json(res, 500, { error: rpcError.message, details: rpcError })
    }

    let authDeleted = 0
    const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    const users = listData?.users || []
    for (const email of SANDBOX_EMAILS) {
      const user = users.find((u) => u.email === email)
      if (user) {
        const { error: delError } = await supabase.auth.admin.deleteUser(user.id)
        if (!delError) authDeleted += 1
        else console.warn('Auth delete warning for', email, delError.message)
      }
    }

    return json(res, 200, {
      ok: true,
      ...rpcResult,
      auth_users_deleted: authDeleted,
    })
  } catch (err) {
    console.error('Purge error:', err)
    return json(res, 500, { error: err.message || 'Purge failed' })
  }
}
