import { useState } from 'react'
import { motion } from 'framer-motion'
import { LogIn, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Toast from './Toast'

const Login = () => {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'error' })

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      setToast({
        isVisible: true,
        message: error.message || 'Invalid email or password',
        type: 'error',
      })
    }

    setLoading(false)
  }

  const sendPasswordReset = async () => {
    if (!supabase) {
      setToast({ isVisible: true, message: 'Auth is not configured.', type: 'error' })
      return
    }

    const normalizedEmail = email.toLowerCase().trim()
    if (!normalizedEmail) {
      setToast({ isVisible: true, message: 'Enter your email first.', type: 'error' })
      return
    }

    setResetting(true)
    try {
      await supabase.functions.invoke('password-reset', {
        body: {
          email: normalizedEmail,
          redirect_to: `${window.location.origin}/reset-password`,
        },
      })
      setToast({
        isVisible: true,
        message: 'If an account exists for that email, we sent a password reset link.',
        type: 'success',
      })
    } catch (error) {
      setToast({
        isVisible: true,
        message: error.message || 'Failed to send reset email',
        type: 'error',
      })
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 bg-gray-900/80 backdrop-blur-sm border border-neon-purple/30 rounded-lg shadow-xl"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-neon-purple/20 rounded-lg">
            <LogIn className="text-neon-purple" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white">SoundPath Login</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 bg-gray-900/50 border border-neon-purple/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-purple font-mono"
              placeholder="staff@label.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 bg-gray-900/50 border border-neon-purple/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-purple font-mono"
              placeholder="••••••••"
            />
            <div className="mt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={sendPasswordReset}
                disabled={resetting}
                className="text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                {resetting ? 'Sending reset…' : 'Forgot / change password?'}
              </button>
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-neon-purple/20 hover:bg-neon-purple/30 border border-neon-purple/50 rounded-lg text-neon-purple hover:text-white transition-all duration-200 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Signing in...
              </>
            ) : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </motion.button>
        </form>

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

export default Login
