import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initErrorTracking } from './lib/errorTracking'
import { initErrorLogger } from './lib/errorLogger'
import { initAnalytics } from './lib/analytics'

// Initialize custom error tracking (replaces Sentry)
initErrorLogger()
initErrorTracking()

// Initialize product analytics
initAnalytics()

// Strict Mode disabled: it double-mounts effects and causes Supabase auth getSession/subscriptions
// to abort each other, leading to loading/error/app-selector glitching. Re-enable when auth is
// fully resilient to double init or run production build (no double-mount there).
ReactDOM.createRoot(document.getElementById('root')).render(<App />)
