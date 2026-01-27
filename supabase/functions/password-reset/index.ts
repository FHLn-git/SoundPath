// Password Reset via Resend
// Public Edge Function: generates a Supabase recovery link and emails it via Resend

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isValidEmail(email: string) {
  // simple + pragmatic; avoids rejecting valid-but-rare addresses
  return typeof email === 'string' && email.includes('@') && email.includes('.')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ success: false, error: 'Method not allowed' }, 405)

  try {
    const { email, redirect_to } = await req.json()

    const normalizedEmail = String(email || '').toLowerCase().trim()
    if (!isValidEmail(normalizedEmail)) {
      // Always return a generic success message shape to avoid account enumeration.
      return jsonResponse({ success: true })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonResponse(
        { success: false, error: 'Supabase service credentials not configured' },
        500
      )
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      return jsonResponse({ success: false, error: 'RESEND_API_KEY not configured' }, 500)
    }

    const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@soundpath.com'

    const defaultSiteUrl =
      Deno.env.get('SITE_URL') ||
      Deno.env.get('VITE_SITE_URL') ||
      Deno.env.get('PUBLIC_SITE_URL') ||
      ''
    const redirectTo =
      typeof redirect_to === 'string' && redirect_to.trim() !== ''
        ? redirect_to.trim()
        : defaultSiteUrl
          ? `${defaultSiteUrl.replace(/\/+$/, '')}/reset-password`
          : undefined

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Generate a recovery link. If the user does not exist, Supabase may error —
    // we intentionally still return success to avoid account enumeration.
    let actionLink: string | null = null
    try {
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: normalizedEmail,
        options: redirectTo ? { redirectTo } : undefined,
      })

      if (!error) {
        actionLink =
          (data as any)?.properties?.action_link ||
          (data as any)?.action_link ||
          null
      }
    } catch (_e) {
      // ignore (enumeration-safe)
    }

    if (!actionLink) {
      return jsonResponse({ success: true })
    }

    const subject = 'Reset your SoundPath password'
    const safeRedirect = actionLink
    const html = `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.5;">
        <h2 style="margin: 0 0 12px;">Reset your password</h2>
        <p style="margin: 0 0 16px;">We received a request to reset your SoundPath password.</p>
        <p style="margin: 0 0 20px;">
          <a href="${safeRedirect}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 16px;border-radius:10px;text-decoration:none;font-weight:600;">
            Reset Password
          </a>
        </p>
        <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `.trim()
    const text = `Reset your SoundPath password\n\nOpen this link to set a new password:\n${safeRedirect}\n\nIf you didn't request this, ignore this email.`

    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: [normalizedEmail],
        subject,
        html,
        text,
      }),
    })

    // Even if Resend fails, still return generic success to avoid enumeration.
    if (!resendResp.ok) {
      console.error('Resend error:', await resendResp.text().catch(() => ''))
      return jsonResponse({ success: true })
    }

    return jsonResponse({ success: true })
  } catch (error) {
    console.error('Error in password-reset function:', error)
    // Enumeration-safe response
    return jsonResponse({ success: true })
  }
})

