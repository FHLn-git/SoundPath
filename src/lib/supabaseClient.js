import { createClient } from '@supabase/supabase-js'

// Extract environment variables using import.meta.env (Vite syntax)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Only create client if both credentials are provided
let supabase = null

if (supabaseUrl && supabaseAnonKey && supabaseUrl.trim() !== '' && supabaseAnonKey.trim() !== '') {
  try {
    // AUTH STABILITY:
    // - Explicit PKCE flow (recommended for SPAs)
    // - Persist session in localStorage for cross-tab stability
    // - Auto-refresh tokens without UI interruption
    // - Detect OAuth/email link sessions in URL on initial load
    // - Session across subdomains (label/venue/artist.soundpath.app): use auth handoff via
    //   /auth/continue when switching apps; for cookie domain .soundpath.app you would need
    //   a custom storage adapter or server-side auth with Set-Cookie domain.
    const storage = typeof window !== 'undefined' ? window.localStorage : undefined

    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage,
      },
    })
  } catch (error) {
    console.error('❌ Failed to initialize Supabase client:', error)
  }
} else if (import.meta.env.DEV) {
  // Only show warnings in development
  console.warn('⚠️ Supabase credentials not found.')
  console.warn('Please create a .env file in the project root with:')
  console.warn('  VITE_SUPABASE_URL=https://your-project.supabase.co')
  console.warn('  VITE_SUPABASE_ANON_KEY=your_anon_key_here')
}

// Export supabase (will be null if not configured)
export { supabase }
