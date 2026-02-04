// Error tracking - now uses custom error logger instead of Sentry
// Errors are stored in database and viewable in God Mode dashboard

import { initErrorLogger, logError } from './errorLogger'

let errorTrackingInitialized = false

export const initErrorTracking = () => {
  // Only initialize once
  if (errorTrackingInitialized) return

  initErrorLogger()
  errorTrackingInitialized = true
}

export const captureException = (error, context = {}) => {
  logError({
    message: error?.message || 'Unknown error',
    stack: error?.stack,
    context: {
      ...context,
      errorName: error?.name,
      errorString: error?.toString(),
    },
    severity: 'error',
  })
}

export const captureMessage = (message, level = 'info') => {
  logError({
    message,
    severity: level === 'error' ? 'error' : level === 'warning' ? 'warning' : 'info',
  })
}

export const setUserContext = user => {
  // User context is automatically captured by error logger
  // No need to set it explicitly
}

export const clearUserContext = () => {
  // User context is automatically captured by error logger
  // No need to clear it explicitly
}
