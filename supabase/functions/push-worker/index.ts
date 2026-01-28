// Push Notification Worker
// Sends pending push_notification_jobs via Web Push.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import * as webpush from 'jsr:@negrel/webpush@0.5.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MAX_RETRIES = 5
const RETRY_DELAYS = [1000, 5000, 15000, 60000, 300000]

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

serve(async (req) => {
  const workerToken = Deno.env.get('WORKER_TOKEN') || ''
  if (workerToken) {
    const url = new URL(req.url)
    const provided = url.searchParams.get('token') || req.headers.get('X-Worker-Token') || ''
    if (provided !== workerToken) return json(401, { error: 'Unauthorized' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const vapidJson = Deno.env.get('VAPID_KEYS_JSON') || ''
  const contactEmail = Deno.env.get('VAPID_CONTACT_EMAIL') || ''
  if (!vapidJson || !contactEmail) return json(500, { error: 'Missing VAPID config' })

  const vapidKeys = webpush.importVapidKeys(JSON.parse(vapidJson))
  const appServer = await webpush.ApplicationServer.new({
    contactInformation: `mailto:${contactEmail}`,
    vapidKeys,
  })

  const { data: jobs, error } = await supabase
    .from('push_notification_jobs')
    .select('*')
    .eq('status', 'pending')
    .lte('next_retry_at', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(25)

  if (error) return json(500, { error: error.message })
  if (!jobs || jobs.length === 0) return json(200, { message: 'No pending jobs' })

  const results: any[] = []

  for (const job of jobs) {
    try {
      const { data: subs, error: subErr } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('auth_user_id', job.auth_user_id)
        .eq('active', true)

      if (subErr) throw subErr

      for (const sub of subs || []) {
        const subscription = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }
        const subscriber = appServer.subscribe(subscription)
        await subscriber.pushMessage(
          new TextEncoder().encode(JSON.stringify({ title: job.title, body: job.body, url: job.url || '/' })),
          { ttl: 60, urgency: webpush.Urgency.High }
        )
      }

      await supabase.from('push_notification_jobs').update({ status: 'success', error_message: null }).eq('id', job.id)
      results.push({ id: job.id, status: 'success' })
    } catch (err) {
      const attemptNumber = job.attempt_number + 1
      const shouldRetry = attemptNumber <= MAX_RETRIES
      if (shouldRetry) {
        const delay = RETRY_DELAYS[attemptNumber - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1]
        const nextRetryAt = new Date(Date.now() + delay)
        await supabase
          .from('push_notification_jobs')
          .update({
            attempt_number: attemptNumber,
            next_retry_at: nextRetryAt.toISOString(),
            error_message: String(err?.message || err),
          })
          .eq('id', job.id)
        results.push({ id: job.id, status: 'retry_scheduled', attempt: attemptNumber })
      } else {
        await supabase
          .from('push_notification_jobs')
          .update({ status: 'failed', attempt_number: attemptNumber, error_message: String(err?.message || err) })
          .eq('id', job.id)
        results.push({ id: job.id, status: 'failed' })
      }
    }
  }

  return json(200, { processed: results.length, results })
})

