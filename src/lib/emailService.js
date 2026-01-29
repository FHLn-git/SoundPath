// Email notification service
// This integrates with Resend via Supabase Edge Function or Supabase Email

import { supabase } from './supabaseClient'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Send email via Resend API (through Supabase Edge Function)
export const sendEmail = async ({ to, subject, html, text }) => {
  // Try to use Resend via Edge Function first
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      if (!accessToken) {
        return {
          success: false,
          error: 'Not authenticated. Please sign in and try again.',
          resendError: true,
        }
      }

      let errorData = null
      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Supabase Edge Functions require apikey (anon) + Authorization (user JWT)
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          to,
          subject,
          html,
          text,
        }),
      })

      if (!response.ok) {
        let errorMessage = 'Failed to send email'
        try {
          errorData = await response.json()
          errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        // Return error instead of throwing
        return {
          success: false,
          error: errorMessage,
          resendError: true,
          details: errorData?.details || null,
        }
      }

      const data = await response.json()
      if (data.success) {
        return { success: true, id: data.id }
      } else {
        // Return the error from edge function instead of throwing
        return {
          success: false,
          error: data.error || 'Failed to send email via edge function',
          resendError: true,
        }
      }
    } catch (error) {
      console.error('Error sending email via Edge Function:', error)
      // Check if it's a network/CORS error
      if (
        error.message.includes('Failed to fetch') ||
        error.message.includes('CORS') ||
        error.name === 'TypeError'
      ) {
        return {
          success: false,
          error: `Cannot reach edge function: ${error.message}. Make sure SUPABASE_URL is set correctly.`,
          resendError: true,
          corsError: true,
        }
      }
      // Return the error instead of falling through silently
      return {
        success: false,
        error: error.message || 'Failed to send email via edge function',
        resendError: true,
      }
    }
  }

  // Fallback: Use SECURITY DEFINER function to queue email (bypasses RLS)
  try {
    const { data, error } = await supabase.rpc('queue_email', {
      to_email_param: Array.isArray(to) ? to.join(',') : to,
      subject_param: subject,
      html_param: html,
      text_param: text || '',
    })

    if (error) throw error
    return { success: true, queued: true, email_id: data }
  } catch (error) {
    console.error('Error queueing email:', error)
    return { success: false, error: error.message }
  }
}

// Email templates
export const emailTemplates = {
  teamInvite: ({ inviteUrl, launchpadUrl, organizationName, inviterName, role }) => {
    const baseUrl = inviteUrl.split('?')[0].replace('/signup', '')
    const loginUrl = `${baseUrl}/`
    const launchpadLink = launchpadUrl || `${baseUrl}/launchpad`

    return {
      subject: `You've been invited to join ${organizationName} on SoundPath`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .button { display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px 10px 0; }
              .button-secondary { background-color: #6b7280; }
              .info-box { background-color: #f3f4f6; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
              .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>You've been invited!</h1>
              <p>${inviterName} has invited you to join <strong>${organizationName}</strong> on SoundPath as a <strong>${role}</strong>.</p>
              <p>SoundPath is the A&R Command Center for record labels - manage demos, track submissions, and collaborate with your team.</p>
              
              <div class="info-box">
                <p><strong>Already have a SoundPath account?</strong></p>
                <p>Log in to your account and you'll see this invitation in your Launchpad. You can accept it directly from there.</p>
                <a href="${loginUrl}" class="button button-secondary">Log In to Accept</a>
              </div>
              
              <p><strong>New to SoundPath?</strong></p>
              <p>Create your account using the link below:</p>
              <a href="${inviteUrl}" class="button">Create Account & Accept Invitation</a>
              
              <p style="margin-top: 20px;">Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666; background: #f9fafb; padding: 10px; border-radius: 4px;">${inviteUrl}</p>
              
              <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days.</p>
              
              <div class="footer">
                <p>If you didn't expect this invitation, you can safely ignore this email.</p>
                <p>&copy; ${new Date().getFullYear()} SoundPath. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
You've been invited!

${inviterName} has invited you to join ${organizationName} on SoundPath as a ${role}.

Already have a SoundPath account?
Log in at ${loginUrl} and you'll see this invitation in your Launchpad.

New to SoundPath?
Create your account and accept the invitation: ${inviteUrl}

This invitation will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.
      `.trim(),
    }
  },

  trackSubmitted: ({ trackTitle, artistName, organizationName }) => ({
    subject: `New track submitted: ${trackTitle} by ${artistName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .track-info { background-color: #f5f5f5; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>New Track Submitted</h1>
            <p>A new track has been submitted to <strong>${organizationName}</strong>:</p>
            <div class="track-info">
              <p><strong>Track:</strong> ${trackTitle}</p>
              <p><strong>Artist:</strong> ${artistName}</p>
            </div>
            <a href="${window.location.origin}/launchpad" class="button">View in SoundPath</a>
          </div>
        </body>
      </html>
    `,
    text: `
New Track Submitted

A new track has been submitted to ${organizationName}:

Track: ${trackTitle}
Artist: ${artistName}

View in SoundPath: ${window.location.origin}/launchpad
    `.trim(),
  }),

  trialEnding: ({ organizationName, daysRemaining, upgradeUrl }) => ({
    subject: `Your SoundPath trial ends in ${daysRemaining} days`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Trial Ending Soon</h1>
            <p>Your SoundPath trial for <strong>${organizationName}</strong> ends in ${daysRemaining} days.</p>
            <p>Upgrade now to continue using SoundPath and keep all your data.</p>
            <a href="${upgradeUrl}" class="button">Upgrade Now</a>
          </div>
        </body>
      </html>
    `,
    text: `
Trial Ending Soon

Your SoundPath trial for ${organizationName} ends in ${daysRemaining} days.

Upgrade now: ${upgradeUrl}
    `.trim(),
  }),

  subscriptionExpired: ({ organizationName, reactivateUrl }) => ({
    subject: 'Your SoundPath subscription has expired',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Subscription Expired</h1>
            <p>Your SoundPath subscription for <strong>${organizationName}</strong> has expired.</p>
            <p>Reactivate your subscription to continue using SoundPath.</p>
            <a href="${reactivateUrl}" class="button">Reactivate Subscription</a>
          </div>
        </body>
      </html>
    `,
    text: `
Subscription Expired

Your SoundPath subscription for ${organizationName} has expired.

Reactivate: ${reactivateUrl}
    `.trim(),
  }),
}

// Helper to send team invite email
export const sendTeamInviteEmail = async ({
  email,
  inviteUrl,
  launchpadUrl,
  organizationName,
  inviterName,
  role,
}) => {
  const template = emailTemplates.teamInvite({
    inviteUrl,
    launchpadUrl,
    organizationName,
    inviterName,
    role,
  })
  return await sendEmail({
    to: email,
    ...template,
  })
}

// Helper to send track submission notification
export const sendTrackSubmissionEmail = async ({
  email,
  trackTitle,
  artistName,
  organizationName,
}) => {
  const template = emailTemplates.trackSubmitted({ trackTitle, artistName, organizationName })
  return await sendEmail({
    to: email,
    ...template,
  })
}

// Helper to send trial ending notification
export const sendTrialEndingEmail = async ({
  email,
  organizationName,
  daysRemaining,
  upgradeUrl,
}) => {
  const template = emailTemplates.trialEnding({ organizationName, daysRemaining, upgradeUrl })
  return await sendEmail({
    to: email,
    ...template,
  })
}
