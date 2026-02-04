/**
 * Subdomain + path-based app context for multi-app architecture.
 * - soundpath.app (no subdomain) → marketing + path-based /app/label, /app/venue, /app/artist
 * - label.soundpath.app → Label app (paths like /launchpad, /labels/:id)
 * - venue.soundpath.app → Venue app
 * - artist.soundpath.app → Artist app (Coming Soon)
 * - localhost → use path-based /app/label, /app/venue, /app/artist (no subdomains)
 */

const LABEL_SUBDOMAIN = 'label'
const VENUE_SUBDOMAIN = 'venue'
const ARTIST_SUBDOMAIN = 'artist'
const PRODUCTION_DOMAIN = 'soundpath.app'

/**
 * Get current app host from window (subdomain on production) or null for marketing/path-based.
 * @returns {'label'|'venue'|'artist'|null}
 */
export function getAppHost() {
  if (typeof window === 'undefined') return null
  const hostname = window.location.hostname
  if (hostname === 'localhost' || hostname.startsWith('127.')) return null
  if (hostname.endsWith(PRODUCTION_DOMAIN)) {
    const sub = hostname.slice(0, -PRODUCTION_DOMAIN.length).replace(/\.$/, '')
    if (sub === LABEL_SUBDOMAIN) return 'label'
    if (sub === VENUE_SUBDOMAIN) return 'venue'
    if (sub === ARTIST_SUBDOMAIN) return 'artist'
  }
  return null
}

/**
 * Base URL for a given app (for AppSwitcher absolute links).
 * Production: https://label.soundpath.app, etc. Local: same origin, path-based.
 */
export function getAppBaseUrl(app) {
  if (typeof window === 'undefined') {
    const origin = import.meta.env.VITE_APP_ORIGIN || 'https://soundpath.app'
    if (app === 'label') return `${origin.replace('soundpath.app', 'label.soundpath.app')}`
    if (app === 'venue') return `${origin.replace('soundpath.app', 'venue.soundpath.app')}`
    if (app === 'artist') return `${origin.replace('soundpath.app', 'artist.soundpath.app')}`
    return origin
  }
  const hostname = window.location.hostname
  const isProd = hostname !== 'localhost' && !hostname.startsWith('127.')
  const protocol = window.location.protocol
  if (isProd && hostname.endsWith(PRODUCTION_DOMAIN)) {
    if (app === 'label') return `${protocol}//label.${PRODUCTION_DOMAIN}`
    if (app === 'venue') return `${protocol}//venue.${PRODUCTION_DOMAIN}`
    if (app === 'artist') return `${protocol}//artist.${PRODUCTION_DOMAIN}`
  }
  // Local or unknown: path-based on current origin
  if (app === 'label') return `${window.location.origin}/app/label/launchpad`
  if (app === 'venue') return `${window.location.origin}/app/venue`
  if (app === 'artist') return `${window.location.origin}/app/artist`
  return window.location.origin
}

/**
 * Whether we're on a dashboard subdomain (label/venue/artist) so path is relative to that app.
 */
export function isSubdomainDashboard() {
  return getAppHost() !== null
}

/**
 * Normalize path for Label app (for NavLink/Link in Sidebar etc.).
 * On label subdomain: /label/launchpad, /label/labels/:id. On main/localhost: /app/label/launchpad, etc.
 */
export function getLabelPath(pathWithoutPrefix) {
  const host = getAppHost()
  if (host === 'label') return pathWithoutPrefix ? `/label/${pathWithoutPrefix}` : '/label/launchpad'
  return pathWithoutPrefix ? `/app/label/${pathWithoutPrefix}` : '/app/label/launchpad'
}

export function getVenuePath() {
  return getAppHost() === 'venue' ? '/' : '/app/venue'
}

export function getArtistPath() {
  return getAppHost() === 'artist' ? '/' : '/app/artist'
}
