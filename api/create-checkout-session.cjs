const Stripe = require('stripe')

function json(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')
  return res.end(JSON.stringify(body))
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  if (!chunks.length) return null
  const raw = Buffer.concat(chunks).toString('utf8')
  return JSON.parse(raw)
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'content-type')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    return res.end('ok')
  }

  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' })
  }

  try {
    const body = (await readJsonBody(req)) || {}
    const user_id = body.user_id || body.userId || body.supabase_user_id
    const tier = body.tier
    const billing_interval = body.billing_interval || body.billingInterval || 'month'

    if (!user_id || typeof user_id !== 'string') {
      return json(res, 400, { error: 'Missing user_id' })
    }
    if (!['agent', 'starter', 'pro'].includes(tier)) {
      return json(res, 400, { error: 'Invalid tier' })
    }
    if (!['month', 'year'].includes(billing_interval)) {
      return json(res, 400, { error: 'Invalid billing_interval' })
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) return json(res, 500, { error: 'STRIPE_SECRET_KEY not configured' })

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
      return json(res, 500, { error: 'Supabase admin credentials not configured' })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('stripe_price_id_monthly, stripe_price_id_yearly')
      .eq('id', tier)
      .single()

    if (planError || !plan) {
      return json(res, 400, { error: 'Unknown tier (plan not found)' })
    }

    const priceId =
      billing_interval === 'year' ? plan.stripe_price_id_yearly : plan.stripe_price_id_monthly

    if (!priceId || typeof priceId !== 'string' || !priceId.startsWith('price_')) {
      return json(res, 400, { error: 'Stripe price ID not configured for this tier' })
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })

    const siteBase = (process.env.SITE_URL || process.env.VITE_SITE_URL || req.headers.origin || '')
      .toString()
      .replace(/\/+$/, '')

    const success_url =
      (body.success_url || `${siteBase}/launchpad?session_id={CHECKOUT_SESSION_ID}`).toString()
    const cancel_url = (body.cancel_url || `${siteBase}/signup?checkout=cancelled`).toString()

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user_id,
      success_url,
      cancel_url,
      metadata: {
        tier,
        auth_user_id: user_id,
        flow: 'signup',
        billing_interval,
      },
      subscription_data: {
        metadata: {
          tier,
          auth_user_id: user_id,
          flow: 'signup',
          billing_interval,
        },
      },
    })

    return json(res, 200, { url: session.url, id: session.id })
  } catch (e) {
    console.error('create-checkout-session error:', e)
    return json(res, 500, { error: e?.message || 'Internal error' })
  }
}

