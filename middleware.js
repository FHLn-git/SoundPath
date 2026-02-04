/**
 * Subdomain + path-based routing for SoundPath multi-app architecture.
 * - label.soundpath.app → redirect to /label/... so SPA path is /label/*
 * - venue.soundpath.app → /venue
 * - artist.soundpath.app → /artist
 * - soundpath.app (no subdomain) and localhost → no rewrite
 */
import { next } from '@vercel/functions'

const PRODUCTION_DOMAIN = 'soundpath.app'
const SUBDOMAINS = ['label', 'venue', 'artist']

export const config = {
  matcher: [
    /*
     * Run on all pathnames except static and API.
     * Vite SPA: we need to run on every request to check host.
     */
    '/((?!_next/static|_next/image|favicon|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|woff2?)$).*)',
  ],
}

function middleware(request) {
  const url = new URL(request.url)
  const hostname = url.hostname
  const pathname = url.pathname

  // localhost: no subdomain rewrite; path-based /app/label etc. stays as-is
  if (hostname === 'localhost' || hostname.startsWith('127.')) {
    return next()
  }

  // Only rewrite on production domain subdomains
  if (!hostname.endsWith(PRODUCTION_DOMAIN)) {
    return next()
  }

  const sub = hostname.slice(0, -PRODUCTION_DOMAIN.length).replace(/\.$/, '')
  if (!SUBDOMAINS.includes(sub)) {
    return next()
  }

  const prefix = `/${sub}`
  // Already under /label, /venue, /artist — pass through
  if (pathname === prefix || pathname.startsWith(prefix + '/')) {
    return next()
  }

  // Redirect so SPA sees path /label/*, /venue, or /artist (browser URL updates)
  let newPath
  if (sub === 'label') {
    newPath = pathname === '/' ? `${prefix}/launchpad` : `${prefix}${pathname}`
  } else {
    newPath = pathname === '/' ? prefix : `${prefix}${pathname}`
  }
  const rewritten = new URL(request.url)
  rewritten.pathname = newPath
  return Response.redirect(rewritten, 302)
}

export default middleware
