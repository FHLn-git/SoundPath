/**
 * Auth handoff: receives access_token and refresh_token from the URL fragment
 * (after redirect from soundpath.app app selector), sets the Supabase session,
 * then redirects to the Label app dashboard.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Loader2 } from 'lucide-react'

export default function AuthContinue() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!supabase) {
      setError('Supabase not configured')
      return
    }

    const hash = window.location.hash
    if (!hash) {
      navigate('/app/label/launchpad', { replace: true })
      return
    }

    const params = new URLSearchParams(hash.replace(/^#/, ''))
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')

    if (!access_token || !refresh_token) {
      navigate('/app/label/launchpad', { replace: true })
      return
    }

    let mounted = true

    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(() => {
        if (!mounted) return
        window.history.replaceState(null, '', window.location.pathname)
        navigate('/app/label/launchpad', { replace: true })
      })
      .catch((err) => {
        if (!mounted) return
        window.history.replaceState(null, '', window.location.pathname)
        const status = err?.status || err?.code
        const is400 = status === 400 || err?.message?.includes('400') || err?.message?.toLowerCase?.().includes('invalid')
        const message = is400
          ? 'This sign-in link could not be applied. The Label app may be using a different Supabase project than the main site—use the same Supabase URL and anon key for both. You can sign in below.'
          : (err?.message || 'Sign-in link invalid or expired.')
        setError(message)
      })

    return () => {
      mounted = false
    }
  }, [navigate])

  if (error) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4">
        <div className="text-center max-w-md space-y-4">
          <p className="text-red-400 text-sm">{error}</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              onClick={() => navigate('/app/label/launchpad', { replace: true })}
              className="px-4 py-2 rounded-lg bg-[#a855f7] text-white hover:bg-[#a855f7]/90"
            >
              Sign in to Label app
            </button>
            <button
              type="button"
              onClick={() => (window.location.href = import.meta.env.VITE_SITE_URL || '/')}
              className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600"
            >
              Back to SoundPath
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-[#a855f7] animate-spin" />
        <p className="text-gray-400">Signing you in...</p>
      </div>
    </div>
  )
}
