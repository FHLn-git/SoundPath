// Custom Error Logging System for SoundPath
// Stores errors in database for admin review in God Mode dashboard

import { supabase } from './supabaseClient'

let errorLoggerInitialized = false

// Initialize error logger
export const initErrorLogger = () => {
  if (errorLoggerInitialized) return
  errorLoggerInitialized = true
  
  // Set up global error handlers
  if (typeof window !== 'undefined') {
    // Catch unhandled errors
    window.addEventListener('error', (event) => {
      logError({
        message: event.message || 'Unhandled error',
        stack: event.error?.stack,
        url: window.location.href,
        component: 'Global Error Handler',
        severity: 'error'
      })
    })

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      logError({
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        url: window.location.href,
        component: 'Promise Rejection',
        severity: 'error'
      })
    })
  }
}

// Get current user context
const getUserContext = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { userId: null, staffMemberId: null, organizationId: null }

    // Get staff member and organization
    const { data: staffMember } = await supabase
      .from('staff_members')
      .select('id, organization_id')
      .eq('auth_user_id', user.id)
      .single()

    return {
      userId: user.id,
      staffMemberId: staffMember?.id || null,
      organizationId: staffMember?.organization_id || null
    }
  } catch (error) {
    return { userId: null, staffMemberId: null, organizationId: null }
  }
}

// Get browser info
const getBrowserInfo = () => {
  if (typeof window === 'undefined') return null

  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenWidth: window.screen?.width,
    screenHeight: window.screen?.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    url: window.location.href,
    referrer: document.referrer
  }
}

// Main error logging function
export const logError = async ({
  message,
  stack = null,
  component = null,
  url = null,
  context = null,
  severity = 'error',
  user = null,
  staffMember = null,
  organization = null
}) => {
  if (!supabase) {
    console.error('Error logger: Supabase not available', { message, stack })
    return
  }

  try {
    // Get user context if not provided
    let userId = user
    let staffMemberId = staffMember
    let organizationId = organization

    if (!userId || !staffMemberId) {
      const userContext = await getUserContext()
      userId = userId || userContext.userId
      staffMemberId = staffMemberId || userContext.staffMemberId
      organizationId = organizationId || userContext.organizationId
    }

    // Get browser info
    const browserInfo = getBrowserInfo()

    // Call the database function to log the error
    const { data, error } = await supabase.rpc('log_error', {
      p_error_message: message,
      p_error_stack: stack,
      p_error_component: component,
      p_error_url: url || window?.location?.href || null,
      p_user_id: userId,
      p_staff_member_id: staffMemberId,
      p_organization_id: organizationId,
      p_user_agent: browserInfo?.userAgent || null,
      p_browser_info: browserInfo,
      p_error_context: context,
      p_severity: severity
    })

    if (error) {
      console.error('Failed to log error to database:', error)
    } else {
      console.log('Error logged to database:', data)
    }
  } catch (error) {
    // Don't let error logging break the app
    console.error('Error in error logger:', error)
  }
}

// Log warning
export const logWarning = (message, context = null) => {
  return logError({
    message,
    context,
    severity: 'warning'
  })
}

// Log info
export const logInfo = (message, context = null) => {
  return logError({
    message,
    context,
    severity: 'info'
  })
}

// Make available globally for ErrorBoundary
if (typeof window !== 'undefined') {
  window.logError = logError
  window.logWarning = logWarning
  window.logInfo = logInfo
}
