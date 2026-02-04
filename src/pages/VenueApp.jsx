/**
 * Venue (ShowCheck) – full-viewport embed. No sidebar or Label chrome; just the Venue app.
 *
 * Dev: run ShowCheck with `npm run dev -- -p 3001` and set VITE_VENUE_APP_URL=http://localhost:3001 (optional).
 * Prod: set VITE_VENUE_APP_URL to your deployed Venue app URL.
 * When no URL is configured (or prod with localhost), show Coming Soon instead of a blank iframe.
 */
import { useMemo } from 'react'
import ComingSoonApp from './ComingSoonApp'

export default function VenueApp() {
  const { url, isConfigured } = useMemo(() => {
    const raw =
      typeof import.meta.env.VITE_VENUE_APP_URL === 'string'
        ? import.meta.env.VITE_VENUE_APP_URL.trim()
        : ''
    const url = raw || 'http://localhost:3001'
    const isProd = import.meta.env.PROD
    const isConfigured = raw.length > 0 && (!isProd || !url.startsWith('http://localhost'))
    return { url, isConfigured }
  }, [])

  if (!isConfigured) {
    return <ComingSoonApp appName="Venue" />
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-950">
      <iframe
        title="Venue"
        src={url}
        className="flex-1 w-full min-h-0 border-0"
        allow="fullscreen"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  )
}
