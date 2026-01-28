import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Settings, X, User, Lock, Link as LinkIcon, Users, 
  Copy, Check, Shield, Mail, Save, AlertCircle, CreditCard, Bell
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Toast from './Toast'

const GlobalSettings = ({ isOpen, onClose }) => {
  const navigate = useNavigate()
  const { staffProfile, user, updateStaffProfile, memberships } = useAuth()
  const [name, setName] = useState(staffProfile?.name || '')
  const [bio, setBio] = useState(staffProfile?.bio || '')
  const [userSlug, setUserSlug] = useState('')
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' })
  const [isSaving, setIsSaving] = useState(false)
  const [connections, setConnections] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [blockedAgents, setBlockedAgents] = useState([])
  const [agentNames, setAgentNames] = useState({})
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [pushSupported, setPushSupported] = useState(false)
  const [pushPermission, setPushPermission] = useState('default') // default | granted | denied
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [isSavingPush, setIsSavingPush] = useState(false)

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i)
    return outputArray
  }

  const refreshPushStatus = async () => {
    try {
      const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
      setPushSupported(supported)
      setPushPermission(typeof Notification !== 'undefined' ? Notification.permission : 'default')
      if (!supported) {
        setPushSubscribed(false)
        return
      }
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = reg ? await reg.pushManager.getSubscription() : null
      setPushSubscribed(Boolean(sub))
    } catch (_e) {
      setPushSubscribed(false)
    }
  }

  const enablePush = async () => {
    if (!supabase || !user?.id) return
    if (!vapidPublicKey) {
      setToast({ isVisible: true, message: 'Missing VITE_VAPID_PUBLIC_KEY', type: 'error' })
      return
    }
    setIsSavingPush(true)
    try {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window
      if (!supported) throw new Error('Push not supported in this browser')

      const permission = await Notification.requestPermission()
      setPushPermission(permission)
      if (permission !== 'granted') throw new Error('Notification permission not granted')

      const reg = await navigator.serviceWorker.register('/sw.js')
      const existing = await reg.pushManager.getSubscription()
      const sub =
        existing ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }))

      const jsonSub = sub.toJSON()
      const endpoint = jsonSub?.endpoint
      const p256dh = jsonSub?.keys?.p256dh
      const auth = jsonSub?.keys?.auth
      if (!endpoint || !p256dh || !auth) throw new Error('Invalid push subscription')

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(
          {
            auth_user_id: user.id,
            endpoint,
            p256dh,
            auth,
            user_agent: navigator.userAgent,
            active: true,
          },
          { onConflict: 'endpoint' }
        )

      if (error) throw error

      setToast({ isVisible: true, message: 'Browser notifications enabled', type: 'success' })
      await refreshPushStatus()
    } catch (error) {
      console.error('Enable push error:', error)
      setToast({ isVisible: true, message: error.message || 'Failed to enable notifications', type: 'error' })
    } finally {
      setIsSavingPush(false)
    }
  }

  const disablePush = async () => {
    if (!supabase || !user?.id) return
    setIsSavingPush(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = reg ? await reg.pushManager.getSubscription() : null
      if (sub) {
        const endpoint = sub.endpoint
        await sub.unsubscribe()
        await supabase
          .from('push_subscriptions')
          .update({ active: false })
          .eq('auth_user_id', user.id)
          .eq('endpoint', endpoint)
      }
      setToast({ isVisible: true, message: 'Browser notifications disabled', type: 'success' })
      await refreshPushStatus()
    } catch (error) {
      console.error('Disable push error:', error)
      setToast({ isVisible: true, message: error.message || 'Failed to disable notifications', type: 'error' })
    } finally {
      setIsSavingPush(false)
    }
  }

  // Load user slug for personal submission portal
  useEffect(() => {
    const fetchUserSlug = async () => {
      if (!supabase || !staffProfile?.id) return

      try {
        const { data, error } = await supabase
          .from('staff_members')
          .select('slug')
          .eq('id', staffProfile.id)
          .single()

        if (!error && data?.slug) {
          setUserSlug(data.slug)
        } else {
          // Generate slug from name if it doesn't exist
          const generatedSlug = (staffProfile.name || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 50)

          if (generatedSlug) {
            setUserSlug(generatedSlug)
            // Try to update database
            const { error: updateError } = await supabase
              .from('staff_members')
              .update({ slug: generatedSlug })
              .eq('id', staffProfile.id)

            if (updateError) {
              console.warn('Could not update staff slug:', updateError)
            }
          }
        }
      } catch (err) {
        console.error('Error fetching user slug:', err)
      }
    }

    if (isOpen) {
      fetchUserSlug()
      loadConnections()
      refreshPushStatus()
    }
  }, [isOpen, staffProfile?.id, staffProfile?.name])

  // Load connections and blocked agents
  const loadConnections = async () => {
    if (!supabase || !staffProfile?.id) return

    try {
      // Load all connections
      const { data: allConnections, error: connectionsError } = await supabase
        .from('connections')
        .select('*')
        .or(`requester_id.eq.${staffProfile.id},recipient_id.eq.${staffProfile.id}`)

      if (connectionsError) throw connectionsError

      // Separate by status
      const accepted = allConnections?.filter(c => c.status === 'accepted') || []
      const pending = allConnections?.filter(c => 
        c.status === 'pending' && c.recipient_id === staffProfile.id
      ) || []
      const blocked = allConnections?.filter(c => c.status === 'blocked') || []

      setConnections(accepted)
      setPendingRequests(pending)
      setBlockedAgents(blocked)

      // Load agent names for all unique agent IDs
      const allAgentIds = new Set()
      allConnections?.forEach(conn => {
        if (conn.requester_id !== staffProfile.id) allAgentIds.add(conn.requester_id)
        if (conn.recipient_id !== staffProfile.id) allAgentIds.add(conn.recipient_id)
      })

      if (allAgentIds.size > 0) {
        const { data: agents, error: agentsError } = await supabase
          .from('staff_members')
          .select('id, name')
          .in('id', Array.from(allAgentIds))

        if (!agentsError && agents) {
          const namesMap = {}
          agents.forEach(agent => {
            namesMap[agent.id] = agent.name || 'Unknown Agent'
          })
          setAgentNames(namesMap)
        }
      }
    } catch (error) {
      console.error('Error loading connections:', error)
    }
  }

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && staffProfile) {
      setName(staffProfile.name || '')
      setBio(staffProfile.bio || '')
    }
  }, [isOpen, staffProfile])

  const userSubmissionUrl = userSlug ? `${window.location.origin}/submit/user/${userSlug}` : ''
  const userEmbedCode = userSlug ? `<iframe src="${userSubmissionUrl}" width="100%" height="800" frameborder="0" style="border: none;"></iframe>` : ''

  const handleCopyUrl = (url, type) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(type)
      setToast({
        isVisible: true,
        message: 'URL copied to clipboard!',
        type: 'success',
      })
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleCopyEmbed = (code, type) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(type)
      setToast({
        isVisible: true,
        message: 'Embed code copied to clipboard!',
        type: 'success',
      })
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    const { error } = await updateStaffProfile({ name, bio })
    
    if (error) {
      setToast({
        isVisible: true,
        message: 'Error updating profile: ' + error.message,
        type: 'error',
      })
    } else {
      setToast({
        isVisible: true,
        message: 'Profile updated successfully',
        type: 'success',
      })
    }
    setIsSaving(false)
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setToast({
        isVisible: true,
        message: 'New passwords do not match',
        type: 'error',
      })
      return
    }

    if (newPassword.length < 6) {
      setToast({
        isVisible: true,
        message: 'Password must be at least 6 characters',
        type: 'error',
      })
      return
    }

    setIsChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setToast({
        isVisible: true,
        message: 'Password updated successfully',
        type: 'success',
      })

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      setToast({
        isVisible: true,
        message: error.message || 'Failed to update password',
        type: 'error',
      })
    }
    setIsChangingPassword(false)
  }

  const handleAcceptConnection = async (connectionId) => {
    if (!supabase) return

    try {
      const { error } = await supabase.rpc('accept_connection_request', {
        connection_id_param: connectionId
      })

      if (error) throw error

      setToast({
        isVisible: true,
        message: 'Connection request accepted',
        type: 'success',
      })

      loadConnections()
    } catch (error) {
      setToast({
        isVisible: true,
        message: error.message || 'Failed to accept connection',
        type: 'error',
      })
    }
  }

  const handleRejectConnection = async (connectionId) => {
    if (!supabase || !staffProfile) return

    try {
      const { error } = await supabase
        .from('connections')
        .update({ status: 'rejected' })
        .eq('id', connectionId)
        .eq('recipient_id', staffProfile.id)

      if (error) throw error

      setToast({
        isVisible: true,
        message: 'Connection request rejected',
        type: 'success',
      })

      loadConnections()
    } catch (error) {
      setToast({
        isVisible: true,
        message: error.message || 'Failed to reject connection',
        type: 'error',
      })
    }
  }

  const handleBlockAgent = async (connectionId, agentId) => {
    if (!supabase) return

    try {
      const { error } = await supabase
        .from('connections')
        .update({ status: 'blocked' })
        .eq('id', connectionId)

      if (error) throw error

      setToast({
        isVisible: true,
        message: 'Agent blocked',
        type: 'success',
      })

      loadConnections()
    } catch (error) {
      setToast({
        isVisible: true,
        message: error.message || 'Failed to block agent',
        type: 'error',
      })
    }
  }

  const handleUnblockAgent = async (connectionId) => {
    if (!supabase) return

    try {
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId)

      if (error) throw error

      setToast({
        isVisible: true,
        message: 'Agent unblocked',
        type: 'success',
      })

      loadConnections()
    } catch (error) {
      setToast({
        isVisible: true,
        message: error.message || 'Failed to unblock agent',
        type: 'error',
      })
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#0B0E14] border border-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto backdrop-blur-sm"
        >
          {/* Header */}
          <div className="sticky top-0 bg-[#0B0E14] border-b border-gray-800 p-6 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-800/50 rounded-lg border border-gray-700">
                <Settings size={20} className="text-gray-300" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Global Account Settings</h2>
                <p className="text-gray-400 text-sm">Manage your personal account and preferences</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Profile Info */}
            <div className="bg-gray-900/30 rounded-lg p-6 border border-gray-800">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <User size={18} className="text-gray-400" />
                Profile Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gray-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-800 rounded-lg text-gray-500 font-mono cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gray-700 font-mono"
                  />
                </div>
                <motion.button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="px-4 py-2 bg-gray-800/50 hover:bg-gray-800 border border-purple-500/50 rounded-lg text-gray-300 transition-all flex items-center gap-2 disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Save size={16} />
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </motion.button>
              </div>
            </div>

            {/* Security */}
            <div className="bg-gray-900/30 rounded-lg p-6 border border-gray-800">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Lock size={18} className="text-gray-400" />
                Security
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gray-700 font-mono"
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gray-700 font-mono"
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gray-700 font-mono"
                    placeholder="Confirm new password"
                  />
                </div>
                <motion.button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={isChangingPassword || !newPassword || !confirmPassword}
                  className="px-4 py-2 bg-gray-800/50 hover:bg-gray-800 border border-purple-500/50 rounded-lg text-gray-300 transition-all flex items-center gap-2 disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Lock size={16} />
                  {isChangingPassword ? 'Updating...' : 'Change Password'}
                </motion.button>
                <div className="pt-4 border-t border-gray-800">
                  <p className="text-sm text-gray-400 flex items-center gap-2">
                    <AlertCircle size={16} />
                    Multi-factor authentication (MFA) coming soon
                  </p>
                </div>
              </div>
            </div>

            {/* Personal Submission Portal */}
            {userSlug && (
              <div className="bg-gray-900/30 rounded-lg p-6 border border-gray-800">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <LinkIcon size={18} className="text-gray-400" />
                  Personal Submission Portal
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Share this URL or embed code to allow artists to submit demos directly to your personal inbox.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Submission URL</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={userSubmissionUrl}
                        readOnly
                        className="flex-1 px-3 py-2 bg-gray-900/50 border border-gray-700 rounded text-white text-sm font-mono"
                      />
                      <motion.button
                        type="button"
                        onClick={() => handleCopyUrl(userSubmissionUrl, 'user')}
                        className="px-3 py-2 bg-gray-800/50 hover:bg-gray-800 border border-purple-500/50 rounded text-gray-300 transition-all flex items-center gap-2"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {copied === 'user' ? <Check size={16} /> : <Copy size={16} />}
                      </motion.button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Embed Code</label>
                    <motion.button
                      type="button"
                      onClick={() => handleCopyEmbed(userEmbedCode, 'user-embed')}
                      className="w-full px-4 py-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-sm font-semibold transition-all flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {copied === 'user-embed' ? (
                        <>
                          <Check size={16} />
                          <span>Embed Code Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={16} />
                          <span>Copy Embed Code</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            )}

            {/* Networking */}
            <div className="bg-gray-900/30 rounded-lg p-6 border border-gray-800">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Users size={18} className="text-gray-400" />
                Networking
              </h3>
              
              {/* Pending Connection Requests */}
              {pendingRequests.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3">Pending Connection Requests</h4>
                  <div className="space-y-2">
                    {pendingRequests.map((request) => {
                      const requesterId = request.requester_id
                      const requesterName = agentNames[requesterId] || 'Unknown Agent'

                      return (
                        <div key={request.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                          <span className="text-white text-sm">{requesterName}</span>
                          <div className="flex items-center gap-2">
                            <motion.button
                              type="button"
                              onClick={() => handleAcceptConnection(request.id)}
                              className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded text-green-400 text-xs transition-all"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              Accept
                            </motion.button>
                            <motion.button
                              type="button"
                              onClick={() => handleRejectConnection(request.id)}
                              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded text-red-400 text-xs transition-all"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              Reject
                            </motion.button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Connected Agents */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">
                  Connected Agents ({connections.length})
                </h4>
                {connections.length === 0 ? (
                  <p className="text-gray-500 text-sm">No connected agents</p>
                ) : (
                  <div className="space-y-2">
                    {connections.map((connection) => {
                      const otherAgentId = connection.requester_id === staffProfile?.id 
                        ? connection.recipient_id 
                        : connection.requester_id
                      const otherAgentName = agentNames[otherAgentId] || `Agent ${otherAgentId}`
                      
                      return (
                        <div key={connection.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                          <span className="text-white text-sm">{otherAgentName}</span>
                          <motion.button
                            type="button"
                            onClick={() => handleBlockAgent(connection.id, otherAgentId)}
                            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded text-red-400 text-xs transition-all"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            Block
                          </motion.button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Blocked Agents */}
              {blockedAgents.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-3">
                    Blocked Agents ({blockedAgents.length})
                  </h4>
                  <div className="space-y-2">
                    {blockedAgents.map((blocked) => {
                      const otherAgentId = blocked.requester_id === staffProfile?.id 
                        ? blocked.recipient_id 
                        : blocked.requester_id
                      const otherAgentName = agentNames[otherAgentId] || `Agent ${otherAgentId}`
                      
                      return (
                        <div key={blocked.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                          <span className="text-gray-500 text-sm">{otherAgentName}</span>
                          <motion.button
                            type="button"
                            onClick={() => handleUnblockAgent(blocked.id)}
                            className="px-3 py-1 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded text-gray-300 text-xs transition-all"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            Unblock
                          </motion.button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Browser Notifications (Web Push) */}
            <div className="bg-gray-900/30 rounded-lg p-6 border border-gray-800">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Bell size={18} className="text-gray-400" />
                Browser Notifications
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Enable desktop notifications (Web Push). High-frequency alerts are off by default; only enable what you need.
              </p>

              {!pushSupported ? (
                <p className="text-gray-500 text-sm">This browser does not support Web Push.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold text-sm">Status</p>
                      <p className="text-gray-500 text-xs font-mono">
                        permission={pushPermission} • subscribed={pushSubscribed ? 'true' : 'false'}
                      </p>
                    </div>
                    <motion.button
                      type="button"
                      onClick={refreshPushStatus}
                      className="px-3 py-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-gray-200 text-xs font-semibold transition-all"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      Refresh
                    </motion.button>
                  </div>

                  <div className="flex gap-3">
                    {!pushSubscribed ? (
                      <motion.button
                        type="button"
                        onClick={enablePush}
                        disabled={isSavingPush}
                        className="flex-1 px-4 py-2 bg-gray-800/50 hover:bg-gray-800 border border-purple-500/50 rounded-lg text-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        whileHover={!isSavingPush ? { scale: 1.02 } : {}}
                        whileTap={!isSavingPush ? { scale: 0.98 } : {}}
                      >
                        {isSavingPush ? 'Enabling…' : 'Enable Notifications'}
                      </motion.button>
                    ) : (
                      <motion.button
                        type="button"
                        onClick={disablePush}
                        disabled={isSavingPush}
                        className="flex-1 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 rounded-lg text-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        whileHover={!isSavingPush ? { scale: 1.02 } : {}}
                        whileTap={!isSavingPush ? { scale: 0.98 } : {}}
                      >
                        {isSavingPush ? 'Disabling…' : 'Disable Notifications'}
                      </motion.button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Billing & Subscriptions - Visible to Everyone */}
            <div className="bg-gray-900/30 rounded-lg p-6 border border-gray-800">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <CreditCard size={18} className="text-gray-400" />
                Billing & Subscriptions
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                {memberships && memberships.length > 0 
                  ? 'View subscription tiers and manage billing for your labels.'
                  : 'View available subscription tiers and plans. Create or join a label to subscribe.'}
              </p>
              <motion.button
                type="button"
                onClick={() => {
                  onClose()
                  navigate('/billing')
                }}
                className="w-full px-4 py-2 bg-gray-800/50 hover:bg-gray-800 border border-purple-500/50 rounded-lg text-gray-300 transition-all flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <CreditCard size={16} />
                <span>View Plans & Pricing</span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>

      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </>
  )
}

export default GlobalSettings
