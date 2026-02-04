// Product Analytics Integration
// Supports PostHog, Mixpanel, and custom analytics

let analyticsInitialized = false
let analyticsProvider = null

// Initialize analytics
export const initAnalytics = () => {
  if (analyticsInitialized) return

  const provider = import.meta.env.VITE_ANALYTICS_PROVIDER || 'posthog'
  const apiKey = import.meta.env.VITE_ANALYTICS_API_KEY

  if (!apiKey) return

  try {
    if (provider === 'posthog') {
      // PostHog initialization
      if (typeof window !== 'undefined' && window.posthog) {
        window.posthog.init(apiKey, {
          api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
          loaded: posthog => {
            analyticsProvider = 'posthog'
            analyticsInitialized = true
            console.log('✅ PostHog initialized')
          },
        })
      }
    } else if (provider === 'mixpanel') {
      // Mixpanel initialization
      if (typeof window !== 'undefined' && window.mixpanel) {
        window.mixpanel.init(apiKey)
        analyticsProvider = 'mixpanel'
        analyticsInitialized = true
        console.log('✅ Mixpanel initialized')
      }
    }
  } catch (error) {
    console.error('Error initializing analytics:', error)
  }
}

// Track event
export const trackEvent = (eventName, properties = {}) => {
  if (!analyticsInitialized) return

  try {
    if (analyticsProvider === 'posthog' && window.posthog) {
      window.posthog.capture(eventName, properties)
    } else if (analyticsProvider === 'mixpanel' && window.mixpanel) {
      window.mixpanel.track(eventName, properties)
    }
  } catch (error) {
    console.error('Error tracking event:', error)
  }
}

// Identify user
export const identifyUser = (userId, traits = {}) => {
  if (!analyticsInitialized) return

  try {
    if (analyticsProvider === 'posthog' && window.posthog) {
      window.posthog.identify(userId, traits)
    } else if (analyticsProvider === 'mixpanel' && window.mixpanel) {
      window.mixpanel.identify(userId)
      window.mixpanel.people.set(traits)
    }
  } catch (error) {
    console.error('Error identifying user:', error)
  }
}

// Track page view
export const trackPageView = (pageName, properties = {}) => {
  trackEvent('$pageview', {
    page: pageName,
    ...properties,
  })
}

// Track feature usage
export const trackFeatureUsage = (featureName, properties = {}) => {
  trackEvent('feature_used', {
    feature: featureName,
    ...properties,
  })
}

// Track conversion
export const trackConversion = (conversionType, value = null) => {
  trackEvent('conversion', {
    type: conversionType,
    value,
  })
}
