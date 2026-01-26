// Health Check Endpoint
// Returns system status and health metrics

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      database: 'unknown',
      api: 'unknown',
    },
    metrics: {
      uptime: process.uptime || 0,
    },
  }

  try {
    // Test database connection
    const { error: dbError } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)

    if (dbError) {
      health.services.database = 'unhealthy'
      health.status = 'degraded'
    } else {
      health.services.database = 'healthy'
    }

    health.services.api = 'healthy'
  } catch (error) {
    health.status = 'unhealthy'
    health.services.database = 'unhealthy'
    health.services.api = 'unhealthy'
    health.error = error.message
  }

  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 503 : 500

  return new Response(
    JSON.stringify(health, null, 2),
    {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    }
  )
})
