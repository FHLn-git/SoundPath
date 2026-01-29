import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useBilling } from '../context/BillingContext'
import { supabase } from '../lib/supabaseClient'
import {
  Webhook,
  Plus,
  Trash2,
  Edit,
  Eye,
  Check,
  X,
  AlertCircle,
  Loader2,
  Copy,
} from 'lucide-react'
import Toast from '../components/Toast'
import { useUsageLimits } from '../hooks/useUsageLimits'

const Webhooks = () => {
  const { activeOrgId, activeMembership, staffProfile } = useAuth()
  const { hasFeature } = useBilling()
  const [webhooks, setWebhooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState(null)
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' })
  const [hasWebhookAccess, setHasWebhookAccess] = useState(false)
  const [webhookStats, setWebhookStats] = useState({})

  const availableEvents = [
    'track.created',
    'track.updated',
    'track.deleted',
    'track.moved',
    'artist.created',
    'artist.updated',
    'vote.added',
    'subscription.created',
    'subscription.updated',
    'subscription.canceled',
  ]

  const [formData, setFormData] = useState({
    url: '',
    events: [],
    active: true,
  })

  useEffect(() => {
    if (activeOrgId) {
      checkWebhookAccess()
      loadWebhooks()
    }
  }, [activeOrgId])

  const checkWebhookAccess = async () => {
    const access = await hasFeature('webhooks')
    setHasWebhookAccess(access)
  }

  const loadWebhooks = async () => {
    if (!supabase || !activeOrgId) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('organization_id', activeOrgId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setWebhooks(data || [])

      // Load stats for each webhook
      if (data && data.length > 0) {
        const stats = {}
        for (const webhook of data) {
          const { data: statsData } = await supabase.rpc('get_webhook_stats', {
            webhook_id: webhook.id,
          })
          if (statsData && statsData.length > 0) {
            stats[webhook.id] = statsData[0]
          }
        }
        setWebhookStats(stats)
      }
    } catch (error) {
      console.error('Error loading webhooks:', error)
      setToast({
        isVisible: true,
        message: 'Failed to load webhooks',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const generateSecret = () => {
    const randomBytes = new Uint8Array(32)
    crypto.getRandomValues(randomBytes)
    return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  const createWebhook = async () => {
    if (!supabase || !activeOrgId || !formData.url.trim() || formData.events.length === 0) return

    if (activeMembership?.role !== 'Owner' && activeMembership?.role !== 'Manager') {
      setToast({
        isVisible: true,
        message: 'Only Owners and Managers can create webhooks',
        type: 'error',
      })
      return
    }

    // Check webhook access
    if (!hasWebhookAccess) {
      setToast({
        isVisible: true,
        message:
          'Webhooks are not available on your current plan. Please upgrade to Pro or Enterprise.',
        type: 'error',
      })
      return
    }

    try {
      const secret = generateSecret()

      const { data, error } = await supabase
        .from('webhooks')
        .insert({
          organization_id: activeOrgId,
          url: formData.url.trim(),
          events: formData.events,
          secret: secret,
          active: formData.active,
        })
        .select()
        .single()

      if (error) throw error

      setToast({
        isVisible: true,
        message:
          "Webhook created successfully! Make sure to save the secret - you won't be able to see it again.",
        type: 'success',
      })

      setShowCreateModal(false)
      setFormData({ url: '', events: [], active: true })
      loadWebhooks()
    } catch (error) {
      console.error('Error creating webhook:', error)
      setToast({
        isVisible: true,
        message: 'Failed to create webhook',
        type: 'error',
      })
    }
  }

  const updateWebhook = async () => {
    if (!supabase || !editingWebhook) return

    try {
      const { error } = await supabase
        .from('webhooks')
        .update({
          url: formData.url.trim(),
          events: formData.events,
          active: formData.active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingWebhook.id)

      if (error) throw error

      setToast({
        isVisible: true,
        message: 'Webhook updated successfully',
        type: 'success',
      })

      setEditingWebhook(null)
      setFormData({ url: '', events: [], active: true })
      loadWebhooks()
    } catch (error) {
      console.error('Error updating webhook:', error)
      setToast({
        isVisible: true,
        message: 'Failed to update webhook',
        type: 'error',
      })
    }
  }

  const deleteWebhook = async webhookId => {
    if (!supabase) return

    if (activeMembership?.role !== 'Owner' && activeMembership?.role !== 'Manager') {
      setToast({
        isVisible: true,
        message: 'Only Owners and Managers can delete webhooks',
        type: 'error',
      })
      return
    }

    if (!confirm('Are you sure you want to delete this webhook?')) return

    try {
      const { error } = await supabase.from('webhooks').delete().eq('id', webhookId)

      if (error) throw error

      setToast({
        isVisible: true,
        message: 'Webhook deleted',
        type: 'success',
      })
      loadWebhooks()
    } catch (error) {
      console.error('Error deleting webhook:', error)
      setToast({
        isVisible: true,
        message: 'Failed to delete webhook',
        type: 'error',
      })
    }
  }

  const toggleEvent = event => {
    if (formData.events.includes(event)) {
      setFormData({
        ...formData,
        events: formData.events.filter(e => e !== event),
      })
    } else {
      setFormData({
        ...formData,
        events: [...formData.events, event],
      })
    }
  }

  const formatDate = dateString => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const startEdit = webhook => {
    setEditingWebhook(webhook)
    setFormData({
      url: webhook.url,
      events: webhook.events || [],
      active: webhook.active,
    })
    setShowCreateModal(true)
  }

  if (!hasWebhookAccess) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-10">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-900 rounded-lg p-8 border border-gray-800 text-center">
            <Webhook className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Webhooks Not Available</h2>
            <p className="text-gray-400 mb-6">
              Webhooks are available on Pro and Enterprise plans.
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
            <h1 className="text-3xl font-bold mb-2">Webhooks</h1>
            <p className="text-gray-400">
              Configure webhooks to receive real-time event notifications
            </p>
          </div>
          {(activeMembership?.role === 'Owner' || activeMembership?.role === 'Manager') && (
            <button
              onClick={() => {
                setEditingWebhook(null)
                setFormData({ url: '', events: [], active: true })
                setShowCreateModal(true)
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Webhook
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
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto" />
          </div>
        ) : webhooks.length === 0 ? (
          <div className="bg-gray-900 rounded-lg p-12 border border-gray-800 text-center">
            <Webhook className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">No Webhooks</h2>
            <p className="text-gray-400 mb-6">
              Create a webhook to receive real-time notifications about events in your organization
            </p>
            {(activeMembership?.role === 'Owner' || activeMembership?.role === 'Manager') && (
              <button
                onClick={() => {
                  setEditingWebhook(null)
                  setFormData({ url: '', events: [], active: true })
                  setShowCreateModal(true)
                }}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Create Your First Webhook
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {webhooks.map(webhook => {
              const stats = webhookStats[webhook.id] || {}
              return (
                <div key={webhook.id} className="bg-gray-900 rounded-lg border border-gray-800 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold">{webhook.url}</h3>
                        {webhook.active ? (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded flex items-center gap-1">
                            <X className="w-3 h-3" />
                            Inactive
                          </span>
                        )}
                        {webhook.failure_count > 0 && (
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {webhook.failure_count} failures
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400 space-y-1">
                        <p>Events: {webhook.events?.join(', ') || 'None'}</p>
                        <p>Last triggered: {formatDate(webhook.last_triggered_at)}</p>
                        {stats.total_deliveries > 0 && (
                          <p>
                            Stats: {stats.successful_deliveries}/{stats.total_deliveries} successful
                            {stats.success_rate !== null && ` (${stats.success_rate}%)`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(webhook)}
                        className="p-2 text-gray-400 hover:text-white"
                        title="Edit webhook"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteWebhook(webhook.id)}
                        className="p-2 text-red-400 hover:text-red-300"
                        title="Delete webhook"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {editingWebhook ? 'Edit Webhook' : 'Create Webhook'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Webhook URL</label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={e => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://your-server.com/webhook"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gray-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Events</label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-800 rounded-lg">
                    {availableEvents.map(event => (
                      <label key={event} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.events.includes(event)}
                          onChange={() => toggleEvent(event)}
                          className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-300">{event}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={e => setFormData({ ...formData, active: e.target.checked })}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-300">Active</span>
                  </label>
                </div>
                {!editingWebhook && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <p className="text-sm text-yellow-400">
                      <strong>Important:</strong> After creating the webhook, you'll receive a
                      secret key. Use this secret to verify webhook signatures. Save it securely -
                      you won't be able to see it again.
                    </p>
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowCreateModal(false)
                      setEditingWebhook(null)
                      setFormData({ url: '', events: [], active: true })
                    }}
                    className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingWebhook ? updateWebhook : createWebhook}
                    disabled={!formData.url.trim() || formData.events.length === 0}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingWebhook ? 'Update' : 'Create'}
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

export default Webhooks
