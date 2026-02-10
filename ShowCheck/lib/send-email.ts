/**
 * Send email via Supabase Edge Function (Resend). Same pattern as main app.
 */
import { supabase } from "./supabase"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""

export type SendEmailResult = { success: true; id?: string } | { success: false; error: string }

export async function sendEmail({
  to,
  subject,
  html,
  text,
  from: fromAddress,
}: {
  to: string
  subject: string
  html: string
  text: string
  from?: string
}): Promise<SendEmailResult> {
  if (!SUPABASE_URL) return { success: false, error: "Supabase URL not configured" }
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  if (!anonKey) return { success: false, error: "Supabase anon key not configured" }

  const { data: { session } } = await supabase?.auth.getSession() ?? { data: { session: null } }
  const accessToken = session?.access_token
  if (!accessToken) return { success: false, error: "Not authenticated" }

  const body: Record<string, string> = { to, subject, html, text }
  if (fromAddress) body.from = fromAddress
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return { success: false, error: (err as { error?: string }).error ?? response.statusText }
    }
    const data = (await response.json()) as { success?: boolean; id?: string }
    return data.success ? { success: true, id: data.id } : { success: false, error: "Send failed" }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to send email" }
  }
}

function showInvitationTemplate({
  inviteUrl,
  showName,
  venueName,
  date,
}: {
  inviteUrl: string
  showName: string
  venueName: string
  date: string
}) {
  return {
    subject: `You're invited to advance: ${showName} at ${venueName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
            .info-box { background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Show advance invitation</h1>
            <p>You've been invited to collaborate on the advance for:</p>
            <div class="info-box">
              <p><strong>${showName}</strong></p>
              <p>${venueName} · ${date}</p>
            </div>
            <p>Set a password or sign in to access the advance and work with the venue.</p>
            <a href="${inviteUrl}" class="button">Accept &amp; open advance</a>
            <p style="color: #666; font-size: 14px; margin-top: 24px;">If you didn't expect this, you can ignore this email.</p>
          </div>
        </body>
      </html>
    `,
    text: `Show advance invitation\n\n${showName} at ${venueName} (${date}).\n\nAccept and open advance: ${inviteUrl}`.trim(),
  }
}

const INVITE_FROM_EMAIL = "invite@soundpath.app"

export async function sendShowInvitationEmail({
  to,
  inviteUrl,
  showName,
  venueName,
  date,
}: {
  to: string
  inviteUrl: string
  showName: string
  venueName: string
  date: string
}): Promise<SendEmailResult> {
  const { subject, html, text } = showInvitationTemplate({ inviteUrl, showName, venueName, date })
  return sendEmail({ to, from: INVITE_FROM_EMAIL, subject, html, text })
}
