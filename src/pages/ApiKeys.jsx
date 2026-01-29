import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useBilling } from '../context/BillingContext'
import { supabase } from '../lib/supabaseClient'
import { Key, Plus, Trash2, Copy, Check, Eye, EyeOff, Calendar } from 'lucide-react'
import Toast from '../components/Toast'
import { useUsageLimits } from '../hooks/useUsageLimits'

const ApiKeys = () => {
  const { activeOrgId, activeMembership, staffProfile } = useAuth()
  const { hasFeature } = useBilling()
  const { canMakeAPICall } = useUsageLimits()
  const [apiKeys, setApiKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyExpires, setNewKeyExpires] = useState('')
  const [visibleKeys, setVisibleKeys] = useState({})
  const [copiedKey, setCopiedKey] = useState(null)
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' })
  const [hasApiAccess, setHasApiAccess] = useState(false)

  useEffect(() => {
    if (activeOrgId) {
      checkApiAccess()
      loadApiKeys()
    }
  }, [activeOrgId])

  const checkApiAccess = async () => {
    const access = await hasFeature('api_access')
    setHasApiAccess(access)
  }

  const loadApiKeys = async () => {
    if (!supabase || !activeOrgId) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('organization_id', activeOrgId)
        .is('revoked_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      setApiKeys(data || [])
    } catch (error) {
      console.error('Error loading API keys:', error)
      setToast({
        isVisible: true,
        message: 'Failed to load API keys',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const generateApiKey = () => {
    // Generate a secure random key
    const prefix = 'sk_live_'
    const randomBytes = new Uint8Array(32)
    crypto.getRandomValues(randomBytes)
    const key =
      prefix + Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('')
    return key
  }

  const createApiKey = async () => {
    if (!supabase || !activeOrgId || !newKeyName.trim()) return

    if (activeMembership?.role !== 'Owner' && activeMembership?.role !== 'Manager') {
      setToast({
        isVisible: true,
        message: 'Only Owners and Managers can create API keys',
        type: 'error',
      })
      return
    }

    // Check API access
    if (!hasApiAccess) {
      setToast({
        isVisible: true,
        message:
          'API access is not available on your current plan. Please upgrade to Starter, Pro, or Enterprise.',
        type: 'error',
      })
      return
    }

    try {
      const apiKey = generateApiKey()
      const keyHash = await hashKey(apiKey)
      const keyPrefix = apiKey.substring(0, 12) // First 12 chars for display

      const expiresAt = newKeyExpires ? new Date(newKeyExpires).toISOString() : null

      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          organization_id: activeOrgId,
          name: newKeyName.trim(),
          key_hash: keyHash,
          key_prefix: keyPrefix,
          expires_at: expiresAt,
          created_by: staffProfile?.id,
        })
        .select()
        .single()

      if (error) throw error

      setToast({
        isVisible: true,
        message: "API key created! Make sure to copy it now - you won't be able to see it again.",
        type: 'success',
      })

      // Show the full key once for copying
      setVisibleKeys({ ...visibleKeys, [data.id]: apiKey })
      setShowCreateModal(false)
      setNewKeyName('')
      setNewKeyExpires('')
      loadApiKeys()
    } catch (error) {
      console.error('Error creating API key:', error)
      setToast({
        isVisible: true,
        message: 'Failed to create API key',
        type: 'error',
      })
    }
  }

  const hashKey = async key => {
    // Simple hash for demo - in production, use proper hashing
    const encoder = new TextEncoder()
    const data = encoder.encode(key)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  const revokeApiKey = async keyId => {
    if (!supabase) return

    if (activeMembership?.role !== 'Owner' && activeMembership?.role !== 'Manager') {
      setToast({
        isVisible: true,
        message: 'Only Owners and Managers can revoke API keys',
        type: 'error',
      })
      return
    }

    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', keyId)

      if (error) throw error

      setToast({
        isVisible: true,
        message: 'API key revoked',
        type: 'success',
      })
      loadApiKeys()
    } catch (error) {
      console.error('Error revoking API key:', error)
      setToast({
        isVisible: true,
        message: 'Failed to revoke API key',
        type: 'error',
      })
    }
  }

  const copyToClipboard = (text, keyId) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(keyId)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const formatDate = dateString => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (!hasApiAccess) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-10">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-900 rounded-lg p-8 border border-gray-800 text-center">
            <Key className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">API Access Not Available</h2>
            <p className="text-gray-400 mb-6">
              API access is available on Starter, Pro, and Enterprise plans.
            </p>
            <a
              href="/billing"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Upgrade Plan
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">API Keys</h1>
            <p className="text-gray-400">Manage API keys for programmatic access to SoundPath</p>
          </div>
          {(activeMembership?.role === 'Owner' || activeMembership?.role === 'Manager') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create API Key
            </button>
          )}
        </div>

        {toast.isVisible && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ ...toast, isVisible: false })}
          />
        )}

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="bg-gray-900 rounded-lg p-12 border border-gray-800 text-center">
            <Key className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">No API Keys</h2>
            <p className="text-gray-400 mb-6">Create an API key to start using the SoundPath API</p>
            {(activeMembership?.role === 'Owner' || activeMembership?.role === 'Manager') && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Create Your First API Key
              </button>
            )}
          </div>
        ) : (
          <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-4 px-6 text-gray-400 font-semibold">Name</th>
                  <th className="text-left py-4 px-6 text-gray-400 font-semibold">Key</th>
                  <th className="text-left py-4 px-6 text-gray-400 font-semibold">Last Used</th>
                  <th className="text-left py-4 px-6 text-gray-400 font-semibold">Expires</th>
                  <th className="text-left py-4 px-6 text-gray-400 font-semibold">Created</th>
                  <th className="text-right py-4 px-6 text-gray-400 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map(key => {
                  const isVisible = visibleKeys[key.id]
                  const displayKey = isVisible
                    ? key.key_prefix + '...' + isVisible.substring(isVisible.length - 4)
                    : key.key_prefix + '••••••••'

                  return (
                    <tr key={key.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="py-4 px-6 font-semibold">{key.name}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-gray-800 px-2 py-1 rounded font-mono">
                            {displayKey}
                          </code>
                          {isVisible ? (
                            <button
                              onClick={() => copyToClipboard(isVisible, key.id)}
                              className="text-gray-400 hover:text-white"
                            >
                              {copiedKey === key.id ? (
                                <Check className="w-4 h-4 text-green-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                // Can't show full key after creation - it's hashed
                                setToast({
                                  isVisible: true,
                                  message: 'API key can only be viewed once when created',
                                  type: 'info',
                                })
                              }}
                              className="text-gray-400 hover:text-white"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-400">
                        {key.last_used_at ? formatDate(key.last_used_at) : 'Never'}
                      </td>
                      <td className="py-4 px-6 text-gray-400">
                        {key.expires_at ? formatDate(key.expires_at) : 'Never'}
                      </td>
                      <td className="py-4 px-6 text-gray-400">{formatDate(key.created_at)}</td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => revokeApiKey(key.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold mb-4">Create API Key</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Name</label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                    placeholder="e.g., Production API Key"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Expires (optional)</label>
                  <input
                    type="date"
                    value={newKeyExpires}
                    onChange={e => setNewKeyExpires(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-600"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowCreateModal(false)
                      setNewKeyName('')
                      setNewKeyExpires('')
                    }}
                    className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createApiKey}
                    disabled={!newKeyName.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ApiKeys
