import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function json(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  return res.end(JSON.stringify(body))
}

async function readRawBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripeSecretKey || !webhookSecret) {
    return json(res, 500, { error: 'Stripe credentials not configured' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    return json(res, 500, { error: 'Supabase admin credentials not configured' })
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })
  const signature = req.headers['stripe-signature']
  if (!signature) return json(res, 400, { error: 'Missing stripe-signature' })

  let event
  try {
    const rawBody = await readRawBody(req)
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (e) {
    console.error('Webhook signature verification failed:', e)
    return json(res, 400, { error: 'Invalid signature' })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object

      const authUserId =
        session.client_reference_id || (session.metadata && session.metadata.auth_user_id)
      const tier = session.metadata && session.metadata.tier
      const stripeSubscriptionId = session.subscription || null

      if (!authUserId || !tier) {
        return json(res, 200, { received: true, ignored: true })
      }

      if (!['agent', 'starter', 'pro'].includes(tier)) {
        return json(res, 200, { received: true, ignored: true })
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      const { error } = await supabase
        .from('staff_members')
        .update({
          tier,
          subscription_id: stripeSubscriptionId,
          updated_at: new Date().toISOString(),
        })
        .eq('auth_user_id', authUserId)

      if (error) {
        console.error('Failed updating staff_members after checkout:', error)
        return json(res, 200, { received: true, updated: false })
      }
    }

    return json(res, 200, { received: true })
  } catch (e) {
    console.error('Webhook handler error:', e)
    return json(res, 500, { error: e?.message || 'Webhook handler error' })
  }
}

