// Stripe Client Library
// Handles Stripe Checkout and payment operations

import { loadStripe } from '@stripe/stripe-js'
import { supabase } from './supabaseClient'

// Initialize Stripe with publishable key
const getStripe = async () => {
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  
  if (!publishableKey) {
    console.warn('⚠️ Stripe publishable key not configured. Set VITE_STRIPE_PUBLISHABLE_KEY in .env')
    return null
  }

  try {
    const stripe = await loadStripe(publishableKey)
    return stripe
  } catch (error) {
    console.error('Error loading Stripe:', error)
    return null
  }
}

/**
 * Create a Stripe Checkout session for subscription
 * @param {string} organizationId - Organization ID
 * @param {string} planId - Plan ID (e.g., 'starter', 'pro', 'enterprise')
 * @param {string} billingInterval - 'month' or 'year'
 * @param {string} successUrl - URL to redirect after successful payment
 * @param {string} cancelUrl - URL to redirect if user cancels
 * @returns {Promise<string|null>} - Checkout session URL or null
 */
export const createCheckoutSession = async (
  organizationId,
  planId,
  billingInterval = 'month',
  successUrl = null,
  cancelUrl = null
) => {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  // Get current user - this automatically refreshes the session if needed
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (!user || userError) {
    console.error('User authentication check failed:', userError)
    throw new Error('User not authenticated. Please log in and try again.')
  }
  
  console.log('User authenticated:', user.id)

  // Get current session - use getUser() result which already validated the session
  // Avoid calling refreshSession() as it triggers AuthContext side effects
  let { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  // Only refresh if absolutely necessary (session missing or expired)
  if (!session || sessionError || !session.access_token) {
    console.log('No valid session found, attempting to refresh...')
    const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
    if (!refreshedSession || refreshError || !refreshedSession.access_token) {
      console.error('Session refresh failed:', refreshError)
      throw new Error('Your session has expired. Please refresh the page or log in again.')
    }
    session = refreshedSession
    console.log('Session refreshed successfully')
  }
  
  // Verify session is still valid
  if (!session?.access_token) {
    throw new Error('No valid session token available. Please log in again.')
  }
  
  // Don't proactively refresh - use the session we have
  // getUser() above already validated the session is valid

  // Get plan details from database
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('*')
    .eq('id', planId)
    .single()

  if (planError || !plan) {
    throw new Error(`Plan not found: ${planId}`)
  }

  // Get Stripe price ID based on billing interval
  const priceId = billingInterval === 'year' 
    ? plan.stripe_price_id_yearly 
    : plan.stripe_price_id_monthly

  if (!priceId) {
    throw new Error(`Stripe price ID not configured for plan: ${planId}`)
  }

  // Validate that priceId is actually a price ID (starts with 'price_'), not a product ID
  if (!priceId.startsWith('price_')) {
    throw new Error(`Invalid Stripe price ID format for plan ${planId}. Expected price ID (price_*), but got: ${priceId}. Please check your plan configuration in the database.`)
  }

  // Get or create Stripe customer
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('organization_id', organizationId)
    .maybeSingle()

  let customerId = subscription?.stripe_customer_id

  // If no customer, we'll create one via the Edge Function
  // The Edge Function will handle customer creation

  // Use supabase.functions.invoke() which automatically handles JWT authentication
  // The session is already validated by getUser() above, so we can use it directly
  console.log('Creating checkout session with:', {
    organizationId,
    planId,
    priceId,
    billingInterval,
    hasSessionToken: !!session.access_token,
    sessionExpiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'N/A',
    timeUntilExpiry: session.expires_at ? `${Math.round((session.expires_at * 1000 - Date.now()) / 1000)}s` : 'N/A'
  })

  // Use supabase.functions.invoke() - it automatically handles JWT from the client's session
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: {
      organization_id: organizationId,
      plan_id: planId,
      price_id: priceId,
      billing_interval: billingInterval,
      customer_email: user.email,
      customer_id: customerId,
      success_url: successUrl || `${window.location.origin}/billing?success=true`,
      cancel_url: cancelUrl || `${window.location.origin}/billing?canceled=true`,
    }
  })

  if (error) {
    console.error('Error creating checkout session:', error)
    console.error('Full error object:', JSON.stringify(error, null, 2))
    
    // Try to extract the actual error message from the Edge Function response
    let errorMessage = 'Failed to create checkout session'
    
    // The error from supabase.functions.invoke() may have the response in different places
    // Try multiple ways to extract the error message
    try {
      // Method 1: Check if error has a response property we can parse
      if (error.context && typeof error.context.json === 'function') {
        const errorData = await error.context.json().catch(() => null)
        if (errorData?.error) {
          errorMessage = errorData.error
          console.error('Extracted error from response body:', errorData)
        }
      }
      
      // Method 2: Check error.data
      if (errorMessage === 'Failed to create checkout session' && error.data) {
        if (typeof error.data === 'string') {
          try {
            const parsed = JSON.parse(error.data)
            if (parsed.error) errorMessage = parsed.error
          } catch (e) {
            // Not JSON, use as-is
            if (error.data) errorMessage = error.data
          }
        } else if (error.data.error) {
          errorMessage = error.data.error
        }
      }
      
      // Method 3: Check error.message
      if (errorMessage === 'Failed to create checkout session' && error.message) {
        errorMessage = error.message
      }
    } catch (e) {
      console.warn('Error extracting error message:', e)
      // Fallback to generic message
    }
    
    // If it's a JWT/auth error, don't retry with refreshSession as it causes side effects
    // Instead, tell the user to refresh the page
    if (errorMessage.includes('JWT') || errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('Invalid JWT')) {
      throw new Error('Authentication failed. Please refresh the page and try again.')
    }
    
    throw new Error(errorMessage)
  }

  if (!data?.session_url) {
    throw new Error('No checkout session URL returned')
  }

  return data.session_url
}

/**
 * Create a billing portal session for managing subscription
 * @param {string} organizationId - Organization ID
 * @param {string} returnUrl - URL to return to after portal session
 * @returns {Promise<string|null>} - Portal session URL or null
 */
export const createBillingPortalSession = async (
  organizationId,
  returnUrl = null
) => {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  // Get subscription to find Stripe customer ID
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (subError || !subscription?.stripe_customer_id) {
    throw new Error('No active subscription found')
  }

  // Get and refresh session to ensure we have a valid JWT token
  let { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (!session || sessionError) {
    const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
    if (!refreshedSession || refreshError) {
      throw new Error('Session expired. Please log in again.')
    }
    session = refreshedSession
  }

  if (!session?.access_token) {
    throw new Error('No valid session token available')
  }

  // Use direct fetch to ensure the Authorization header is properly set
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error('Supabase URL not configured')
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/create-portal-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    },
    body: JSON.stringify({
      organization_id: organizationId,
      customer_id: subscription.stripe_customer_id,
      return_url: returnUrl || `${window.location.origin}/billing`,
    }),
  })

  if (!response.ok) {
    let errorMessage = 'Failed to create portal session'
    try {
      const errorData = await response.json()
      errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`
      console.error('Edge function error:', errorData)
    } catch (e) {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`
      console.error('Edge function error (no JSON):', errorMessage)
    }
    throw new Error(errorMessage)
  }

  const data = await response.json()
  if (!data?.url) {
    throw new Error('No portal session URL returned')
  }

  return data.url
}

/**
 * Redirect to Stripe Checkout
 * @param {string} sessionUrl - Checkout session URL
 */
export const redirectToCheckout = async (sessionUrl) => {
  if (!sessionUrl) {
    throw new Error('No checkout session URL provided')
  }

  // Direct redirect to Stripe Checkout session URL
  // The sessionUrl is already a full URL from Stripe, so we can navigate directly
  window.location.href = sessionUrl
}

/**
 * Create a personal organization for the user if they don't have one
 * @returns {Promise<string>} - Organization ID
 */
export const createPersonalOrganization = async () => {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  // Get staff profile
  const { data: staffProfile } = await supabase
    .from('staff_members')
    .select('id, name')
    .eq('auth_user_id', user.id)
    .single()

  if (!staffProfile) {
    throw new Error('Staff profile not found')
  }

  // Check if user already has a personal organization
  const { data: existingMemberships } = await supabase
    .from('memberships')
    .select('organization_id, organizations!inner(name)')
    .eq('user_id', staffProfile.id)
    .eq('role', 'Owner')

  if (existingMemberships && existingMemberships.length > 0) {
    // Return the first organization they own
    return existingMemberships[0].organization_id
  }

  // Create a personal organization
  const orgName = `${staffProfile.name}'s Workspace`
  const orgSlug = `personal-${user.id.substring(0, 8)}-${Date.now()}`

  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: orgName,
      slug: orgSlug,
      branding_settings: {},
    })
    .select()
    .single()

  if (orgError) throw orgError

  // Create membership as Owner
  const defaultPermissions = {
    can_vote: true,
    can_set_energy: true,
    can_advance_lobby: true,
    can_advance_office: true,
    can_advance_contract: true,
    can_access_archive: true,
    can_access_vault: true,
    can_edit_release_date: true,
    can_view_metrics: true,
  }

  // Create membership using SECURITY DEFINER function (bypasses RLS)
  const { error: membershipError } = await supabase
    .rpc('create_membership', {
      user_id_param: staffProfile.id,
      organization_id_param: orgData.id,
      role_param: 'Owner',
      permissions_json_param: defaultPermissions,
    })

  if (membershipError) throw membershipError

  return orgData.id
}

/**
 * Handle subscription upgrade/downgrade
 * Creates a personal organization if user doesn't have one
 * @param {string|null} organizationId - Organization ID (null to create personal org)
 * @param {string} newPlanId - New plan ID
 * @param {string} billingInterval - 'month' or 'year'
 */
export const handleSubscriptionChange = async (
  organizationId,
  newPlanId,
  billingInterval = 'month'
) => {
  // If no organization ID, create a personal organization
  let finalOrgId = organizationId
  if (!finalOrgId) {
    finalOrgId = await createPersonalOrganization()
  }

  // Create checkout session for the new plan
  const sessionUrl = await createCheckoutSession(
    finalOrgId,
    newPlanId,
    billingInterval
  )

  // Redirect to checkout
  await redirectToCheckout(sessionUrl)
}

export default {
  getStripe,
  createCheckoutSession,
  createBillingPortalSession,
  redirectToCheckout,
  handleSubscriptionChange,
  createPersonalOrganization,
}
