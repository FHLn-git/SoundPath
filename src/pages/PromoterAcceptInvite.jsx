/**
 * Accept a show invitation: set password (sign up) or sign in, then link invitation.
 * Route: /portal/promoter/accept?token=xxx
 */
import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { getShowInvitationEmailByToken, acceptShowInvitation } from '../lib/showApi'
import { useAuth } from '../context/AuthContext'

const base = () => (window.location.pathname.startsWith('/app/') ? '/app/portal/promoter' : '/portal/promoter')

export default function PromoterAcceptInvite() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  const { user } = useAuth?.() ?? {}
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(!!token)
  const [error, setError] = useState(null)
  const [step, setStep] = useState('form') // 'form' | 'accepting' | 'done'

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setError('Missing invitation token')
      return
    }
    let cancelled = false
    getShowInvitationEmailByToken(token).then((res) => {
      if (cancelled) return
      if (res?.email) setEmail(res.email)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [token])

  const handleSignUp = async (e) => {
    e.preventDefault()
    if (!email?.trim() || !password) {
      setError('Email and password are required')
      return
    }
    setError(null)
    setStep('accepting')
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { emailRedirectTo: `${window.location.origin}${base()}/accept?token=${token}` },
      })
      if (signUpError) throw signUpError
      const result = await acceptShowInvitation(token)
      if (result.error) throw new Error(result.error)
      navigate(base(), { replace: true })
    } catch (err) {
      setError(err.message || 'Something went wrong')
      setStep('form')
    }
  }

  const handleAcceptOnly = async () => {
    setError(null)
    setStep('accepting')
    try {
      const result = await acceptShowInvitation(token)
      if (result.error) throw new Error(result.error)
      navigate(base(), { replace: true })
    } catch (err) {
      setError(err.message || 'Something went wrong')
      setStep('form')
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center text-gray-400">
          <p>Invalid or missing invitation link.</p>
          <a href={base()} className="text-emerald-500 hover:underline mt-2 inline-block">Go to promoter portal</a>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="animate-pulse text-gray-500">Loading…</div>
      </div>
    )
  }

  const userEmail = user?.email?.toLowerCase?.()
  const emailMatches = userEmail && email && userEmail === email.trim().toLowerCase()

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-800/50 p-6 shadow-xl">
        <h1 className="text-xl font-semibold text-white mb-1">Show advance invitation</h1>
        <p className="text-gray-400 text-sm mb-6">
          {email ? `Invitation sent to ${email}` : 'You were invited to collaborate on a show advance.'}
        </p>

        {user ? (
          <>
            {emailMatches ? (
              <>
                <p className="text-gray-300 text-sm mb-4">You're signed in as {user.email}. Accept to open this show in your promoter portal.</p>
                {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
                <button
                  type="button"
                  onClick={handleAcceptOnly}
                  disabled={step === 'accepting'}
                  className="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 disabled:opacity-50"
                >
                  {step === 'accepting' ? 'Accepting…' : 'Accept invitation'}
                </button>
              </>
            ) : (
              <p className="text-gray-400 text-sm">
                This invitation was sent to <strong className="text-gray-300">{email}</strong>. Sign in with that account to accept, or use the link in your invitation email to set a password.
              </p>
            )}
          </>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white"
                placeholder="••••••••"
                minLength={6}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Create a password to access your shows</p>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={step === 'accepting'}
              className="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 disabled:opacity-50"
            >
              {step === 'accepting' ? 'Creating account…' : 'Create account & accept'}
            </button>
          </form>
        )}

        <p className="text-center text-gray-500 text-xs mt-6">
          <a href="/" className="hover:text-gray-400">Back to SoundPath</a>
        </p>
      </div>
    </div>
  )
}
