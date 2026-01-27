// Stripe Webhook Handler
// Handles Stripe webhook events for subscription lifecycle

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

serve(async (req) => {
  try {
    // Get Stripe secret key and webhook secret
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    if (!stripeSecretKey || !webhookSecret) {
      throw new Error('Stripe credentials not configured')
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    })

    // Get the raw body and signature
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'No signature' }),
        { status: 400 }
      )
    }

    const body = await req.text()

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400 }
      )
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutSessionCompleted(session, stripe, supabase)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(subscription, supabase)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription, supabase)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentSucceeded(invoice, supabase)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentFailed(invoice, supabase)
        break
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription
        await handleTrialWillEnd(subscription, supabase)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    )
  }
})

// Handle subscription created/updated
async function handleSubscriptionUpdate(
  subscription: Stripe.Subscription,
  supabase: any
) {
  const organizationId = subscription.metadata?.organization_id
  const planId = subscription.metadata?.plan_id

  if (!organizationId || !planId) {
    console.error('Missing organization_id or plan_id in subscription metadata')
    return
  }

  // Map Stripe status to our status
  let status = 'active'
  if (subscription.status === 'trialing') {
    status = 'trialing'
  } else if (subscription.status === 'past_due') {
    status = 'past_due'
  } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    status = 'canceled'
  } else if (subscription.status === 'incomplete') {
    status = 'incomplete'
  }

  // Check if subscription exists
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  const subscriptionData = {
    organization_id: organizationId,
    plan_id: planId,
    status: status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
    trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer as string,
    billing_interval: subscription.items.data[0]?.price.recurring?.interval || 'month',
    updated_at: new Date().toISOString(),
  }

  if (existingSub) {
    // Update existing subscription
    await supabase
      .from('subscriptions')
      .update(subscriptionData)
      .eq('id', existingSub.id)
  } else {
    // Create new subscription
    await supabase
      .from('subscriptions')
      .insert(subscriptionData)
  }
}

// Handle signup checkout completion (personal tier purchase)
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
  supabase: any
) {
  try {
    // Only act on sessions that carry our metadata
    let authUserId = (session.metadata as any)?.auth_user_id as string | undefined
    let tier = (session.metadata as any)?.tier as string | undefined

    // Fallback: read metadata from subscription if needed
    if ((!authUserId || !tier) && session.mode === 'subscription' && session.subscription) {
      const subscriptionId = session.subscription as string
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      authUserId = authUserId || (subscription.metadata as any)?.auth_user_id
      tier = tier || (subscription.metadata as any)?.tier
    }

    if (!authUserId || !tier) {
      return
    }

    if (!['agent', 'starter', 'pro'].includes(tier)) {
      console.warn('Ignoring unknown tier:', tier)
      return
    }

    // Update tier on staff_members (this is what capacity + gating uses)
    const { error } = await supabase
      .from('staff_members')
      .update({ tier, updated_at: new Date().toISOString() })
      .eq('auth_user_id', authUserId)

    if (error) {
      console.error('Failed updating staff_members.tier:', error)
      return
    }
  } catch (e) {
    console.error('Error handling checkout.session.completed:', e)
  }
}

// Handle subscription deleted
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: any
) {
  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)
}

// Handle successful invoice payment
async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  supabase: any
) {
  if (invoice.subscription) {
    // Get subscription to find organization
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('organization_id')
      .eq('stripe_subscription_id', invoice.subscription as string)
      .single()

    if (subscription) {
      // Create invoice record
      await supabase
        .from('invoices')
        .insert({
          organization_id: subscription.organization_id,
          subscription_id: subscription.id,
          invoice_number: invoice.number || `INV-${Date.now()}`,
          amount: (invoice.amount_paid || 0) / 100, // Convert from cents
          currency: invoice.currency,
          status: 'paid',
          paid_at: new Date().toISOString(),
          stripe_invoice_id: invoice.id,
          pdf_url: invoice.invoice_pdf,
          hosted_invoice_url: invoice.hosted_invoice_url,
        })
        .onConflict('stripe_invoice_id')
        .merge()
    }
  }
}

// Handle failed invoice payment
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: any
) {
  if (invoice.subscription) {
    // Update subscription status to past_due
    await supabase
      .from('subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', invoice.subscription as string)
  }
}

// Handle trial ending soon
async function handleTrialWillEnd(
  subscription: Stripe.Subscription,
  supabase: any
) {
  // You can send an email notification here
  // For now, we'll just log it
  console.log(`Trial ending soon for subscription: ${subscription.id}`)
  
  // TODO: Send email notification to organization owner
  // You can use your email service here
}
