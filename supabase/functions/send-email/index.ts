// Send Email via Resend
// Edge Function to proxy email sending through Resend API
// This prevents exposing the API key in client-side code

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Missing or invalid Authorization header' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the JWT belongs to a valid user (prevents unauthenticated abuse)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey =
      Deno.env.get('SUPABASE_ANON_KEY') ||
      Deno.env.get('ANON_KEY') ||
      Deno.env.get('SUPABASE_ANON_PUBLIC_KEY')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || (!supabaseAnonKey && !supabaseServiceKey)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Supabase auth verification not configured (missing SUPABASE_URL and key)',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const verificationKey = supabaseAnonKey || supabaseServiceKey!
    const supabaseAuth = createClient(supabaseUrl, verificationKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim()
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(jwt)
    if (userError || !userData?.user?.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Resend API key from environment
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'RESEND_API_KEY not configured in edge function environment' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Resend from email (default to onboarding@resend.dev for testing)
    const defaultFrom = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev'

    // Get request body (optional 'from' overrides default, e.g. invite@soundpath.app for invites)
    const { to, subject, html, text, from: requestFrom } = await req.json()
    const resendFromEmail = requestFrom && typeof requestFrom === 'string' ? requestFrom : defaultFrom

    // Validate required fields
    if (!to || !subject) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Missing required fields: to and subject are required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send email via Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
      }),
    })

    if (!response.ok) {
      let errorMessage = 'Failed to send email'
      let errorDetails = null
      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
        
        // Handle Resend-specific errors
        if (response.status === 403 && errorMessage.includes('testing emails')) {
          errorDetails = 'When using the test domain (onboarding@resend.dev), you can only send emails to the address you used to sign up for Resend. To send to other addresses, verify your own domain in Resend.'
        } else if (response.status === 403) {
          errorDetails = 'Resend rejected the request. Check that your API key is valid and has the correct permissions.'
        }
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`
      }
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: errorMessage,
          details: errorDetails
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        id: data.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-email function:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'An unexpected error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
