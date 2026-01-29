import { useState, useEffect } from 'react'
import { useBilling } from '../context/BillingContext'
import { supabase } from '../lib/supabaseClient'

export const useUsageLimits = () => {
  const { plan, usage, checkLimit, getUsagePercentage } = useBilling()
  const [limits, setLimits] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (plan) {
      setLimits(plan.limits || {})
      setLoading(false)
    }
  }, [plan])

  // Check if can add track
  // IMPORTANT: If plan is null, fall back to database check to avoid blocking paid users during loading
  const canAddTrack = async () => {
    // If plan is loaded, check limits from plan
    if (plan) {
      if (!plan.limits?.max_tracks) return true // No limit
      if (plan.limits.max_tracks === -1) return true // Unlimited
    }
    // Fall back to database check (handles null plan case for paid users)
    return await checkLimit('tracks')
  }

  // Check if can add staff member
  // IMPORTANT: If plan is null, fall back to database check to avoid blocking paid users during loading
  const canAddStaff = async () => {
    // If plan is loaded, check limits from plan
    if (plan) {
      if (!plan.limits?.max_staff) return true
      if (plan.limits.max_staff === -1) return true
    }
    // Fall back to database check (handles null plan case for paid users)
    return await checkLimit('staff')
  }

  // Check if can make API call
  // IMPORTANT: If plan is null, fall back to database check to avoid blocking paid users during loading
  const canMakeAPICall = async () => {
    // If plan is loaded, check limits from plan
    if (plan) {
      if (!plan.limits?.max_api_calls_per_month) return true
      if (plan.limits.max_api_calls_per_month === -1) return true
    }
    // Fall back to database check (handles null plan case for paid users)
    return await checkLimit('api_calls')
  }

  // Get remaining capacity
  const getRemaining = limitType => {
    if (!usage || !plan?.limits) return null
    const limit = plan.limits[limitType]
    if (!limit || limit === -1) return 'Unlimited'
    const current = usage[`${limitType}_count`] || usage[limitType] || 0
    return Math.max(0, limit - current)
  }

  // Check if at limit
  const isAtLimit = limitType => {
    if (!usage || !plan?.limits) return false
    const limit = plan.limits[limitType]
    if (!limit || limit === -1) return false
    const current = usage[`${limitType}_count`] || usage[limitType] || 0
    return current >= limit
  }

  // Get limit message
  const getLimitMessage = limitType => {
    if (!plan) return 'Loading...'
    const limit = plan.limits?.[limitType]
    if (!limit || limit === -1) return null
    const current = usage?.[`${limitType}_count`] || usage?.[limitType] || 0
    const remaining = limit - current
    if (remaining <= 0) {
      return `You've reached your ${limitType} limit. Upgrade your plan to continue.`
    }
    if (remaining <= 5) {
      return `You have ${remaining} ${limitType} remaining. Consider upgrading.`
    }
    return null
  }

  return {
    limits,
    usage,
    plan,
    loading,
    canAddTrack,
    canAddStaff,
    canMakeAPICall,
    getRemaining,
    isAtLimit,
    getLimitMessage,
    getUsagePercentage,
  }
}
