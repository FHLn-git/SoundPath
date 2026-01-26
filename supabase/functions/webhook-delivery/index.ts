// Webhook Delivery Service
// Processes pending webhook deliveries with retry logic

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MAX_RETRIES = 5
const RETRY_DELAYS = [1000, 5000, 15000, 60000, 300000] // 1s, 5s, 15s, 1m, 5m

serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Get pending webhook deliveries that are ready to retry
    const { data: deliveries, error } = await supabase
      .from('webhook_deliveries')
      .select(`
        *,
        webhooks!inner(
          id,
          url,
          secret,
          organization_id
        )
      `)
      .eq('status', 'pending')
      .lte('next_retry_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(50)

    if (error) {
      console.error('Error fetching webhook deliveries:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    if (!deliveries || deliveries.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending deliveries' }), { status: 200 })
    }

    const results = []

    for (const delivery of deliveries) {
      const webhook = delivery.webhooks
      if (!webhook) continue

      try {
        // Create signature
        const timestamp = Math.floor(Date.now() / 1000)
        const payload = JSON.stringify(delivery.payload)
        const signedPayload = `${timestamp}.${payload}`
        const encoder = new TextEncoder()
        const key = await crypto.subtle.importKey(
          'raw',
          encoder.encode(webhook.secret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        )
        const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))
        const signatureHex = Array.from(new Uint8Array(signature))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')

        // Send webhook
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signatureHex,
            'X-Webhook-Timestamp': timestamp.toString(),
            'X-Webhook-Event': delivery.event_type,
          },
          body: payload,
        })

        const responseBody = await response.text()

        if (response.ok) {
          // Success
          await supabase
            .from('webhook_deliveries')
            .update({
              status: 'success',
              response_status: response.status,
              response_body: responseBody,
              attempt_number: delivery.attempt_number,
            })
            .eq('id', delivery.id)

          // Update webhook last_triggered_at
          await supabase
            .from('webhooks')
            .update({
              last_triggered_at: new Date().toISOString(),
              failure_count: 0,
            })
            .eq('id', webhook.id)

          results.push({ id: delivery.id, status: 'success' })
        } else {
          // Failed - retry logic
          const attemptNumber = delivery.attempt_number + 1
          const shouldRetry = attemptNumber <= MAX_RETRIES

          if (shouldRetry) {
            const delay = RETRY_DELAYS[attemptNumber - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1]
            const nextRetryAt = new Date(Date.now() + delay)

            await supabase
              .from('webhook_deliveries')
              .update({
                attempt_number: attemptNumber,
                next_retry_at: nextRetryAt.toISOString(),
                response_status: response.status,
                response_body: responseBody,
              })
              .eq('id', delivery.id)

            // Increment failure count
            await supabase.rpc('increment_webhook_failure_count', { webhook_id: webhook.id })

            results.push({ id: delivery.id, status: 'retry_scheduled', attempt: attemptNumber })
          } else {
            // Max retries reached - mark as failed
            await supabase
              .from('webhook_deliveries')
              .update({
                status: 'failed',
                response_status: response.status,
                response_body: responseBody,
                attempt_number: attemptNumber,
              })
              .eq('id', delivery.id)

            results.push({ id: delivery.id, status: 'failed', reason: 'max_retries' })
          }
        }
      } catch (error) {
        console.error(`Error processing webhook delivery ${delivery.id}:`, error)
        
        const attemptNumber = delivery.attempt_number + 1
        const shouldRetry = attemptNumber <= MAX_RETRIES

        if (shouldRetry) {
          const delay = RETRY_DELAYS[attemptNumber - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1]
          const nextRetryAt = new Date(Date.now() + delay)

          await supabase
            .from('webhook_deliveries')
            .update({
              attempt_number: attemptNumber,
              next_retry_at: nextRetryAt.toISOString(),
            })
            .eq('id', delivery.id)

          results.push({ id: delivery.id, status: 'retry_scheduled', attempt: attemptNumber })
        } else {
          await supabase
            .from('webhook_deliveries')
            .update({
              status: 'failed',
              attempt_number: attemptNumber,
            })
            .eq('id', delivery.id)

          results.push({ id: delivery.id, status: 'failed', reason: 'max_retries' })
        }
      }
    }

    return new Response(
      JSON.stringify({
        processed: results.length,
        results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in webhook delivery service:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
