// OAuth: Google (Calendar + basic profile)
// Single function handles:
// - action=start   (requires Authorization header, validates org role)
// - action=callback (validates signed state, exchanges code, stores encrypted tokens)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.events',
]

function b64urlEncode(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function b64urlDecode(s: string) {
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  return new Uint8Array([...bin].map((c) => c.charCodeAt(0)))
}

function json(status: number, body: unknown, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

async function sha256Base64Url(input: string) {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return b64urlEncode(new Uint8Array(digest))
}

async function hmacSign(secret: string, msg: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg))
  return b64urlEncode(new Uint8Array(sig))
}

async function hmacVerify(secret: string, msg: string, sig: string) {
  const expected = await hmacSign(secret, msg)
  return expected === sig
}

function parseKey(key: string): Uint8Array {
  const k = (key || '').trim()
  if (!k) throw new Error('Missing encryption key')
  // hex?
  if (/^[0-9a-f]{64}$/i.test(k)) {
    const out = new Uint8Array(32)
    for (let i = 0; i < 32; i++) out[i] = parseInt(k.slice(i * 2, i * 2 + 2), 16)
    return out
  }
  // base64
  const bin = atob(k)
  return new Uint8Array([...bin].map((c) => c.charCodeAt(0)))
}

async function aesGcmEncrypt(plaintext: string, keyBytes: Uint8Array) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt'])
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  )
  const ctBytes = new Uint8Array(ct)
  const ivB64 = b64urlEncode(iv)
  const ctB64 = b64urlEncode(ctBytes)
  return `v1:${ivB64}:${ctB64}`
}

type StatePayload = {
  org_id: string
  return_to: string
  code_verifier: string
  iat: number
}

serve(async (req) => {
  const url = new URL(req.url)
  const action = url.searchParams.get('action') || 'start'

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const stateSecret = Deno.env.get('OAUTH_STATE_SECRET') || ''
  const encKeyRaw = Deno.env.get('OAUTH_TOKEN_ENCRYPTION_KEY') || ''

  const redirectUri = new URL('/functions/v1/oauth-google', supabaseUrl)
  redirectUri.searchParams.set('action', 'callback')

  if (action === 'start') {
    const authHeader = req.headers.get('Authorization') || ''
    if (!authHeader.startsWith('Bearer ')) {
      return json(401, { error: 'Missing Authorization' })
    }
    const jwt = authHeader.slice('Bearer '.length)

    const orgId = url.searchParams.get('organization_id') || ''
    const returnTo = url.searchParams.get('return_to') || ''
    if (!orgId || !returnTo) {
      return json(400, { error: 'organization_id and return_to are required' })
    }

    // Validate caller + org role (Owner/Manager only)
    const { data: userData, error: userError } = await supabase.auth.getUser(jwt)
    if (userError || !userData?.user?.id) return json(401, { error: 'Invalid user session' })

    const { data: staff } = await supabase
      .from('staff_members')
      .select('id')
      .eq('auth_user_id', userData.user.id)
      .maybeSingle()

    if (!staff?.id) return json(403, { error: 'Staff profile not found' })

    const { data: membership } = await supabase
      .from('memberships')
      .select('role, active')
      .eq('organization_id', orgId)
      .eq('user_id', staff.id)
      .eq('active', true)
      .maybeSingle()

    if (!membership || !['Owner', 'Manager'].includes(membership.role)) {
      return json(403, { error: 'Insufficient role' })
    }

    if (!stateSecret) return json(500, { error: 'Missing OAUTH_STATE_SECRET' })

    const codeVerifier = b64urlEncode(crypto.getRandomValues(new Uint8Array(32)))
    const codeChallenge = await sha256Base64Url(codeVerifier)

    const payload: StatePayload = {
      org_id: orgId,
      return_to: returnTo,
      code_verifier: codeVerifier,
      iat: Math.floor(Date.now() / 1000),
    }

    const payloadStr = JSON.stringify(payload)
    const payloadB64 = b64urlEncode(new TextEncoder().encode(payloadStr))
    const sig = await hmacSign(stateSecret, payloadB64)
    const state = `${payloadB64}.${sig}`

    const authUrl = new URL(GOOGLE_AUTH_URL)
    authUrl.searchParams.set('client_id', Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') || '')
    authUrl.searchParams.set('redirect_uri', redirectUri.toString())
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', SCOPES.join(' '))
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
    authUrl.searchParams.set('include_granted_scopes', 'true')
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('code_challenge', codeChallenge)
    authUrl.searchParams.set('code_challenge_method', 'S256')

    return json(200, { url: authUrl.toString() })
  }

  if (action === 'callback') {
    const code = url.searchParams.get('code') || ''
    const state = url.searchParams.get('state') || ''
    const oauthError = url.searchParams.get('error') || ''

    if (oauthError) {
      return new Response(null, { status: 302, headers: { Location: `${url.origin}/?oauth_error=${encodeURIComponent(oauthError)}` } })
    }
    if (!code || !state || !state.includes('.')) {
      return json(400, { error: 'Missing code/state' })
    }
    if (!stateSecret) return json(500, { error: 'Missing OAUTH_STATE_SECRET' })

    const [payloadB64, sig] = state.split('.', 2)
    if (!(await hmacVerify(stateSecret, payloadB64, sig))) {
      return json(400, { error: 'Invalid state signature' })
    }

    const payloadJson = new TextDecoder().decode(b64urlDecode(payloadB64))
    const payload = JSON.parse(payloadJson) as StatePayload
    if (!payload?.org_id || !payload?.return_to || !payload?.code_verifier) {
      return json(400, { error: 'Invalid state payload' })
    }

    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') || ''
    const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') || ''
    if (!clientId || !clientSecret) return json(500, { error: 'Missing Google OAuth client config' })

    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri.toString(),
        grant_type: 'authorization_code',
        code_verifier: payload.code_verifier,
      }).toString(),
    })

    const tokenJson = await tokenRes.json().catch(() => null)
    if (!tokenRes.ok) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${payload.return_to}?integration=google&connected=0&error=${encodeURIComponent(tokenJson?.error_description || 'token_exchange_failed')}`,
        },
      })
    }

    const accessToken = tokenJson.access_token as string
    const refreshToken = (tokenJson.refresh_token as string) || null
    const tokenType = (tokenJson.token_type as string) || 'Bearer'
    const expiresIn = Number(tokenJson.expires_in || 0)
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null

    const profileRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `${tokenType} ${accessToken}` },
    })
    const profile = await profileRes.json().catch(() => ({}))

    const keyBytes = parseKey(encKeyRaw)
    if (keyBytes.length !== 32) return json(500, { error: 'OAUTH_TOKEN_ENCRYPTION_KEY must be 32 bytes' })

    const encryptedAccess = await aesGcmEncrypt(accessToken, keyBytes)
    const encryptedRefresh = refreshToken ? await aesGcmEncrypt(refreshToken, keyBytes) : null

    const { error: upsertError } = await supabase
      .from('oauth_connections')
      .upsert(
        {
          organization_id: payload.org_id,
          provider: 'google',
          account_email: profile?.email || null,
          account_name: profile?.name || null,
          scopes: SCOPES,
          token_type: tokenType,
          encrypted_access_token: encryptedAccess,
          encrypted_refresh_token: encryptedRefresh,
          expires_at: expiresAt,
          active: true,
        },
        { onConflict: 'organization_id,provider' }
      )

    const redirect = upsertError
      ? `${payload.return_to}?integration=google&connected=0&error=${encodeURIComponent(upsertError.message)}`
      : `${payload.return_to}?integration=google&connected=1`

    return new Response(null, { status: 302, headers: { Location: redirect } })
  }

  return json(400, { error: 'Unknown action' })
})

