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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
