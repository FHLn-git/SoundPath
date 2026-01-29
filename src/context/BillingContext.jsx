import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'

const BillingContext = createContext()

export const useBilling = () => {
  const context = useContext(BillingContext)
  if (!context) {
    throw new Error('useBilling must be used within BillingProvider')
  }
  return context
}

export const BillingProvider = ({ children }) => {
  const { activeOrgId, activeMembership, staffProfile, isSystemAdmin } = useAuth()
  const [subscription, setSubscription] = useState(null)
  const [plan, setPlan] = useState(null)
  const [usage, setUsage] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState([])

  // Load plans (always available to everyone)
  const loadPlans = async () => {
    if (!supabase) return

    try {
      const { data: plansData, error: plansError } = await supabase
        .from('plans')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true })

      if (!plansError && plansData) {
        setPlans(plansData)
      }
    } catch (error) {
      console.error('Error loading plans:', error)
    }
  }

  // Load subscription data
  useEffect(() => {
    // Always load plans first (visible to everyone)
    loadPlans()

    // Only load subscription/usage if user has an active organization
    if (!activeOrgId) {
      setLoading(false)
      return
    }

    loadSubscriptionData()
  }, [activeOrgId])

  const loadSubscriptionData = async () => {
    if (!supabase || !activeOrgId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Load subscription
      const { data: subData, error: subError } = await supabase.rpc(
        'get_organization_subscription',
        { org_id: activeOrgId }
      )

      if (subError) throw subError

      if (subData && subData.length > 0) {
        setSubscription(subData[0])
        // Load plan details
        const { data: planData, error: planError } = await supabase
          .from('plans')
          .select('*')
          .eq('id', subData[0].plan_id)
          .single()

        if (!planError && planData) {
          setPlan(planData)
        }
      }

      // Load usage
      const { data: usageData, error: usageError } = await supabase.rpc('get_organization_usage', {
        org_id: activeOrgId,
      })

      if (!usageError && usageData && usageData.length > 0) {
        setUsage(usageData[0])
      }

      // Load invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('organization_id', activeOrgId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (!invoicesError && invoicesData) {
        setInvoices(invoicesData)
      }

      // Load payment methods
      const { data: pmData, error: pmError } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('organization_id', activeOrgId)
        .order('is_default', { ascending: false })

      if (!pmError && pmData) {
        setPaymentMethods(pmData)
      }

      // Plans already loaded in useEffect, no need to reload
    } catch (error) {
      console.error('Error loading subscription data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Check if organization has feature access
  // Checks the plan's features JSONB directly
  // CRITICAL: System admins must have full access to all features, bypassing all restrictions
  const hasFeature = async featureKey => {
    // Check system admin status with fallback - check both isSystemAdmin and staffProfile.role
    const userIsSystemAdmin = Boolean(isSystemAdmin || staffProfile?.role === 'SystemAdmin')

    // System admins always have access to everything
    if (userIsSystemAdmin) {
      return true
    }

    // TRIAL RULES (Pulse Guard):
    // During the 7-day Pro trial, keep Global Trend Reports locked.
    if (staffProfile?.user_status === 'trialing' && featureKey === 'global_trend_reports') {
      return false
    }

    // For personal features (like personal_inbox), activeOrgId can be null
    // In that case, we check the free plan or user's personal subscription
    if (!supabase) return false

    // If activeOrgId is null and it's a personal feature, check the user's tier plan
    if (!activeOrgId && (featureKey === 'personal_inbox' || featureKey === 'network')) {
      try {
        const tierPlanId = staffProfile?.tier || 'free'

        // Personal sampler access: any non-free tier (agent/starter/pro) can access personal inbox + network.
        // This is intentionally tier-based (not feature-flag based) to avoid misconfigured plan JSON blocking access.
        if (
          (featureKey === 'personal_inbox' || featureKey === 'network') &&
          tierPlanId !== 'free'
        ) {
          return true
        }

        // Prefer already-loaded plans
        const planRow = plans?.find(p => p.id === tierPlanId)
        let features = planRow?.features

        // Fallback: fetch if not loaded
        if (!features) {
          const { data: fetched } = await supabase
            .from('plans')
            .select('features')
            .eq('id', tierPlanId)
            .single()
          features = fetched?.features
        }

        if (features) {
          const featureMap = {
            api_access: 'has_api_access',
            webhooks: 'has_webhooks',
            analytics: 'has_analytics',
            advanced_analytics: 'has_analytics',
            sso: 'has_sso',
            custom_branding: 'has_custom_branding',
            white_label: 'has_white_label',
            global_trend_reports: 'has_global_trend_reports',
            personal_inbox: 'has_personal_inbox',
            network: 'has_network',
          }
          const planFeatureKey = featureMap[featureKey] || `has_${featureKey}`
          return features[planFeatureKey] === true
        }
        return false
      } catch (error) {
        console.error('Error checking personal feature access:', error)
        return false
      }
    }

    // For organization features, activeOrgId must be set
    if (!activeOrgId) return false

    try {
      // If we have the plan loaded, check its features directly
      if (plan?.features) {
        // Map feature keys to plan feature names
        const featureMap = {
          api_access: 'has_api_access',
          webhooks: 'has_webhooks',
          analytics: 'has_analytics',
          advanced_analytics: 'has_analytics',
          sso: 'has_sso',
          custom_branding: 'has_custom_branding',
          white_label: 'has_white_label',
          global_trend_reports: 'has_global_trend_reports',
          personal_inbox: 'has_personal_inbox',
          network: 'has_network',
        }

        const planFeatureKey = featureMap[featureKey] || `has_${featureKey}`
        return plan.features[planFeatureKey] === true
      }

      // Fallback: Get plan from subscription if not loaded
      const { data: subData, error: subError } = await supabase.rpc(
        'get_organization_subscription',
        { org_id: activeOrgId }
      )

      if (subError || !subData || subData.length === 0) {
        // No subscription, check free plan
        const { data: freePlan } = await supabase
          .from('plans')
          .select('features')
          .eq('id', 'free')
          .single()

        if (freePlan?.features) {
          const featureMap = {
            api_access: 'has_api_access',
            webhooks: 'has_webhooks',
            analytics: 'has_analytics',
            advanced_analytics: 'has_analytics',
            sso: 'has_sso',
            custom_branding: 'has_custom_branding',
            white_label: 'has_white_label',
            global_trend_reports: 'has_global_trend_reports',
            personal_inbox: 'has_personal_inbox',
            network: 'has_network',
          }
          const planFeatureKey = featureMap[featureKey] || `has_${featureKey}`
          return freePlan.features[planFeatureKey] === true
        }
        return false
      }

      // Get plan features
      const { data: planData, error: planError } = await supabase
        .from('plans')
        .select('features')
        .eq('id', subData[0].plan_id)
        .single()

      if (planError || !planData?.features) return false

      const featureMap = {
        api_access: 'has_api_access',
        webhooks: 'has_webhooks',
        analytics: 'has_analytics',
        advanced_analytics: 'has_analytics',
        sso: 'has_sso',
        custom_branding: 'has_custom_branding',
        white_label: 'has_white_label',
        global_trend_reports: 'has_global_trend_reports',
        personal_inbox: 'has_personal_inbox',
        network: 'has_network',
      }

      const planFeatureKey = featureMap[featureKey] || `has_${featureKey}`
      return planData.features[planFeatureKey] === true
    } catch (error) {
      console.error('Error checking feature access:', error)
      return false
    }
  }

  // Check if within usage limit
  const checkLimit = async limitType => {
    if (!supabase || !activeOrgId) return false

    try {
      const { data, error } = await supabase.rpc('check_usage_limit', {
        org_id: activeOrgId,
        limit_type: limitType,
      })

      if (error) throw error
      return data || false
    } catch (error) {
      console.error('Error checking usage limit:', error)
      return false
    }
  }

  // Get usage percentage
  const getUsagePercentage = limitType => {
    if (!usage || !plan) return 0

    // Handle both 'max_tracks' and 'tracks' key formats
    const limit = plan.limits?.[limitType] || plan.limits?.[`max_${limitType}`]
    if (!limit || limit === -1) return 0 // Unlimited

    // Map limit types to usage fields
    const usageFieldMap = {
      max_tracks: 'tracks_count',
      tracks: 'tracks_count',
      max_staff: 'staff_count',
      staff: 'staff_count',
      max_api_calls_per_month: 'api_calls_count',
      api_calls: 'api_calls_count',
      max_contacts: 'contacts_count',
      contacts: 'contacts_count',
      max_vault_tracks: 'vault_tracks_count',
      vault_tracks: 'vault_tracks_count',
    }

    const usageField = usageFieldMap[limitType] || `${limitType.replace('max_', '')}_count`
    const current = usage[usageField] || usage[limitType] || 0
    return Math.min(100, (current / limit) * 100)
  }

  // Check if subscription is active
  const isActive = () => {
    return subscription?.status === 'active' || subscription?.status === 'trialing'
  }

  // Check if on trial
  const isTrial = () => {
    return subscription?.status === 'trialing'
  }

  // Check if subscription is past due
  const isPastDue = () => {
    return subscription?.status === 'past_due'
  }

  // Get days until trial ends
  const getTrialDaysRemaining = () => {
    if (!subscription?.trial_end) return null
    const now = new Date()
    const trialEnd = new Date(subscription.trial_end)
    const diff = trialEnd - now
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  const value = {
    subscription,
    plan,
    usage,
    invoices,
    paymentMethods,
    plans,
    loading,
    isActive,
    isTrial,
    isPastDue,
    getTrialDaysRemaining,
    hasFeature,
    checkLimit,
    getUsagePercentage,
    refresh: () => {
      loadPlans()
      if (activeOrgId) {
        loadSubscriptionData()
      }
    },
  }

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>
}
