// Website Ingest (Submission Widget)
// Public Edge Function (verify_jwt = false) with strict Origin allowlisting.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type IngestRequest = {
  organization_id?: string
  organization_slug?: string
  artist_name: string
  email?: string
  track_title: string
  stream_link: string
  genre?: string
  bpm?: number
  note?: string
}

function json(status: number, body: unknown, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

function getOriginHost(req: Request): { origin: string | null; host: string | null } {
  const origin = req.headers.get('Origin')
  if (origin) {
    try {
      const u = new URL(origin)
      return { origin, host: u.host.toLowerCase() }
    } catch {
      // ignore
    }
  }

  const referer = req.headers.get('Referer')
  if (referer) {
    try {
      const u = new URL(referer)
      const o = `${u.protocol}//${u.host}`
      return { origin: o, host: u.host.toLowerCase() }
    } catch {
      // ignore
    }
  }

  return { origin: null, host: null }
}

function normalizeAllowedDomain(value: string): string {
  const v = (value || '').trim().toLowerCase()
  if (!v) return ''
  // allow users to paste full URLs; store/compare by hostname
  try {
    if (v.includes('://')) return new URL(v).host.toLowerCase()
  } catch {
    // ignore
  }
  // strip path if present
  return v.split('/')[0]
}

function isHostAllowed(host: string, allowedDomains: string[]): boolean {
  const h = host.toLowerCase()
  for (const raw of allowedDomains || []) {
    const d = normalizeAllowedDomain(raw)
    if (!d) continue

    // wildcard suffix support: ".example.com" matches foo.example.com and example.com
    if (d.startsWith('.')) {
      const suffix = d.slice(1)
      if (h === suffix || h.endsWith(`.${suffix}`)) return true
      continue
    }

    if (h === d) return true
  }
  return false
}

function corsHeadersFor(origin: string | null) {
  const headers: Record<string, string> = {
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    // keep responses non-cacheable (submission endpoints)
    'Cache-Control': 'no-store',
  }
  if (origin) headers['Access-Control-Allow-Origin'] = origin
  return headers
}

serve(async (req) => {
  const url = new URL(req.url)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const orgIdFromQuery = url.searchParams.get('organization_id')?.trim() || null
  const orgSlugFromQuery = url.searchParams.get('organization_slug')?.trim() || null

  if (req.method === 'OPTIONS') {
    const { origin, host } = getOriginHost(req)
    const organizationId = orgIdFromQuery
    const organizationSlug = orgSlugFromQuery

    // If caller provides org, we can validate and return an allowlisted CORS response.
    if (origin && host && (organizationId || organizationSlug)) {
      const orgQuery = supabase.from('organizations').select('id, allowed_domains').limit(1)
      const { data: org } = organizationId
        ? await orgQuery.eq('id', organizationId).single()
        : await orgQuery.eq('slug', organizationSlug).single()

      const allowedDomains = (org?.allowed_domains || []).map(normalizeAllowedDomain).filter(Boolean)
      if (org?.id && allowedDomains.length > 0 && isHostAllowed(host, allowedDomains)) {
        return new Response('ok', { status: 200, headers: corsHeadersFor(origin) })
      }
      return new Response('forbidden', { status: 403, headers: corsHeadersFor(null) })
    }

    // Fallback: no wildcard allow-origin.
    return new Response('ok', { status: 200, headers: corsHeadersFor(null) })
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' }, corsHeadersFor(null))
  }

  let payload: IngestRequest
  try {
    payload = await req.json()
  } catch {
    return json(400, { error: 'Invalid JSON body' }, corsHeadersFor(null))
  }

  const organizationId = payload.organization_id?.trim() || orgIdFromQuery
  const organizationSlug = payload.organization_slug?.trim() || orgSlugFromQuery

  if (!organizationId && !organizationSlug) {
    return json(400, { error: 'organization_id or organization_slug is required' }, corsHeadersFor(null))
  }

  // Basic field validation (frontend should validate too)
  const artistName = (payload.artist_name || '').trim()
  const trackTitle = (payload.track_title || '').trim()
  const streamLink = (payload.stream_link || '').trim()

  if (!artistName || !trackTitle || !streamLink) {
    return json(
      400,
      { error: 'artist_name, track_title, and stream_link are required' },
      corsHeadersFor(null)
    )
  }

  // Lookup org + allowed_domains
  const orgQuery = supabase.from('organizations').select('id, allowed_domains, branding_settings').limit(1)
  const { data: org, error: orgErr } = organizationId
    ? await orgQuery.eq('id', organizationId).single()
    : await orgQuery.eq('slug', organizationSlug).single()

  if (orgErr || !org?.id) {
    return json(404, { error: 'Organization not found' }, corsHeadersFor(null))
  }

  const { origin, host } = getOriginHost(req)

  const allowedDomains = (org.allowed_domains || []).map(normalizeAllowedDomain).filter(Boolean)
  if (!host || allowedDomains.length === 0 || !isHostAllowed(host, allowedDomains)) {
    return json(403, { error: 'Origin not allowed' }, corsHeadersFor(null))
  }

  // At this point, origin is allowed; respond with precise CORS origin.
  const cors = corsHeadersFor(origin)

  // Find or create artist scoped to organization
  let artistId: string | null = null
  const { data: existingArtist } = await supabase
    .from('artists')
    .select('id')
    .eq('organization_id', org.id)
    .ilike('name', artistName)
    .limit(1)
    .maybeSingle()

  if (existingArtist?.id) {
    artistId = existingArtist.id
  } else {
    const { data: newArtist, error: artistError } = await supabase
      .from('artists')
      .insert({
        name: artistName,
        organization_id: org.id,
      })
      .select('id')
      .single()

    if (artistError) {
      return json(500, { error: `Failed to create artist: ${artistError.message}` }, cors)
    }

    artistId = newArtist.id
  }

  const bpm = Number.isFinite(payload.bpm) ? payload.bpm : undefined
  const genre =
    (payload.genre || '').trim() ||
    (org.branding_settings?.submission_genres && Array.isArray(org.branding_settings.submission_genres)
      ? org.branding_settings.submission_genres[0]
      : null)

  // Create track in label inbox
  const trackInsert: Record<string, unknown> = {
    organization_id: org.id,
    artist_id: artistId,
    artist_name: artistName,
    title: trackTitle,
    sc_link: streamLink,
    status: 'inbox',
    column: 'inbox',
    archived: false,
    source: 'widget', // may exist via migrations; harmless if column exists
  }

  if (genre) trackInsert.genre = genre
  if (typeof bpm === 'number' && bpm > 0 && bpm < 400) trackInsert.bpm = Math.round(bpm)

  // If your schema has these fields, we populate them; otherwise they’ll be ignored by PostgREST error.
  // We therefore feature-detect by attempting insert and falling back without optional fields.
  const attemptInsert = async (data: Record<string, unknown>) => {
    return await supabase.from('tracks').insert(data).select('id, organization_id, artist_name, title, sc_link, created_at').single()
  }

  let trackResp = await attemptInsert({
    ...trackInsert,
    submitter_email: payload.email?.trim() || null,
    submitter_note: payload.note?.trim() || null,
  })

  if (trackResp.error) {
    // Retry without optional fields in case the columns don’t exist
    trackResp = await attemptInsert(trackInsert)
  }

  if (trackResp.error) {
    return json(500, { error: `Failed to create track: ${trackResp.error.message}` }, cors)
  }

  return json(201, { success: true, track: trackResp.data }, cors)
})

