// Calendar Sync Worker
// Processes pending calendar_jobs for Google/Microsoft.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MAX_RETRIES = 5
const RETRY_DELAYS = [1000, 5000, 15000, 60000, 300000]

function b64urlDecode(s: string) {
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  return new Uint8Array([...bin].map((c) => c.charCodeAt(0)))
}

function b64urlEncode(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function parseKey(key: string): Uint8Array {
  const k = (key || '').trim()
  if (!k) throw new Error('Missing encryption key')
  if (/^[0-9a-f]{64}$/i.test(k)) {
    const out = new Uint8Array(32)
    for (let i = 0; i < 32; i++) out[i] = parseInt(k.slice(i * 2, i * 2 + 2), 16)
    return out
  }
  const bin = atob(k)
  return new Uint8Array([...bin].map((c) => c.charCodeAt(0)))
}

async function aesGcmDecrypt(ciphertext: string, keyBytes: Uint8Array) {
  const parts = (ciphertext || '').split(':')
  if (parts.length !== 3 || parts[0] !== 'v1') throw new Error('Unsupported ciphertext format')
  const iv = b64urlDecode(parts[1])
  const ct = b64urlDecode(parts[2])
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt'])
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return new TextDecoder().decode(new Uint8Array(pt))
}

async function aesGcmEncrypt(plaintext: string, keyBytes: Uint8Array) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt'])
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext))
  return `v1:${b64urlEncode(iv)}:${b64urlEncode(new Uint8Array(ct))}`
}

function buildFollowUpEvent(track: any) {
  const start = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
  const end = new Date(start.getTime() + 15 * 60 * 1000)
  const summary = `Follow up: ${track?.artist_name || 'Artist'} — ${track?.title || 'Track'}`
  const description = track?.sc_link ? `Listen: ${track.sc_link}` : undefined
  return { start, end, summary, description }
}

function buildReleaseEvent(track: any) {
  const dateStr = track?.release_date
  const summary = `Release: ${track?.artist_name || 'Artist'} — ${track?.title || 'Track'}`
  const description = track?.sc_link ? `Listen: ${track.sc_link}` : undefined
  return { dateStr, summary, description }
}

async function refreshGoogleIfNeeded(conn: any, keyBytes: Uint8Array) {
  const expiresAt = conn?.expires_at ? new Date(conn.expires_at).getTime() : null
  const needs = expiresAt ? expiresAt - Date.now() < 60_000 : false
  if (!needs) return conn
  if (!conn?.encrypted_refresh_token) return conn

  const refreshToken = await aesGcmDecrypt(conn.encrypted_refresh_token, keyBytes)
  const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') || ''
  const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') || ''
  if (!clientId || !clientSecret) return conn

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) return conn

  const access = json.access_token as string
  const expiresIn = Number(json.expires_in || 0)
  const expiresAtIso = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : conn.expires_at

  return {
    ...conn,
    encrypted_access_token: await aesGcmEncrypt(access, keyBytes),
    expires_at: expiresAtIso,
  }
}

async function refreshMicrosoftIfNeeded(conn: any, keyBytes: Uint8Array) {
  const expiresAt = conn?.expires_at ? new Date(conn.expires_at).getTime() : null
  const needs = expiresAt ? expiresAt - Date.now() < 60_000 : false
  if (!needs) return conn
  if (!conn?.encrypted_refresh_token) return conn

  const refreshToken = await aesGcmDecrypt(conn.encrypted_refresh_token, keyBytes)
  const clientId = Deno.env.get('MICROSOFT_OAUTH_CLIENT_ID') || ''
  const clientSecret = Deno.env.get('MICROSOFT_OAUTH_CLIENT_SECRET') || ''
  if (!clientId || !clientSecret) return conn

  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: 'openid profile email offline_access Calendars.ReadWrite',
    }).toString(),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) return conn

  const access = json.access_token as string
  const expiresIn = Number(json.expires_in || 0)
  const expiresAtIso = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : conn.expires_at

  return {
    ...conn,
    encrypted_access_token: await aesGcmEncrypt(access, keyBytes),
    expires_at: expiresAtIso,
  }
}

serve(async (req) => {
  const workerToken = Deno.env.get('WORKER_TOKEN') || ''
  if (workerToken) {
    const url = new URL(req.url)
    const provided = url.searchParams.get('token') || req.headers.get('X-Worker-Token') || ''
    if (provided !== workerToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const encKeyRaw = Deno.env.get('OAUTH_TOKEN_ENCRYPTION_KEY') || ''
  const keyBytes = parseKey(encKeyRaw)
  if (keyBytes.length !== 32) {
    return new Response(JSON.stringify({ error: 'OAUTH_TOKEN_ENCRYPTION_KEY must be 32 bytes' }), { status: 500 })
  }

  const { data: jobs, error } = await supabase
    .from('calendar_jobs')
    .select(
      `
      *,
      oauth_connections!inner(
        id,
        provider,
        organization_id,
        encrypted_access_token,
        encrypted_refresh_token,
        token_type,
        expires_at
      )
    `
    )
    .eq('status', 'pending')
    .lte('next_retry_at', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(25)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
  if (!jobs || jobs.length === 0) {
    return new Response(JSON.stringify({ message: 'No pending jobs' }), { status: 200 })
  }

  const results: any[] = []

  for (const job of jobs) {
    const conn = job.oauth_connections
    try {
      let connUpdated = conn
      if (job.provider === 'google') connUpdated = await refreshGoogleIfNeeded(conn, keyBytes)
      if (job.provider === 'microsoft') connUpdated = await refreshMicrosoftIfNeeded(conn, keyBytes)

      // persist refreshed access token if changed
      if (connUpdated.encrypted_access_token !== conn.encrypted_access_token || connUpdated.expires_at !== conn.expires_at) {
        await supabase
          .from('oauth_connections')
          .update({
            encrypted_access_token: connUpdated.encrypted_access_token,
            expires_at: connUpdated.expires_at,
          })
          .eq('id', conn.id)
      }

      const accessToken = await aesGcmDecrypt(connUpdated.encrypted_access_token, keyBytes)
      const tokenType = connUpdated.token_type || 'Bearer'

      if (job.provider === 'google') {
        if (job.job_type === 'follow_up_reminder') {
          const evt = buildFollowUpEvent(job.payload?.track)
          const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `${tokenType} ${accessToken}`,
            },
            body: JSON.stringify({
              summary: evt.summary,
              description: evt.description,
              start: { dateTime: evt.start.toISOString() },
              end: { dateTime: evt.end.toISOString() },
              reminders: { useDefault: true },
            }),
          })
          if (!res.ok) throw new Error(`Google calendar error: ${res.status}`)
        }

        if (job.job_type === 'label_master_release') {
          const evt = buildReleaseEvent(job.payload?.track)
          const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `${tokenType} ${accessToken}`,
            },
            body: JSON.stringify({
              summary: evt.summary,
              description: evt.description,
              start: { date: evt.dateStr },
              end: { date: evt.dateStr },
            }),
          })
          if (!res.ok) throw new Error(`Google calendar error: ${res.status}`)
        }
      }

      if (job.provider === 'microsoft') {
        if (job.job_type === 'follow_up_reminder') {
          const evt = buildFollowUpEvent(job.payload?.track)
          const res = await fetch('https://graph.microsoft.com/v1.0/me/events', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `${tokenType} ${accessToken}`,
            },
            body: JSON.stringify({
              subject: evt.summary,
              body: { contentType: 'text', content: evt.description || '' },
              start: { dateTime: evt.start.toISOString(), timeZone: 'UTC' },
              end: { dateTime: evt.end.toISOString(), timeZone: 'UTC' },
            }),
          })
          if (!res.ok) throw new Error(`Microsoft calendar error: ${res.status}`)
        }

        if (job.job_type === 'label_master_release') {
          const evt = buildReleaseEvent(job.payload?.track)
          // Graph requires dateTime; use all-day in UTC.
          const start = new Date(`${evt.dateStr}T00:00:00Z`)
          const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
          const res = await fetch('https://graph.microsoft.com/v1.0/me/events', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `${tokenType} ${accessToken}`,
            },
            body: JSON.stringify({
              subject: evt.summary,
              body: { contentType: 'text', content: evt.description || '' },
              isAllDay: true,
              start: { dateTime: start.toISOString(), timeZone: 'UTC' },
              end: { dateTime: end.toISOString(), timeZone: 'UTC' },
            }),
          })
          if (!res.ok) throw new Error(`Microsoft calendar error: ${res.status}`)
        }
      }

      await supabase.from('calendar_jobs').update({ status: 'success', error_message: null }).eq('id', job.id)
      results.push({ id: job.id, status: 'success' })
    } catch (err) {
      const attemptNumber = job.attempt_number + 1
      const shouldRetry = attemptNumber <= MAX_RETRIES
      if (shouldRetry) {
        const delay = RETRY_DELAYS[attemptNumber - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1]
        const nextRetryAt = new Date(Date.now() + delay)
        await supabase
          .from('calendar_jobs')
          .update({
            attempt_number: attemptNumber,
            next_retry_at: nextRetryAt.toISOString(),
            error_message: String(err?.message || err),
          })
          .eq('id', job.id)
        results.push({ id: job.id, status: 'retry_scheduled', attempt: attemptNumber })
      } else {
        await supabase
          .from('calendar_jobs')
          .update({
            status: 'failed',
            attempt_number: attemptNumber,
            error_message: String(err?.message || err),
          })
          .eq('id', job.id)
        results.push({ id: job.id, status: 'failed' })
      }
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

