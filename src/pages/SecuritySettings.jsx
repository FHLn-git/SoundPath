import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Shield, Lock, Smartphone, Key, AlertCircle, Check, X } from 'lucide-react'
import Toast from '../components/Toast'

const SecuritySettings = () => {
  const { user, staffProfile } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    // In a real implementation, you'd fetch active sessions from Supabase
    // For now, we'll show a placeholder
    setLoading(false)
  }

  const updatePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setToast({
        isVisible: true,
        message: 'New passwords do not match',
        type: 'error',
      })
      return
    }

    if (passwordForm.newPassword.length < 8) {
      setToast({
        isVisible: true,
        message: 'Password must be at least 8 characters',
        type: 'error',
      })
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      })

      if (error) throw error

      setToast({
        isVisible: true,
        message: 'Password updated successfully',
        type: 'success',
      })

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (error) {
      setToast({
        isVisible: true,
        message: error.message || 'Failed to update password',
        type: 'error',
      })
    }
  }

  const revokeSession = async sessionId => {
    // Implementation would revoke the session
    setToast({
      isVisible: true,
      message: 'Session revoked',
      type: 'success',
    })
    loadSessions()
  }

  const checkPasswordStrength = password => {
    if (!password) return { strength: 0, label: '' }

    let strength = 0
    if (password.length >= 8) strength++
    if (password.length >= 12) strength++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[^a-zA-Z\d]/.test(password)) strength++

    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']
    return {
      strength: Math.min(strength, 4),
      label: labels[strength] || 'Very Weak',
    }
  }

  const passwordStrength = checkPasswordStrength(passwordForm.newPassword)

  return (
    <div className="min-h-screen bg-gray-950 text-white p-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Security Settings</h1>

        {toast.isVisible && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ ...toast, isVisible: false })}
          />
        )}

        {/* Password Settings */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold">Password</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Current Password</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={e =>
                  setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                }
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">New Password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-600"
              />
              {passwordForm.newPassword && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[0, 1, 2, 3, 4].map(level => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded ${
                          level <= passwordStrength.strength
                            ? level <= 1
                              ? 'bg-red-500'
                              : level <= 2
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            : 'bg-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">{passwordStrength.label}</p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Confirm New Password</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={e =>
                  setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                }
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-600"
              />
            </div>
            <button
              onClick={updatePassword}
              disabled={
                !passwordForm.newPassword ||
                passwordForm.newPassword !== passwordForm.confirmPassword
              }
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Update Password
            </button>
          </div>
        </div>

        {/* Two-Factor Authentication */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Smartphone className="w-6 h-6 text-blue-400" />
              <div>
                <h2 className="text-xl font-bold">Two-Factor Authentication</h2>
                <p className="text-sm text-gray-400">
                  Add an extra layer of security to your account
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {twoFactorEnabled ? (
                <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  Enabled
                </span>
              ) : (
                <span className="px-3 py-1 bg-gray-500/20 text-gray-400 text-sm rounded flex items-center gap-1">
                  <X className="w-4 h-4" />
                  Disabled
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() =>
              setToast({
                isVisible: true,
                message: '2FA setup coming soon',
                type: 'info',
              })
            }
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
          </button>
        </div>

        {/* Active Sessions */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Key className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold">Active Sessions</h2>
          </div>
          {loading ? (
            <p className="text-gray-400">Loading sessions...</p>
          ) : sessions.length === 0 ? (
            <p className="text-gray-400">No active sessions</p>
          ) : (
            <div className="space-y-3">
              {sessions.map(session => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                >
                  <div>
                    <p className="font-semibold">{session.device || 'Unknown Device'}</p>
                    <p className="text-sm text-gray-400">
                      {session.location || 'Unknown Location'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Last active: {new Date(session.last_active).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => revokeSession(session.id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition-colors"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SecuritySettings
