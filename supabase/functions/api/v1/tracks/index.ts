// REST API Endpoint for Tracks
// Handles GET, POST, PUT, DELETE operations for tracks

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ApiKey {
  id: string
  organization_id: string
  name: string
  expires_at: string | null
  revoked_at: string | null
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get API key from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = authHeader.replace('Bearer ', '')
    
    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Hash the API key to look it up
    const encoder = new TextEncoder()
    const data = encoder.encode(apiKey)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Find API key in database
    const { data: apiKeyData, error: keyError } = await supabase
      .from('api_keys')
      .select('*, organizations!inner(id)')
      .eq('key_hash', keyHash)
      .is('revoked_at', null)
      .single()

    if (keyError || !apiKeyData) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if key is expired
    if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'API key has expired' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const organizationId = apiKeyData.organization_id

    // Check rate limit (simple implementation - can be enhanced)
    const { data: usage } = await supabase
      .from('organization_usage')
      .select('api_calls_count')
      .eq('organization_id', organizationId)
      .single()

    // Get plan limits
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plans!inner(limits)')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .single()

    const maxApiCalls = subscription?.plans?.limits?.max_api_calls_per_month || 0
    if (maxApiCalls > 0 && (usage?.api_calls_count || 0) >= maxApiCalls) {
      return new Response(
        JSON.stringify({ error: 'API rate limit exceeded' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update last_used_at
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyData.id)

    // Increment API call count
    await supabase.rpc('increment_api_calls', { org_id: organizationId })

    // Handle different HTTP methods
    const method = req.method
    const url = new URL(req.url)
    const trackId = url.pathname.split('/').pop()

    if (method === 'GET') {
      if (trackId && trackId !== 'tracks') {
        // Get single track
        const { data, error } = await supabase
          .from('tracks')
          .select('*, artists(name)')
          .eq('id', trackId)
          .eq('organization_id', organizationId)
          .single()

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify(data),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        // List tracks with pagination
        const limit = parseInt(url.searchParams.get('limit') || '50')
        const offset = parseInt(url.searchParams.get('offset') || '0')
        const status = url.searchParams.get('status')
        const artistId = url.searchParams.get('artist_id')

        let query = supabase
          .from('tracks')
          .select('*, artists(name)', { count: 'exact' })
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (status) {
          query = query.eq('status', status)
        }
        if (artistId) {
          query = query.eq('artist_id', artistId)
        }

        const { data, error, count } = await query

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({
            data: data || [],
            pagination: {
              limit,
              offset,
              total: count || 0,
              has_more: (count || 0) > offset + limit
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (method === 'POST') {
      const body = await req.json()
      const { artist_name, title, sc_link, genre, bpm, energy, status } = body

      if (!title || !artist_name) {
        return new Response(
          JSON.stringify({ error: 'title and artist_name are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Find or create artist
      let artistId = null
      const { data: existingArtist } = await supabase
        .from('artists')
        .select('id')
        .eq('name', artist_name)
        .single()

      if (existingArtist) {
        artistId = existingArtist.id
      } else {
        const { data: newArtist } = await supabase
          .from('artists')
          .insert({ name: artist_name, primary_genre: genre })
          .select()
          .single()
        if (newArtist) artistId = newArtist.id
      }

      const { data, error } = await supabase
        .from('tracks')
        .insert({
          organization_id: organizationId,
          artist_id: artistId,
          artist_name,
          title,
          sc_link,
          genre,
          bpm: bpm || 128,
          energy: energy || 0,
          status: status || 'inbox',
          column: status || 'inbox',
        })
        .select('*, artists(name)')
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Trigger webhook if configured
      await triggerWebhook(organizationId, 'track.created', data, supabase)

      return new Response(
        JSON.stringify(data),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (method === 'PUT' || method === 'PATCH') {
      if (!trackId || trackId === 'tracks') {
        return new Response(
          JSON.stringify({ error: 'Track ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const body = await req.json()
      const { data: existingTrack } = await supabase
        .from('tracks')
        .select('*')
        .eq('id', trackId)
        .eq('organization_id', organizationId)
        .single()

      if (!existingTrack) {
        return new Response(
          JSON.stringify({ error: 'Track not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('tracks')
        .update({
          ...body,
          updated_at: new Date().toISOString()
        })
        .eq('id', trackId)
        .select('*, artists(name)')
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Trigger webhook
      await triggerWebhook(organizationId, 'track.updated', data, supabase)

      return new Response(
        JSON.stringify(data),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (method === 'DELETE') {
      if (!trackId || trackId === 'tracks') {
        return new Response(
          JSON.stringify({ error: 'Track ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: track } = await supabase
        .from('tracks')
        .select('*')
        .eq('id', trackId)
        .eq('organization_id', organizationId)
        .single()

      if (!track) {
        return new Response(
          JSON.stringify({ error: 'Track not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId)

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Trigger webhook
      await triggerWebhook(organizationId, 'track.deleted', { id: trackId }, supabase)

      return new Response(
        JSON.stringify({ message: 'Track deleted successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Helper function to trigger webhooks
async function triggerWebhook(organizationId: string, eventType: string, payload: any, supabase: any) {
  const { data: webhooks } = await supabase
    .from('webhooks')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('active', true)
    .contains('events', [eventType])

  if (!webhooks || webhooks.length === 0) return

  for (const webhook of webhooks) {
    // Queue webhook delivery
    await supabase
      .from('webhook_deliveries')
      .insert({
        webhook_id: webhook.id,
        event_type: eventType,
        payload: payload,
        status: 'pending',
        attempt_number: 1,
        next_retry_at: new Date().toISOString()
      })
  }
}
