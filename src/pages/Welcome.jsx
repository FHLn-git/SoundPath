import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Building2, Plus, Users, Zap, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Toast from '../components/Toast'

const Welcome = () => {
  const navigate = useNavigate()
  const { staffProfile, switchOrganization } = useAuth()
  const [isCreatingLabel, setIsCreatingLabel] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [labelName, setLabelName] = useState('')
  const [labelSlug, setLabelSlug] = useState('')
  const [slugError, setSlugError] = useState('')
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' })

  // Auto-generate slug from label name
  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50)
  }

  const handleLabelNameChange = (value) => {
    setLabelName(value)
    if (value) {
      setLabelSlug(generateSlug(value))
      setSlugError('')
    }
  }

  const checkSlugAvailability = async (slug) => {
    if (!slug || !supabase) return

    setSlugError('')

    try {
      const { data, error } = await supabase
        .rpc('check_slug_availability', { slug_to_check: slug })

      if (error) throw error

      if (!data) {
        setSlugError('This slug is already taken. Please choose another.')
        return false
      }
      return true
    } catch (err) {
      console.error('Error checking slug:', err)
      setSlugError('Error checking slug availability')
      return false
    }
  }

  const handleCreateLabel = async () => {
    if (!labelName.trim()) {
      setToast({
        isVisible: true,
        message: 'Please enter a label name',
        type: 'error',
      })
      return
    }

    if (!labelSlug.trim()) {
      setToast({
        isVisible: true,
        message: 'Please enter a label slug',
        type: 'error',
      })
      return
    }

    const isAvailable = await checkSlugAvailability(labelSlug)
    if (!isAvailable || slugError) {
      setToast({
        isVisible: true,
        message: slugError || 'Slug is not available',
        type: 'error',
      })
      return
    }

    setIsCreatingLabel(true)

    try {
      // Check ownership limit before creating label
      const { data: capacityData, error: capacityError } = await supabase
        .rpc('can_create_label', {
          user_id_param: staffProfile.id
        })

      if (capacityError) {
        console.error('Error checking ownership limit:', capacityError)
        throw new Error('Error checking ownership limit. Please try again.')
      }

      if (capacityData && !capacityData.can_create) {
        setToast({
          isVisible: true,
          message: `You have reached your ${capacityData.tier} tier limit of ${capacityData.max_count} label${capacityData.max_count > 1 ? 's' : ''}. Upgrade to create more labels.`,
          type: 'error',
        })
        setIsCreatingLabel(false)
        return
      }

      // Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: labelName,
          slug: labelSlug,
          branding_settings: {},
        })
        .select()
        .single()

      if (orgError) throw orgError

      // Create membership as Owner
      const defaultPermissions = {
        can_vote: true,
        can_set_energy: true,
        can_advance_lobby: true,
        can_advance_office: true,
        can_advance_contract: true,
        can_access_archive: true,
        can_access_vault: true,
        can_edit_release_date: true,
        can_view_metrics: true,
      }

      // Create membership using SECURITY DEFINER function (bypasses RLS)
      const { error: membershipError } = await supabase
        .rpc('create_membership', {
          user_id_param: staffProfile.id,
          organization_id_param: orgData.id,
          role_param: 'Owner',
          permissions_json_param: defaultPermissions,
        })

      if (membershipError) throw membershipError

      // Switch to new organization
      await switchOrganization(orgData.id)

      setToast({
        isVisible: true,
        message: 'Label created successfully!',
        type: 'success',
      })

      // Redirect to dashboard
      setTimeout(() => {
        navigate('/dashboard')
        window.location.reload() // Reload to refresh all data
      }, 1000)
    } catch (error) {
      console.error('Error creating label:', error)
      setToast({
        isVisible: true,
        message: error.message || 'Failed to create label',
        type: 'error',
      })
      setIsCreatingLabel(false)
    }
  }

  const handleJoinLabel = () => {
    // TODO: Implement invite code input
    setToast({
      isVisible: true,
      message: 'Invite code feature coming soon!',
      type: 'info',
    })
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-neon-purple to-recording-red mb-6"
          >
            <Zap size={40} className="text-white" />
          </motion.div>
          <h1 className="text-4xl font-bold text-white mb-3">
            Welcome to the Lab, {staffProfile?.name || 'there'}.
          </h1>
          <p className="text-xl text-gray-400">
            You aren't part of a label yet.
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Create New Label */}
          <motion.button
            onClick={() => setShowCreateModal(true)}
            className="p-8 bg-gray-900/50 border-2 border-neon-purple/30 rounded-xl hover:border-neon-purple/60 transition-all text-left group"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-neon-purple/20 rounded-lg group-hover:bg-neon-purple/30 transition-colors">
                <Plus size={24} className="text-neon-purple" />
              </div>
              <h2 className="text-2xl font-bold text-white">CREATE NEW LABEL</h2>
            </div>
            <p className="text-gray-400">
              Start your own label and begin managing your A&R pipeline.
            </p>
            <div className="mt-4 flex items-center text-neon-purple group-hover:gap-2 transition-all">
              <span className="font-semibold">Get Started</span>
              <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </motion.button>

          {/* Join A Label */}
          <motion.button
            onClick={handleJoinLabel}
            className="p-8 bg-gray-900/50 border-2 border-gray-700 rounded-xl hover:border-gray-600 transition-all text-left group"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-gray-700/50 rounded-lg group-hover:bg-gray-600/50 transition-colors">
                <Users size={24} className="text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">JOIN A LABEL</h2>
            </div>
            <p className="text-gray-400">
              Use an invite code to join an existing label.
            </p>
            <div className="mt-4 flex items-center text-gray-400 group-hover:gap-2 transition-all">
              <span className="font-semibold">Enter Code</span>
              <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </motion.button>
        </div>

        {/* Create Label Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-900 border border-neon-purple/30 rounded-lg p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Create New Label</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setLabelName('')
                    setLabelSlug('')
                    setSlugError('')
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Label Name
                  </label>
                  <input
                    type="text"
                    value={labelName}
                    onChange={(e) => handleLabelNameChange(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-neon-purple"
                    placeholder="My Awesome Label"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Label Slug
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">soundpath.app/</span>
                    <input
                      type="text"
                      value={labelSlug}
                      onChange={(e) => setLabelSlug(e.target.value)}
                      onBlur={() => checkSlugAvailability(labelSlug)}
                      className="flex-1 px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-neon-purple"
                      placeholder="my-awesome-label"
                    />
                  </div>
                  {slugError && (
                    <p className="text-red-400 text-xs mt-1">{slugError}</p>
                  )}
                  <p className="text-gray-500 text-xs mt-1">
                    This will be your label's unique URL
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCreateLabel}
                  disabled={isCreatingLabel || !labelName || !labelSlug || !!slugError}
                  className="flex-1 px-4 py-2 bg-neon-purple hover:bg-neon-purple/80 rounded-lg text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreatingLabel ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Building2 size={18} />
                      <span>Create Label</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setLabelName('')
                    setLabelSlug('')
                    setSlugError('')
                  }}
                  className="px-4 py-2 bg-gray-900/50 hover:bg-gray-900/70 border border-gray-700 rounded-lg text-gray-300"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
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

export default Welcome
