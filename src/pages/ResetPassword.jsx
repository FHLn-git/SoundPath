import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import Toast from '../components/Toast'

const ResetPassword = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'error' })
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const urlInfo = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')

    // Some Supabase recovery links include tokens in the hash.
    const hash = window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : ''
    const hashParams = new URLSearchParams(hash)
    const access_token = hashParams.get('access_token')
    const refresh_token = hashParams.get('refresh_token')

    return { code, access_token, refresh_token }
  }, [])

  useEffect(() => {
    const init = async () => {
      if (!supabase) {
        setToast({ isVisible: true, message: 'Auth is not configured.', type: 'error' })
        setLoading(false)
        return
      }

      try {
        // Prefer code exchange flow when present.
        if (urlInfo.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(urlInfo.code)
          if (error) throw error
        } else if (urlInfo.access_token && urlInfo.refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token: urlInfo.access_token,
            refresh_token: urlInfo.refresh_token,
          })
          if (error) throw error
        }

        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) {
          setToast({
            isVisible: true,
            message: 'This reset link is invalid or expired. Please request a new one.',
            type: 'error',
          })
          setReady(false)
        } else {
          setReady(true)
        }
      } catch (error) {
        setToast({
          isVisible: true,
          message:
            error.message || 'This reset link is invalid or expired. Please request a new one.',
          type: 'error',
        })
        setReady(false)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [urlInfo])

  const onSubmit = async e => {
    e.preventDefault()
    if (!supabase) return

    if (password.length < 8) {
      setToast({
        isVisible: true,
        message: 'Password must be at least 8 characters.',
        type: 'error',
      })
      return
    }
    if (password !== confirmPassword) {
      setToast({ isVisible: true, message: 'Passwords do not match.', type: 'error' })
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      setToast({
        isVisible: true,
        message: 'Password updated. You can now sign in.',
        type: 'success',
      })

      // Clean URL to remove tokens/codes
      window.history.replaceState({}, '', '/reset-password')
      setTimeout(() => navigate('/?message=password_reset', { replace: true }), 1200)
    } catch (error) {
      setToast({
        isVisible: true,
        message: error.message || 'Failed to update password.',
        type: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 px-4">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 bg-gray-900/80 backdrop-blur-sm border border-neon-purple/30 rounded-lg shadow-xl"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-neon-purple/20 rounded-lg">
            <Lock className="text-neon-purple" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-300">
            <Loader2 className="animate-spin" size={18} />
            <span>Preparing secure reset…</span>
          </div>
        ) : ready ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 bg-gray-900/50 border border-neon-purple/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-purple font-mono"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-2 bg-gray-900/50 border border-neon-purple/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-purple font-mono"
                placeholder="••••••••"
              />
            </div>

            <motion.button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2 bg-neon-purple/20 hover:bg-neon-purple/30 border border-neon-purple/50 rounded-lg text-neon-purple hover:text-white transition-all duration-200 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: submitting ? 1 : 1.02 }}
              whileTap={{ scale: submitting ? 1 : 0.98 }}
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Updating…
                </>
              ) : (
                <>Update Password</>
              )}
            </motion.button>

            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              className="w-full text-sm text-gray-400 hover:text-white transition-colors"
            >
              Back to login
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-300">
              This link can’t be used. Go back and request a new password reset email.
            </p>
            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition-colors"
            >
              Back to login
            </button>
          </div>
        )}

        <Toast
          isVisible={toast.isVisible}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, isVisible: false })}
        />
      </motion.div>
    </div>
  )
}

export default ResetPassword
