import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function json(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  return res.end(JSON.stringify(body))
}

function normalizeBaseUrl(value) {
  const raw = (value || '').toString().trim()
  if (!raw) return ''
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw.replace(/\/+$/, '')
  // allow passing just "soundpath.app" or "www.foo.com"
  return `https://${raw.replace(/^\/+/, '')}`.replace(/\/+$/, '')
}

function toAbsoluteUrl(maybeUrl, base) {
  const raw = (maybeUrl || '').toString().trim()
  if (!raw) return ''
  // already absolute
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  // relative path
  if (raw.startsWith('/')) return `${base}${raw}`
  // unknown format: treat as relative-ish
  return `${base}/${raw}`.replace(/\/{2,}/g, '/').replace(':/', '://')
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  if (!chunks.length) return null
  const raw = Buffer.concat(chunks).toString('utf8')
  return JSON.parse(raw)
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return json(res, 200, { ok: true })
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Resolve trial end:
    // - If the user already has a stored trial_ends_at in staff_members and it's in the future, honor remaining time.
    // - Otherwise default to 7 days from now.
    let trialEndSeconds = null
    try {
      const { data: staffRow } = await supabase
        .from('staff_members')
        .select('trial_ends_at')
        .eq('auth_user_id', user_id)
        .maybeSingle()

      const nowMs = Date.now()
      const existingMs = staffRow?.trial_ends_at ? new Date(staffRow.trial_ends_at).getTime() : null
      const fallbackMs = nowMs + 7 * 24 * 60 * 60 * 1000
      const finalMs = existingMs && existingMs > nowMs ? existingMs : fallbackMs

      trialEndSeconds = Math.floor(finalMs / 1000)
    } catch (_e) {
      // If anything goes wrong, still provide a 7-day trial
      trialEndSeconds = Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000)
    }

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

    const proto = (req.headers['x-forwarded-proto'] || 'https').toString()
    const host = (req.headers.host || '').toString()
    const inferredBase = host ? `${proto}://${host}` : ''

    const siteBase =
      normalizeBaseUrl(process.env.SITE_URL) ||
      normalizeBaseUrl(process.env.VITE_SITE_URL) ||
      normalizeBaseUrl(req.headers.origin) ||
      normalizeBaseUrl(inferredBase)

    if (!siteBase) {
      return json(res, 500, {
        error: 'SITE_URL is not configured (must include https://)',
      })
    }

    const success_url = toAbsoluteUrl(
      body.success_url || `/launchpad?session_id={CHECKOUT_SESSION_ID}`,
      siteBase
    )
    const cancel_url = toAbsoluteUrl(body.cancel_url || `/signup?checkout=cancelled`, siteBase)

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
        // Ensure Stripe handles the $0 -> paid transition automatically after the 7-day trial
        ...(trialEndSeconds ? { trial_end: trialEndSeconds } : { trial_period_days: 7 }),
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

