import { createClient } from '@supabase/supabase-js'

// Extract environment variables using import.meta.env (Vite syntax)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Only create client if both credentials are provided
let supabase = null

if (supabaseUrl && supabaseAnonKey && supabaseUrl.trim() !== '' && supabaseAnonKey.trim() !== '') {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
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
