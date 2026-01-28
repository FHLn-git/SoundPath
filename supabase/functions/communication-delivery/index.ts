// Communication Delivery Service
// Processes pending communication deliveries (Slack/Discord/Telegram/WhatsApp).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MAX_RETRIES = 5
const RETRY_DELAYS = [1000, 5000, 15000, 60000, 300000] // 1s, 5s, 15s, 1m, 5m

function buildMessage(payload: any) {
  const track = payload?.track || {}
  const artist = track.artist_name || 'Unknown Artist'
  const title = track.title || 'Untitled'
  const link = track.sc_link || ''
  const when = track.created_at ? new Date(track.created_at).toLocaleString() : ''
  const line = `New submission: ${artist} — ${title}${link ? ` (${link})` : ''}${when ? ` • ${when}` : ''}`
  return { line, artist, title, link }
}

function formatForPlatform(platform: string, payload: any) {
  const { line, artist, title, link } = buildMessage(payload)

  switch (platform) {
    case 'slack':
      return {
        body: {
          text: line,
          blocks: [
            { type: 'section', text: { type: 'mrkdwn', text: `*New Submission*\n*${artist}* — ${title}` } },
            ...(link ? [{ type: 'section', text: { type: 'mrkdwn', text: `<${link}|Listen>` } }] : []),
          ],
        },
        headers: { 'Content-Type': 'application/json' },
      }
    case 'discord':
      return {
        body: { content: line },
        headers: { 'Content-Type': 'application/json' },
      }
    case 'telegram':
    case 'whatsapp':
      // Best-effort generic payload (URL must be configured to accept JSON).
      return {
        body: { text: line, track: payload?.track },
        headers: { 'Content-Type': 'application/json' },
      }
    default:
      return {
        body: { text: line, track: payload?.track },
        headers: { 'Content-Type': 'application/json' },
      }
  }
}

serve(async (_req) => {
  const workerToken = Deno.env.get('WORKER_TOKEN') || ''
  if (workerToken) {
    const url = new URL(_req.url)
    const provided = url.searchParams.get('token') || _req.headers.get('X-Worker-Token') || ''
    if (provided !== workerToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const { data: deliveries, error } = await supabase
      .from('communication_deliveries')
      .select(
        `
        *,
        communication_webhooks!inner(
          id,
          platform,
          url,
          organization_id
        )
      `
      )
      .eq('status', 'pending')
      .lte('next_retry_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(50)

    if (error) {
      console.error('Error fetching communication deliveries:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    if (!deliveries || deliveries.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending deliveries' }), { status: 200 })
    }

    const results: any[] = []

    for (const delivery of deliveries) {
      const webhook = delivery.communication_webhooks
      if (!webhook?.url) continue

      try {
        const { body, headers } = formatForPlatform(webhook.platform, delivery.payload)

        const response = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        })

        const responseBody = await response.text().catch(() => '')

        if (response.ok) {
          await supabase
            .from('communication_deliveries')
            .update({
              status: 'success',
              response_status: response.status,
              response_body: responseBody,
              delivered_at: new Date().toISOString(),
            })
            .eq('id', delivery.id)

          results.push({ id: delivery.id, status: 'success' })
        } else {
          const attemptNumber = delivery.attempt_number + 1
          const shouldRetry = attemptNumber <= MAX_RETRIES

          if (shouldRetry) {
            const delay = RETRY_DELAYS[attemptNumber - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1]
            const nextRetryAt = new Date(Date.now() + delay)
            await supabase
              .from('communication_deliveries')
              .update({
                attempt_number: attemptNumber,
                next_retry_at: nextRetryAt.toISOString(),
                response_status: response.status,
                response_body: responseBody,
              })
              .eq('id', delivery.id)
            results.push({ id: delivery.id, status: 'retry_scheduled', attempt: attemptNumber })
          } else {
            await supabase
              .from('communication_deliveries')
              .update({
                status: 'failed',
                attempt_number: attemptNumber,
                response_status: response.status,
                response_body: responseBody,
              })
              .eq('id', delivery.id)
            results.push({ id: delivery.id, status: 'failed', reason: 'max_retries' })
          }
        }
      } catch (err) {
        console.error(`Error processing communication delivery ${delivery.id}:`, err)
        const attemptNumber = delivery.attempt_number + 1
        const shouldRetry = attemptNumber <= MAX_RETRIES
        if (shouldRetry) {
          const delay = RETRY_DELAYS[attemptNumber - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1]
          const nextRetryAt = new Date(Date.now() + delay)
          await supabase
            .from('communication_deliveries')
            .update({
              attempt_number: attemptNumber,
              next_retry_at: nextRetryAt.toISOString(),
            })
            .eq('id', delivery.id)
          results.push({ id: delivery.id, status: 'retry_scheduled', attempt: attemptNumber })
        } else {
          await supabase
            .from('communication_deliveries')
            .update({
              status: 'failed',
              attempt_number: attemptNumber,
            })
            .eq('id', delivery.id)
          results.push({ id: delivery.id, status: 'failed', reason: 'max_retries' })
        }
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in communication delivery service:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

