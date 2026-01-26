// Send Email via Resend
// Edge Function to proxy email sending through Resend API
// This prevents exposing the API key in client-side code

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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
    // Verify Authorization header is present (Supabase requires this)
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
    const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev'

    // Get request body
    const { to, subject, html, text } = await req.json()

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
