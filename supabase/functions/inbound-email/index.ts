// Email-to-Inbox (Forwarding Bridge)
// Receives inbound email webhooks (Resend + generic JSON),
// extracts SoundCloud/Spotify links (regex + optional LLM),
// fetches SoundCloud metadata to populate artist/title when possible,
// creates a track in the label inbox (crate: network).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function extractLinks(text: string) {
  const input = text || ''
  const urlRegex = /\bhttps?:\/\/[^\s<>"')]+/gi
  const urls = (input.match(urlRegex) || []).map((u) => u.replace(/[),.;]+$/g, ''))
  const dedup = Array.from(new Set(urls))
  const soundcloud = dedup.filter((u) => u.toLowerCase().includes('soundcloud.com'))
  const spotify = dedup.filter((u) => u.toLowerCase().includes('open.spotify.com'))
  return { urls: dedup, soundcloud, spotify }
}

async function llmExtractLinks(openaiKey: string, body: string) {
  const prompt = `Extract any SoundCloud or Spotify URLs from this email body. Return JSON: {"soundcloud": string[], "spotify": string[]}. Only include valid URLs.\n\nEMAIL:\n${body}`
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) return null
  const content = json?.choices?.[0]?.message?.content
  if (!content) return null
  try {
    return JSON.parse(content)
  } catch {
    return null
  }
}

async function fetchSoundCloudMetadata(url: string) {
  // SoundCloud oEmbed returns author_name/title when public
  const oembed = new URL('https://soundcloud.com/oembed')
  oembed.searchParams.set('format', 'json')
  oembed.searchParams.set('url', url)
  const res = await fetch(oembed.toString())
  if (!res.ok) return null
  const data = await res.json().catch(() => null)
  if (!data) return null
  return {
    artistName: data.author_name || null,
    trackTitle: data.title || null,
  }
}

function parseOrgIdFromRecipient(toEmail: string) {
  // Expected: <org_uuid>@<your-inbound-domain>
  const m = (toEmail || '').trim().match(/^([^@]+)@/i)
  if (!m) return null
  const local = m[1]
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(local)) return null
  return local.toLowerCase()
}

function getFirstRecipient(emails: unknown): string {
  if (Array.isArray(emails) && emails.length > 0) return String(emails[0] || '')
  return String(emails || '')
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

function base64ToBytes(b64: string) {
  const bin = atob(b64)
  return new Uint8Array([...bin].map((c) => c.charCodeAt(0)))
}

function parseResendSvixSecret(secret: string): Uint8Array {
  // Resend (Svix) secrets are typically "whsec_<base64>"
  const s = (secret || '').trim()
  if (!s) throw new Error('Missing webhook secret')
  const raw = s.startsWith('whsec_') ? s.slice('whsec_'.length) : s
  return base64ToBytes(raw)
}

async function hmacSha256Base64(keyBytes: Uint8Array, msg: string) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg))
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
}

function extractSvixV1Signatures(header: string): string[] {
  // Header format often: "v1,base64sig v1,base64sig2"
  const out: string[] = []
  const parts = (header || '').split(/\s+/).filter(Boolean)
  for (const part of parts) {
    const [version, sig] = part.split(',', 2)
    if (version === 'v1' && sig) out.push(sig.trim())
  }
  // Some implementations send a single token "v1,xxx" without spaces; above covers it.
  return out
}

async function verifyResendWebhook(rawBody: string, headers: Headers, webhookSecret: string) {
  const svixId = headers.get('svix-id') || ''
  const svixTs = headers.get('svix-timestamp') || ''
  const svixSig = headers.get('svix-signature') || ''

  if (!svixId || !svixTs || !svixSig) throw new Error('Missing Svix headers')

  // Basic timestamp freshness check (5 minutes)
  const tsNum = Number(svixTs)
  if (!Number.isFinite(tsNum)) throw new Error('Invalid svix-timestamp')
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - tsNum) > 60 * 5) throw new Error('Stale webhook timestamp')

  const keyBytes = parseResendSvixSecret(webhookSecret)
  const signedContent = `${svixId}.${svixTs}.${rawBody}`
  const expected = await hmacSha256Base64(keyBytes, signedContent)

  const expectedBytes = base64ToBytes(expected)
  const candidates = extractSvixV1Signatures(svixSig)
  for (const cand of candidates) {
    try {
      const candBytes = base64ToBytes(cand)
      if (timingSafeEqual(expectedBytes, candBytes)) return true
    } catch {
      // ignore malformed candidate
    }
  }
  return false
}

async function fetchResendReceivedEmail(resendApiKey: string, emailId: string) {
  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${resendApiKey}` },
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(json?.error?.message || json?.message || `Resend receiving API error: ${res.status}`)
  return json
}

serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const raw = await req.text()

  const hasSvixHeaders =
    Boolean(req.headers.get('svix-id')) &&
    Boolean(req.headers.get('svix-timestamp')) &&
    Boolean(req.headers.get('svix-signature'))

  let body: any = null
  if (hasSvixHeaders) {
    const resendWebhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET') || ''
    if (resendWebhookSecret) {
      try {
        const ok = await verifyResendWebhook(raw, req.headers, resendWebhookSecret)
        if (!ok) return json(400, { error: 'Invalid webhook signature' })
        body = JSON.parse(raw)
      } catch (_e) {
        return json(400, { error: 'Invalid webhook signature' })
      }
    } else {
      // If you didn't set RESEND_WEBHOOK_SECRET, we accept unsigned payloads (not recommended).
      try {
        body = JSON.parse(raw)
      } catch {
        return json(400, { error: 'Invalid JSON' })
      }
    }
  } else {
    // Generic providers can protect via a shared header secret.
    const inboundSecret = Deno.env.get('INBOUND_EMAIL_SECRET') || ''
    if (inboundSecret) {
      const provided = req.headers.get('X-Inbound-Secret') || ''
      if (provided !== inboundSecret) return json(401, { error: 'Unauthorized' })
    }

    try {
      body = JSON.parse(raw)
    } catch {
      return json(400, { error: 'Invalid JSON' })
    }
  }

  // Resend payload: { type: "email.received", data: { email_id, to, from, subject, ... } }
  if (body?.type === 'email.received' && body?.data?.email_id) {
    const resendApiKey = Deno.env.get('RESEND_API_KEY') || ''
    if (!resendApiKey) return json(500, { error: 'RESEND_API_KEY not configured' })

    let received: any
    try {
      received = await fetchResendReceivedEmail(resendApiKey, body.data.email_id)
    } catch (e) {
      return json(500, { error: e.message || 'Failed to fetch email content' })
    }

    // normalize into the same shape we process below
    body = {
      To: received?.to,
      From: received?.from,
      Subject: received?.subject,
      TextBody: received?.text || '',
      HtmlBody: received?.html || '',
    }
  }

  const to =
    body?.To ||
    body?.to ||
    body?.recipient ||
    body?.envelope?.to ||
    body?.originalRecipient ||
    ''

  const toEmail = getFirstRecipient(to)
  const orgId = parseOrgIdFromRecipient(toEmail) || (Array.isArray(to) ? to.map((x) => parseOrgIdFromRecipient(String(x || ''))).find(Boolean) : null)
  if (!orgId) return json(400, { error: 'Could not determine organization from recipient' })

  const subject = String(body?.Subject || body?.subject || 'New Submission').slice(0, 200)
  const text = String(body?.TextBody || body?.text || body?.textBody || body?.body || '')
  const html = String(body?.HtmlBody || body?.html || body?.htmlBody || '')
  const combined = [subject, text, html].filter(Boolean).join('\n\n')

  // Extract links
  let { soundcloud, spotify } = extractLinks(combined)

  const openaiKey = Deno.env.get('OPENAI_API_KEY') || ''
  if (openaiKey) {
    const llm = await llmExtractLinks(openaiKey, combined)
    if (llm?.soundcloud?.length) soundcloud = Array.from(new Set([...soundcloud, ...llm.soundcloud]))
    if (llm?.spotify?.length) spotify = Array.from(new Set([...spotify, ...llm.spotify]))
  }

  const primaryLink = soundcloud[0] || spotify[0] || ''

  // Fetch SoundCloud metadata if present
  let artistName = 'Unknown Artist'
  let trackTitle = subject || 'New Submission'
  if (soundcloud[0]) {
    const meta = await fetchSoundCloudMetadata(soundcloud[0])
    if (meta?.artistName) artistName = meta.artistName
    if (meta?.trackTitle) trackTitle = meta.trackTitle
  }

  // Insert track into org inbox (crate: network)
  const insertBase: Record<string, unknown> = {
    organization_id: orgId,
    artist_name: artistName,
    title: trackTitle,
    sc_link: primaryLink || null,
    status: 'inbox',
    column: 'inbox',
    archived: false,
    crate: 'network',
    source: 'email_bridge',
  }

  const attemptInsert = async (data: Record<string, unknown>) => {
    return await supabase.from('tracks').insert(data).select('id, organization_id, artist_name, title, sc_link, created_at').single()
  }

  let ins = await attemptInsert({
    ...insertBase,
    submitter_email: String(body?.From || body?.from || '').slice(0, 200) || null,
    submitter_note: text ? text.slice(0, 2000) : null,
  })

  if (ins.error) {
    // Retry with base fields only (in case optional columns don't exist)
    ins = await attemptInsert(insertBase)
  }

  if (ins.error) return json(500, { error: ins.error.message })

  return json(200, {
    success: true,
    organization_id: orgId,
    links: { soundcloud, spotify },
    track: ins.data,
  })
})

