// Web Push sender (server-side)
// Requires X-Push-Secret when PUSH_SEND_SECRET is set.
//
// Env:
// - VAPID_KEYS_JSON: JSON from generate-vapid-keys.ts (ExportedVapidKeys)
// - VAPID_CONTACT_EMAIL: "admin@soundpath.app" (used for mailto:)
// - PUSH_SEND_SECRET: optional shared secret

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import * as webpush from 'jsr:@negrel/webpush@0.5.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const secret = Deno.env.get('PUSH_SEND_SECRET') || ''
  if (secret) {
    const provided = req.headers.get('X-Push-Secret') || ''
    if (provided !== secret) return json(401, { error: 'Unauthorized' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const vapidJson = Deno.env.get('VAPID_KEYS_JSON') || ''
  const contactEmail = Deno.env.get('VAPID_CONTACT_EMAIL') || ''
  if (!vapidJson || !contactEmail) return json(500, { error: 'Missing VAPID config' })

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return json(400, { error: 'Invalid JSON' })
  }

  const authUserId = payload?.auth_user_id
  const title = payload?.title || 'SoundPath'
  const body = payload?.body || ''
  const url = payload?.url || '/'

  if (!authUserId) return json(400, { error: 'auth_user_id is required' })

  const vapidKeys = webpush.importVapidKeys(JSON.parse(vapidJson))
  const appServer = await webpush.ApplicationServer.new({
    contactInformation: `mailto:${contactEmail}`,
    vapidKeys,
  })

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('auth_user_id', authUserId)
    .eq('active', true)

  if (error) return json(500, { error: error.message })
  if (!subs || subs.length === 0) return json(200, { message: 'No active subscriptions' })

  const results: any[] = []

  for (const sub of subs) {
    try {
      const subscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }
      const subscriber = appServer.subscribe(subscription)
      await subscriber.pushMessage(
        new TextEncoder().encode(JSON.stringify({ title, body, url })),
        { ttl: 60, urgency: webpush.Urgency.High }
      )
      results.push({ id: sub.id, status: 'sent' })
    } catch (err) {
      // If endpoint is gone, mark inactive
      try {
        if (err instanceof webpush.PushMessageError && err.isGone()) {
          await supabase.from('push_subscriptions').update({ active: false }).eq('id', sub.id)
        }
      } catch {
        // ignore
      }
      results.push({ id: sub.id, status: 'failed', error: String(err?.toString?.() || err) })
    }
  }

  return json(200, { sent: results.filter((r) => r.status === 'sent').length, results })
})

