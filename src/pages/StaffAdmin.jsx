import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Shield, TrendingUp, Activity, Zap, Users, LogOut, Settings, 
  Eye, ArrowRight, Building2, BarChart3, DollarSign, Clock, Gauge, Lock, Copy, Check, Link as LinkIcon, Music, X, AlertTriangle, Download, Trash2
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useBilling } from '../context/BillingContext'
import TrackRow from '../components/TrackRow'
import { useResizableColumns } from '../hooks/useResizableColumns'
import ResizableColumnHeader from '../components/ResizableColumnHeader'
import Toast from '../components/Toast'
import UpgradeOverlay from '../components/UpgradeOverlay'
import { supabase } from '../lib/supabaseClient'

const StaffAdmin = () => {
  const navigate = useNavigate()
  const { 
    getStaffActivity, 
    getStaffMetrics, 
    getCognitiveLoad,
    getCompanyHealth,
    getAllStaffMetrics,
    getOrganizationSettings,
    updateOrganizationSettings,
    currentStaff, 
    tracks,
    getWatchedTracks,
  } = useApp()
  const { staffProfile, signOut, updateStaffProfile, isOwner, isManager, isScout, canViewMetrics, activeOrgId, memberships, activeMembership, switchOrganization, loadMemberships, isSystemAdmin } = useAuth()
  const { plan } = useBilling()
  
  // Ensure system admin check is reliable
  const userIsSystemAdmin = isSystemAdmin || staffProfile?.role === 'SystemAdmin'
  const [showSettings, setShowSettings] = useState(false)
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' })
  const [hasAccess, setHasAccess] = useState(false)
  const [showUpgradeOverlay, setShowUpgradeOverlay] = useState(false)
  const [showLeaveLabelModal, setShowLeaveLabelModal] = useState(false)
  const [leaveLabelStep, setLeaveLabelStep] = useState(1) // 1 = first confirmation, 2 = slider, 3 = text confirmation
  const [sliderValue, setSliderValue] = useState(0) // For step 2 slider (0-100)
  const [deleteConfirmText, setDeleteConfirmText] = useState('') // For step 3 text confirmation
  const [cognitiveLoad, setCognitiveLoad] = useState(null)
  const [companyHealth, setCompanyHealth] = useState(null)
  const [allStaffMetrics, setAllStaffMetrics] = useState([])
  const [orgSettings, setOrgSettings] = useState({ require_rejection_reason: true })
  const [orgBranding, setOrgBranding] = useState({ submission_genres: ['Tech House', 'Deep House', 'Classic House', 'Piano House', 'Progressive House'] })
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false)
  const [activeOrgSlug, setActiveOrgSlug] = useState('')
  const [copied, setCopied] = useState(false)
  const [newGenre, setNewGenre] = useState('')
  const { columnWidths, handleResize, getGridTemplate, minWidths } = useResizableColumns('profile-tracks')

  // Check if user has access - only restrict free tier, allow all paid tiers and system admins
  useEffect(() => {
    const checkAccess = () => {
      // If system admin, always grant access
      if (userIsSystemAdmin) {
        setHasAccess(true)
        setShowUpgradeOverlay(false)
        return
      }
      
      // For non-system admins, check plan tier
      // IMPORTANT: If plan is null (loading), default to allowing access to avoid blocking paid users
      // Only explicitly restrict if plan.id === 'free'
      const isFreeTier = plan?.id === 'free'
      // Grant access to: agent, starter, pro, enterprise tiers, and when plan is loading (null)
      // Only restrict free tier users
      const access = plan === null || !isFreeTier
      setHasAccess(access)
      if (!access) {
        setShowUpgradeOverlay(true)
      }
    }
    checkAccess()
  }, [plan, userIsSystemAdmin])

  // Load cognitive load metrics
  useEffect(() => {
    if (currentStaff?.id && getCognitiveLoad) {
      getCognitiveLoad(currentStaff.id).then(setCognitiveLoad)
      // Refresh every 30 seconds
      const interval = setInterval(() => {
        getCognitiveLoad(currentStaff.id).then(setCognitiveLoad)
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [currentStaff?.id, getCognitiveLoad])

  // Load company health for owners
  useEffect(() => {
    if (isOwner && getCompanyHealth) {
      getCompanyHealth().then(setCompanyHealth)
      const interval = setInterval(() => {
        getCompanyHealth().then(setCompanyHealth)
      }, 60000)
      return () => clearInterval(interval)
    }
  }, [isOwner, getCompanyHealth])

  // Load all staff metrics for owners/managers
  useEffect(() => {
    if ((isOwner || isManager) && getAllStaffMetrics) {
      getAllStaffMetrics().then(setAllStaffMetrics)
      const interval = setInterval(() => {
        getAllStaffMetrics().then(setAllStaffMetrics)
      }, 60000)
      return () => clearInterval(interval)
    }
  }, [isOwner, isManager, getAllStaffMetrics])

  // Load organization settings, branding, and slug for owners
  useEffect(() => {
    const loadOrgData = async () => {
      if (!activeOrgId || !supabase) return
      
      try {
        // Load organization settings (for all users, not just owners, so rejection reason setting is visible)
        if (getOrganizationSettings) {
          const settings = await getOrganizationSettings()
          setOrgSettings(settings)
        }
        
        // Load organization data (slug, branding) - all users need slug for submission portal visibility
        const { data, error } = await supabase
          .from('organizations')
          .select('slug, branding_settings')
          .eq('id', activeOrgId)
          .single()
        
        if (!error && data) {
          // Set slug for submission portal
          setActiveOrgSlug(data.slug || '')
          
          // Load branding settings (including genres) - only for owners
          if (isOwner) {
            const branding = data.branding_settings || {}
            // Ensure submission_genres exists, use default if not
            if (!branding.submission_genres || !Array.isArray(branding.submission_genres) || branding.submission_genres.length === 0) {
              branding.submission_genres = ['Tech House', 'Deep House', 'Classic House', 'Piano House', 'Progressive House']
              // Save default genres if they don't exist
              const { error: updateError } = await supabase
                .from('organizations')
                .update({ branding_settings: branding })
                .eq('id', activeOrgId)
              
              if (updateError) {
                console.error('Error saving default genres:', updateError)
              }
            }
            console.log('Loaded org branding:', branding)
            setOrgBranding(branding)
          }
        } else if (error) {
          console.error('Error loading organization data:', error)
        }
      } catch (err) {
        console.error('Error loading organization data:', err)
      }
    }
    
    loadOrgData()
  }, [isOwner, activeOrgId, getOrganizationSettings])

  // Get submission URLs
  const labelSubmissionUrl = activeOrgSlug ? `${window.location.origin}/submit/label/${activeOrgSlug}` : ''

  // Embed code for label
  const labelEmbedCode = activeOrgSlug ? `<iframe src="${labelSubmissionUrl}" width="100%" height="800" frameborder="0" style="border: none;"></iframe>` : ''


  const handleCopyEmbed = (code, type) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(type)
      setToast({
        isVisible: true,
        message: `${type} embed code copied to clipboard!`,
        type: 'success',
      })
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleCopyUrl = (url, type) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(type)
      setToast({
        isVisible: true,
        message: `${type} URL copied to clipboard!`,
        type: 'success',
      })
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleToggleRejectionReason = async (newValue) => {
    if (!isOwner || !updateOrganizationSettings) return

    setIsUpdatingSettings(true)
    const { error } = await updateOrganizationSettings({ require_rejection_reason: newValue })
    
    if (error) {
      if (error.code === 'SCHEMA_MIGRATION_REQUIRED') {
        setToast({
          isVisible: true,
          message: 'Database migration required. Please run add-rejection-reason-setting.sql in Supabase SQL Editor.',
          type: 'error',
        })
      } else {
        setToast({
          isVisible: true,
          message: 'Error updating settings: ' + error.message,
          type: 'error',
        })
      }
    } else {
      setOrgSettings({ require_rejection_reason: newValue })
      setToast({
        isVisible: true,
        message: 'Settings updated successfully',
        type: 'success',
      })
    }
    setIsUpdatingSettings(false)
  }

  if (!staffProfile || !currentStaff) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Shield size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Loading Profile...</h2>
        </div>
      </div>
    )
  }

  const staffMetrics = getStaffMetrics(currentStaff.id)
  const watchedTracks = getWatchedTracks()

  // Get tracks this staff member advanced (moved from one phase to another)
  const advancedTracks = tracks.filter(t => {
    // This is a simplified check - in a real system you'd track who advanced each track
    return t.column !== 'inbox' && t.column !== 'vault' && !t.archived
  }).slice(0, 20) // Limit to 20 for performance

  const handleLogout = async () => {
    const { error } = await signOut()
    if (error) {
      setToast({
        isVisible: true,
        message: 'Error signing out: ' + error.message,
        type: 'error',
      })
    }
  }

  // Show upgrade overlay if no access (but keep Settings and Logout accessible)
  if (!hasAccess) {
    return (
      <>
        <div className="flex flex-col bg-gray-950 min-h-screen">
          {/* Header with Settings and Logout */}
          <div className="p-6 border-b border-gray-800 bg-[#0B0E14]/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">Manager</h1>
                <p className="text-gray-400">
                  {staffProfile.role} • {staffProfile.organization_name || 'Organization'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <motion.button
                  onClick={() => setShowSettings(!showSettings)}
                  className="px-4 py-2 bg-gray-900/50 hover:bg-gray-900/70 border border-gray-800 rounded-lg text-gray-300 transition-all flex items-center gap-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Settings size={18} />
                  Settings
                </motion.button>
                <motion.button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 transition-all flex items-center gap-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <LogOut size={18} />
                  Logout
                </motion.button>
              </div>
            </div>
          </div>

          {/* Upgrade Message */}
          <div className="flex-1 flex items-center justify-center p-10">
            <div className="text-center max-w-md">
              <h2 className="text-2xl font-bold text-white mb-4">Manager Tools</h2>
              <p className="text-gray-400 mb-6">
                Manager tools are available on Agent tier and above. Upgrade to unlock staff management, analytics, and team collaboration features.
              </p>
              <button
                onClick={() => navigate('/billing')}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg text-white font-semibold transition-all"
              >
                View Plans
              </button>
            </div>
          </div>
        </div>
        <UpgradeOverlay
          isOpen={showUpgradeOverlay}
          onClose={() => setShowUpgradeOverlay(false)}
          featureName="Manager Tools"
          planName="Agent"
        />
      </>
    )
  }

  const handleLeaveLabel = async () => {
    if (!supabase || !activeOrgId || !staffProfile) return

    try {
      const { data, error } = await supabase.rpc('leave_label', {
        organization_id_param: activeOrgId
      })

      if (error) throw error

      setToast({
        isVisible: true,
        message: `You have left ${activeMembership?.organization_name || 'the label'}`,
        type: 'success',
      })

      // Close modal and reset
      setShowLeaveLabelModal(false)
      setLeaveLabelStep(1)

      // Switch to personal view (null org) and reload
      await switchOrganization(null)
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (error) {
      console.error('Error leaving label:', error)
      setToast({
        isVisible: true,
        message: error.message || 'Error leaving label',
        type: 'error',
      })
      setShowLeaveLabelModal(false)
      setLeaveLabelStep(1)
    }
  }

  const handleDeleteLabel = async () => {
    if (!supabase || !activeOrgId || !staffProfile || !isOwner) {
      console.error('Delete label preconditions failed:', {
        hasSupabase: !!supabase,
        activeOrgId,
        hasStaffProfile: !!staffProfile,
        isOwner
      })
      return
    }

    console.log('Starting label deletion:', {
      organizationId: activeOrgId,
      staffProfileId: staffProfile.id,
      isOwner
    })

    // Verify all confirmations are complete
    if (sliderValue < 100) {
      setToast({
        isVisible: true,
        message: 'Please move the slider all the way to confirm',
        type: 'error',
      })
      return
    }

    const requiredText = 'I want to delete my record label and all of its information.'
    if (deleteConfirmText !== requiredText) {
      setToast({
        isVisible: true,
        message: `Please type exactly: "${requiredText}"`,
        type: 'error',
      })
      return
    }

    try {
      // Step 1: Archive metrics before deletion
      const { data: archiveData, error: archiveError } = await supabase.rpc('archive_organization_metrics', {
        p_organization_id: activeOrgId,
        p_deleted_by: staffProfile.id
      })

      if (archiveError) {
        console.error('Error archiving metrics:', archiveError)
        // Continue with deletion even if archiving fails, but log it
        setToast({
          isVisible: true,
          message: 'Warning: Metrics archiving failed, but proceeding with deletion',
          type: 'warning',
        })
      } else {
        console.log('Metrics archived successfully:', archiveData)
      }

      // Step 2: Delete the organization (this will cascade delete related data due to ON DELETE CASCADE)
      // Note: We don't use .select() here because RLS may block SELECT after DELETE
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', activeOrgId)

      if (error) {
        console.error('Delete organization error:', error)
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        // Provide more specific error messages
        if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('policy')) {
          throw new Error('Permission denied: You do not have permission to delete this organization. Make sure you are the owner and the DELETE policy is configured correctly. Run fix-organization-delete-rls.sql in Supabase SQL Editor.')
        }
        throw new Error(`Deletion failed: ${error.message || 'Unknown error'}`)
      }

      // Step 3: Verify deletion succeeded by checking if organization still exists
      // Wait a moment for the deletion to complete
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const { data: verifyOrg, error: verifyError } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', activeOrgId)
        .maybeSingle()
      
      if (verifyError && verifyError.code !== 'PGRST116') { // PGRST116 = not found, which is what we want
        console.warn('Verify deletion check error (non-critical):', verifyError)
      }
      
      if (verifyOrg) {
        throw new Error('Deletion failed: Organization still exists. The DELETE policy may not be working correctly. Please verify the policy exists and you are the owner.')
      }

      setToast({
        isVisible: true,
        message: `${activeMembership?.organization_name || 'The label'} has been permanently deleted. Metrics have been archived.`,
        type: 'success',
      })

      // Close modal and reset
      setShowLeaveLabelModal(false)
      setLeaveLabelStep(1)
      setSliderValue(0)
      setDeleteConfirmText('')

      // Switch to personal view (null org)
      await switchOrganization(null)
      
      // Reload memberships to immediately remove deleted label from launchpad
      if (staffProfile && loadMemberships) {
        await loadMemberships(staffProfile.id)
      }
      
      // Navigate to launchpad to see updated list
      navigate('/launchpad')
    } catch (error) {
      console.error('Error deleting label:', error)
      setToast({
        isVisible: true,
        message: error.message || 'Error deleting label. Make sure you are the owner.',
        type: 'error',
      })
      setShowLeaveLabelModal(false)
      setLeaveLabelStep(1)
      setSliderValue(0)
      setDeleteConfirmText('')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Optimal': return 'text-green-400'
      case 'Sleeping': return 'text-blue-400'
      case 'Warning': return 'text-yellow-400'
      case 'Fatigued': return 'text-orange-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusBgColor = (status) => {
    switch (status) {
      case 'Optimal': return 'bg-green-500/20 border-green-500/50'
      case 'Sleeping': return 'bg-blue-500/20 border-blue-500/50'
      case 'Warning': return 'bg-yellow-500/20 border-yellow-500/50'
      case 'Fatigued': return 'bg-orange-500/20 border-orange-500/50'
      default: return 'bg-gray-500/20 border-gray-500/50'
    }
  }

  return (
    <div className="flex flex-col bg-gray-950">
      <UpgradeOverlay
        isOpen={showUpgradeOverlay}
        onClose={() => setShowUpgradeOverlay(false)}
        featureName="Manager Tools"
        planName="Agent"
      />
      {/* Header */}
      <div className="p-6 border-b border-gray-800 bg-[#0B0E14]/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Profile</h1>
            <p className="text-gray-400">
              {staffProfile.role} • {staffProfile.organization_name || 'Organization'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              onClick={() => setShowSettings(!showSettings)}
              className="px-4 py-2 bg-gray-900/50 hover:bg-gray-900/70 border border-gray-800 rounded-lg text-gray-300 transition-all flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Settings size={18} />
              Settings
            </motion.button>
            <motion.button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 transition-all flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <LogOut size={18} />
              Logout
            </motion.button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-[#0B0E14] border border-gray-800 rounded-lg relative"
          >
            <h3 className="text-lg font-bold text-white mb-4">Workspace Settings</h3>
            <div className="space-y-4 pb-16">
              {/* Label Submission Portal (for Owners) */}
              {isOwner && activeOrgId && (
                <div className="pt-4">
                  <h4 className="text-md font-bold text-white mb-4 flex items-center gap-2">
                    <LinkIcon size={18} className="text-gray-400" />
                    Label Submission Portal
                  </h4>
                  {activeOrgSlug ? (
                    <div className="p-4 bg-gray-900/40 rounded-lg border border-gray-800">
                      <p className="text-white font-semibold mb-2 flex items-center gap-2">
                        <Building2 size={16} className="text-gray-400" />
                        Label Submission URL
                      </p>
                      <div className="flex items-center gap-2 mb-3">
                        <input
                          type="text"
                          value={labelSubmissionUrl}
                          readOnly
                          className="flex-1 px-3 py-2 bg-gray-900/50 border border-gray-700 rounded text-white text-sm font-mono"
                        />
                        <motion.button
                          type="button"
                          onClick={() => handleCopyUrl(labelSubmissionUrl, 'label')}
                          className="px-3 py-2 bg-gray-800/50 hover:bg-gray-800 border border-neon-purple/50 rounded text-gray-300 transition-all flex items-center gap-2"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {copied === 'label' ? <Check size={16} /> : <Copy size={16} />}
                        </motion.button>
                      </div>
                      <motion.button
                        type="button"
                        onClick={() => handleCopyEmbed(labelEmbedCode, 'label-embed')}
                        className="w-full px-4 py-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-sm font-semibold transition-all flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {copied === 'label-embed' ? (
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
                  ) : (
                    <div className="p-4 bg-gray-900/40 rounded-lg border border-gray-800">
                      <p className="text-gray-400 text-sm">Label slug not configured. Submission portal will be available once slug is set.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Submission Genres - Owners Only */}
              {isOwner && activeOrgId && (
                <div className="pt-4 border-t border-gray-700/50">
                  <h4 className="text-md font-bold text-white mb-4 flex items-center gap-2">
                    <Music size={18} className="text-gray-300" />
                    Submission Genres
                  </h4>
                  <p className="text-gray-400 text-sm mb-4">
                    Control which genres artists can select when submitting demos to your label.
                  </p>
                  
                  {/* Current Genres */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Available Genres</label>
                    {(!orgBranding.submission_genres || orgBranding.submission_genres.length === 0) ? (
                      <p className="text-gray-500 text-sm mb-3">No genres configured. Add your first genre below.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {orgBranding.submission_genres.map((genre, index) => (
                        <div
                          key={index}
                          className="px-3 py-1.5 bg-gray-800/50 border border-neon-purple/50 rounded-lg text-gray-300 text-sm flex items-center gap-2"
                        >
                          <span>{genre}</span>
                          <button
                            onClick={async () => {
                              const updatedGenres = orgBranding.submission_genres.filter((_, i) => i !== index)
                              const updatedBranding = { ...orgBranding, submission_genres: updatedGenres }
                              setOrgBranding(updatedBranding)
                              
                              // Update in database
                              if (supabase && activeOrgId) {
                                const { error } = await supabase
                                  .from('organizations')
                                  .update({ branding_settings: updatedBranding })
                                  .eq('id', activeOrgId)
                                
                                if (error) {
                                  console.error('Error updating genres:', error)
                                  setToast({
                                    isVisible: true,
                                    message: 'Error updating genres',
                                    type: 'error',
                                  })
                                  // Revert on error
                                  setOrgBranding(orgBranding)
                                } else {
                                  setToast({
                                    isVisible: true,
                                    message: 'Genres updated',
                                    type: 'success',
                                  })
                                }
                              }
                            }}
                            className="text-red-400 hover:text-red-300"
                          >
                            ×
                          </button>
                        </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Add New Genre */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newGenre}
                        onChange={(e) => setNewGenre(e.target.value)}
                        onKeyPress={async (e) => {
                          if (e.key === 'Enter' && newGenre.trim()) {
                            e.preventDefault()
                            const updatedGenres = [...(orgBranding.submission_genres || []), newGenre.trim()]
                            const updatedBranding = { ...orgBranding, submission_genres: updatedGenres }
                            setOrgBranding(updatedBranding)
                            setNewGenre('')
                            
                            // Update in database
                            if (supabase && activeOrgId) {
                              const { error } = await supabase
                                .from('organizations')
                                .update({ branding_settings: updatedBranding })
                                .eq('id', activeOrgId)
                              
                              if (error) {
                                console.error('Error updating genres:', error)
                                setToast({
                                  isVisible: true,
                                  message: 'Error updating genres',
                                  type: 'error',
                                })
                                // Revert on error
                                setOrgBranding(orgBranding)
                              } else {
                                setToast({
                                  isVisible: true,
                                  message: 'Genre added',
                                  type: 'success',
                                })
                              }
                            }
                          }
                        }}
                        placeholder="Add new genre..."
                        className="flex-1 px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-purple font-mono text-sm"
                      />
                      <motion.button
                        onClick={async () => {
                          if (!newGenre.trim()) return
                          const updatedGenres = [...(orgBranding.submission_genres || []), newGenre.trim()]
                          const updatedBranding = { ...orgBranding, submission_genres: updatedGenres }
                          setOrgBranding(updatedBranding)
                          setNewGenre('')
                          
                          // Update in database
                          if (supabase && activeOrgId) {
                            const { error } = await supabase
                              .from('organizations')
                              .update({ branding_settings: updatedBranding })
                              .eq('id', activeOrgId)
                            
                            if (error) {
                              console.error('Error updating genres:', error)
                              setToast({
                                isVisible: true,
                                message: 'Error updating genres',
                                type: 'error',
                              })
                              // Revert on error
                              setOrgBranding(orgBranding)
                            } else {
                              setToast({
                                isVisible: true,
                                message: 'Genre added',
                                type: 'success',
                              })
                            }
                          }
                        }}
                        disabled={!newGenre.trim()}
                        className="px-4 py-2 bg-gray-800/50 hover:bg-gray-800 border border-neon-purple/50 rounded-lg text-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Add
                      </motion.button>
                    </div>
                  </div>
                </div>
              )}

              {/* Compliance & Data Settings - Owners Only */}
              {isOwner && (
                <div className="pt-4 border-t border-gray-700/50">
                  <h4 className="text-md font-bold text-white mb-4 flex items-center gap-2">
                    <Shield size={18} className="text-gray-300" />
                    Compliance & Data
                  </h4>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-white font-semibold mb-1">Require Staff Rejection Reasons</p>
                      <p className="text-gray-400 text-sm">
                        When enabled, staff must provide a reason (minimum 5 characters) when rejecting tracks.
                      </p>
                    </div>
                    <motion.button
                      onClick={() => handleToggleRejectionReason(!orgSettings.require_rejection_reason)}
                      disabled={isUpdatingSettings}
                      className={`relative w-14 h-8 rounded-full transition-colors ${
                        orgSettings.require_rejection_reason
                          ? 'bg-green-500'
                          : 'bg-gray-600'
                      } ${isUpdatingSettings ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      whileHover={!isUpdatingSettings ? { scale: 1.05 } : {}}
                      whileTap={!isUpdatingSettings ? { scale: 0.95 } : {}}
                    >
                      <motion.div
                        animate={{
                          x: orgSettings.require_rejection_reason ? 24 : 0,
                        }}
                        className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg"
                      />
                    </motion.button>
                  </div>
                </div>
              )}

              {/* GDPR & Account Management */}
              <div className="pt-4 border-t border-gray-700/50">
                <h4 className="text-md font-bold text-white mb-4 flex items-center gap-2">
                  <Shield size={18} className="text-gray-300" />
                  Privacy & Account
                </h4>
                <div className="space-y-3">
                  <motion.a
                    href="/data-export"
                    className="flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-gray-300 transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Download size={18} className="text-blue-400" />
                    <div className="flex-1">
                      <p className="font-semibold text-white">Export My Data</p>
                      <p className="text-xs text-gray-400">Download a copy of all your personal data</p>
                    </div>
                  </motion.a>
                </div>
              </div>

            </div>
            
            {/* Delete Label Button (Owners) / Leave Label Button (Non-Owners) - Bottom Right Corner */}
            {activeOrgId !== null && activeMembership && (
              <div className="absolute bottom-4 right-4">
                {isOwner ? (
                  <motion.button
                    onClick={() => {
                      setLeaveLabelStep(1)
                      setSliderValue(0)
                      setDeleteConfirmText('')
                      setShowLeaveLabelModal(true)
                    }}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 transition-all flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Trash2 size={16} />
                    Delete Label
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={() => {
                      setLeaveLabelStep(1)
                      setSliderValue(0)
                      setDeleteConfirmText('')
                      setShowLeaveLabelModal(true)
                    }}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 transition-all flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <AlertTriangle size={16} />
                    Leave Label
                  </motion.button>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Delete Label (Owners) / Leave Label (Non-Owners) Confirmation Modal - Two Steps */}
        {showLeaveLabelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              if (leaveLabelStep === 1) {
                setShowLeaveLabelModal(false)
                setLeaveLabelStep(1)
                setSliderValue(0)
                setDeleteConfirmText('')
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`bg-gray-900 border-2 rounded-lg p-6 max-w-md w-full ${
                leaveLabelStep === 1 
                  ? 'border-yellow-500/50' 
                  : leaveLabelStep === 2
                  ? 'border-orange-500/50'
                  : 'border-red-500/50'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {isOwner ? (
                // Owner: Delete Label Flow - 3 Steps
                leaveLabelStep === 1 ? (
                  // Step 1: First Confirmation - "Are you sure?"
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Trash2 className="text-yellow-500" size={24} />
                        <h3 className="text-xl font-bold text-white">Delete Label?</h3>
                      </div>
                      <button
                        onClick={() => {
                          setShowLeaveLabelModal(false)
                          setLeaveLabelStep(1)
                          setSliderValue(0)
                          setDeleteConfirmText('')
                        }}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <p className="text-gray-300 mb-6">
                      Are you sure you want to permanently delete <span className="font-semibold text-white">{activeMembership?.organization_name}</span>? 
                      This will delete the entire label and all its data.
                    </p>
                    <div className="flex gap-3">
                      <motion.button
                        onClick={() => setLeaveLabelStep(2)}
                        className="flex-1 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 rounded-lg text-yellow-400 transition-all"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Yes, Continue
                      </motion.button>
                      <motion.button
                        onClick={() => {
                          setShowLeaveLabelModal(false)
                          setLeaveLabelStep(1)
                          setSliderValue(0)
                          setDeleteConfirmText('')
                        }}
                        className="flex-1 px-4 py-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-gray-300 transition-all"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Cancel
                      </motion.button>
                    </div>
                  </>
                ) : leaveLabelStep === 2 ? (
                  // Step 2: Slider Confirmation
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Trash2 className="text-orange-500" size={24} />
                        <h3 className="text-xl font-bold text-white">Confirm Deletion</h3>
                      </div>
                      <button
                        onClick={() => {
                          setShowLeaveLabelModal(false)
                          setLeaveLabelStep(1)
                          setSliderValue(0)
                          setDeleteConfirmText('')
                        }}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                      <p className="text-red-400 font-semibold mb-2">⚠️ This action cannot be undone</p>
                      <p className="text-gray-300 text-sm mb-4">
                        You are about to permanently delete <span className="font-semibold text-white">{activeMembership?.organization_name}</span>. 
                        This will immediately delete:
                      </p>
                      <ul className="text-gray-400 text-sm mt-2 ml-4 list-disc space-y-1">
                        <li>All label tracks and submissions</li>
                        <li>All label artists and data</li>
                        <li>The label workspace and all settings</li>
                        <li>All team memberships</li>
                        <li>All label subscriptions and billing data</li>
                        <li>All label-specific features and configurations</li>
                      </ul>
                      <p className="text-gray-300 text-sm mt-3">
                        <strong className="text-red-400">All team members will lose access immediately.</strong> This cannot be reversed.
                      </p>
                    </div>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-300 mb-3">
                        Slide to confirm deletion: {sliderValue}%
                      </label>
                      <div className="relative">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={sliderValue}
                          onChange={(e) => setSliderValue(parseInt(e.target.value))}
                          className="w-full h-3 bg-gray-800 rounded-lg appearance-none cursor-pointer slider"
                          style={{
                            background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${sliderValue}%, #374151 ${sliderValue}%, #374151 100%)`
                          }}
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Cancel</span>
                          <span>Delete</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <motion.button
                        onClick={() => {
                          if (sliderValue === 100) {
                            setLeaveLabelStep(3)
                          } else {
                            setToast({
                              isVisible: true,
                              message: 'Please slide all the way to 100% to continue',
                              type: 'error',
                            })
                          }
                        }}
                        disabled={sliderValue < 100}
                        className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        whileHover={sliderValue === 100 ? { scale: 1.02 } : {}}
                        whileTap={sliderValue === 100 ? { scale: 0.98 } : {}}
                      >
                        Continue
                      </motion.button>
                      <motion.button
                        onClick={() => {
                          setLeaveLabelStep(1)
                          setSliderValue(0)
                        }}
                        className="flex-1 px-4 py-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-gray-300 transition-all"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Go Back
                      </motion.button>
                    </div>
                  </>
                ) : (
                  // Step 3: Text Confirmation
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Trash2 className="text-red-500" size={24} />
                        <h3 className="text-xl font-bold text-red-400">Final Confirmation</h3>
                      </div>
                      <button
                        onClick={() => {
                          setShowLeaveLabelModal(false)
                          setLeaveLabelStep(1)
                          setSliderValue(0)
                          setDeleteConfirmText('')
                        }}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                      <p className="text-red-400 font-semibold mb-2">⚠️ Final Step - This action cannot be undone</p>
                      <p className="text-gray-300 text-sm mb-4">
                        To confirm deletion of <span className="font-semibold text-white">{activeMembership?.organization_name}</span>, 
                        please type the following exactly:
                      </p>
                      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 mb-4">
                        <p className="text-white font-mono text-sm">
                          "I want to delete my record label and all of its information."
                        </p>
                      </div>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="Type the confirmation text above..."
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      {deleteConfirmText && deleteConfirmText !== 'I want to delete my record label and all of its information.' && (
                        <p className="text-red-400 text-xs mt-2">Text does not match exactly</p>
                      )}
                      {deleteConfirmText === 'I want to delete my record label and all of its information.' && (
                        <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
                          <Check size={12} />
                          Confirmation text matches
                        </p>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <motion.button
                        onClick={handleDeleteLabel}
                        disabled={deleteConfirmText !== 'I want to delete my record label and all of its information.'}
                        className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        whileHover={deleteConfirmText === 'I want to delete my record label and all of its information.' ? { scale: 1.02 } : {}}
                        whileTap={deleteConfirmText === 'I want to delete my record label and all of its information.' ? { scale: 0.98 } : {}}
                      >
                        Yes, Delete Label
                      </motion.button>
                      <motion.button
                        onClick={() => {
                          setLeaveLabelStep(2)
                          setDeleteConfirmText('')
                        }}
                        className="flex-1 px-4 py-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-gray-300 transition-all"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Go Back
                      </motion.button>
                    </div>
                  </>
                )
              ) : (
                // Non-Owner: Leave Label Flow
                leaveLabelStep === 1 ? (
                  // First Confirmation - Warning
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="text-yellow-500" size={24} />
                        <h3 className="text-xl font-bold text-white">Leave Label?</h3>
                      </div>
                      <button
                      onClick={() => {
                        setShowLeaveLabelModal(false)
                        setLeaveLabelStep(1)
                        setSliderValue(0)
                        setDeleteConfirmText('')
                      }}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <p className="text-gray-300 mb-6">
                    Are you sure you want to leave <span className="font-semibold text-white">{activeMembership?.organization_name}</span>? 
                    You will lose access to this label's workspace, but you can rejoin if invited again.
                  </p>
                  <div className="flex gap-3">
                    <motion.button
                      onClick={() => setLeaveLabelStep(2)}
                      className="flex-1 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 rounded-lg text-yellow-400 transition-all"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Yes, Continue
                    </motion.button>
                    <motion.button
                      onClick={() => {
                        setShowLeaveLabelModal(false)
                        setLeaveLabelStep(1)
                        setSliderValue(0)
                        setDeleteConfirmText('')
                      }}
                      className="flex-1 px-4 py-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-gray-300 transition-all"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel
                    </motion.button>
                  </div>
                </>
              ) : (
                // Second Confirmation - Final Warning (More Severe)
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="text-red-500" size={24} />
                      <h3 className="text-xl font-bold text-red-400">Final Confirmation</h3>
                    </div>
                    <button
                      onClick={() => {
                        setShowLeaveLabelModal(false)
                        setLeaveLabelStep(1)
                        setSliderValue(0)
                        setDeleteConfirmText('')
                      }}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                    <p className="text-red-400 font-semibold mb-2">⚠️ This action cannot be undone</p>
                    <p className="text-gray-300 text-sm">
                      You are about to permanently leave <span className="font-semibold text-white">{activeMembership?.organization_name}</span>. 
                      You will immediately lose access to:
                    </p>
                    <ul className="text-gray-400 text-sm mt-2 ml-4 list-disc">
                      <li>All label tracks and submissions</li>
                      <li>The label workspace and dashboard</li>
                      <li>Label calendar and vault</li>
                      <li>All label-specific features</li>
                    </ul>
                    <p className="text-gray-300 text-sm mt-3">
                      You can only rejoin if a label Owner invites you again.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <motion.button
                      onClick={handleLeaveLabel}
                      className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 transition-all font-semibold"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Yes, Leave Label
                    </motion.button>
                    <motion.button
                      onClick={() => {
                        setLeaveLabelStep(1)
                      }}
                      className="flex-1 px-4 py-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-gray-300 transition-all"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Go Back
                    </motion.button>
                  </div>
                </>
              )
              )}
            </motion.div>
          </motion.div>
        )}
      </div>

      <div className="p-4">
        {/* For Owners: Company Health First */}
        {isOwner && (
          <>
            {/* Company Health Dashboard - Expanded */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Building2 size={24} className="text-gray-300" />
                Company Metrics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-gray-900/50 backdrop-blur-sm rounded-lg p-6 border ${
                    companyHealth?.companyHealthScore !== undefined
                      ? companyHealth.companyHealthScore >= 70
                        ? 'border-green-500/50'
                        : companyHealth.companyHealthScore >= 50
                        ? 'border-yellow-500/50'
                        : 'border-red-500/50'
                      : 'border-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-3 rounded-lg ${
                      companyHealth?.companyHealthScore !== undefined
                        ? companyHealth.companyHealthScore >= 70
                          ? 'bg-green-500/20'
                          : companyHealth.companyHealthScore >= 50
                          ? 'bg-yellow-500/20'
                          : 'bg-red-500/20'
                        : 'bg-blue-500/20'
                    }`}>
                      <BarChart3 size={24} className={
                        companyHealth?.companyHealthScore !== undefined
                          ? companyHealth.companyHealthScore >= 70
                            ? 'text-green-400'
                            : companyHealth.companyHealthScore >= 50
                            ? 'text-yellow-400'
                            : 'text-red-400'
                          : 'text-blue-400'
                      } />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Company Health Score</p>
                      {canViewMetrics() ? (
                        <p className={`text-2xl font-bold ${
                          companyHealth?.companyHealthScore !== undefined
                            ? companyHealth.companyHealthScore >= 70
                              ? 'text-green-400'
                              : companyHealth.companyHealthScore >= 50
                              ? 'text-yellow-400'
                              : 'text-red-400'
                            : 'text-white'
                        }`}>
                          {companyHealth?.companyHealthScore ?? 'N/A'}%
                        </p>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-500">
                          <Lock size={16} />
                          <span className="text-sm">Restricted</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {companyHealth?.fatiguedStaffCount || 0} staff fatigued • {companyHealth?.totalStaff || 0} total staff
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-6 border border-gray-800"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-blue-500/20 rounded-lg">
                      <Activity size={24} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Daily Submissions</p>
                      <p className="text-2xl font-bold text-white">{companyHealth?.dailyDemos || 0}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {companyHealth?.demosPerStaff?.toFixed(1) || 0} per staff (Cap: {companyHealth?.expectationCap || 60}/day)
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-6 border border-gray-800"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-green-500/20 rounded-lg">
                      <TrendingUp size={24} className="text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Release Impact</p>
                      {canViewMetrics() ? (
                        <p className="text-2xl font-bold text-white">N/A</p>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-500">
                          <Lock size={16} />
                          <span className="text-sm">Restricted</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {canViewMetrics() ? (
                    <p className="text-xs text-gray-500">Spotify/Instagram metrics placeholder</p>
                  ) : (
                    <p className="text-xs text-gray-500">Restricted</p>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-6 border border-gray-800"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-purple-500/20 rounded-lg">
                      <DollarSign size={24} className="text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Total Earnings</p>
                      {canViewMetrics() ? (
                        <p className="text-2xl font-bold text-white">
                          ${tracks.filter(t => t.column === 'vault').reduce((sum, t) => sum + (t.totalEarnings || 0), 0).toFixed(2)}
                        </p>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-500">
                          <Lock size={16} />
                          <span className="text-sm">Restricted</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Lifetime track earnings</p>
                </motion.div>
              </div>
            </div>

            {/* Staff Overview - Expanded */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Users size={24} className="text-gray-300" />
                  Staff Metrics
                </h2>
                {isOwner && (
                  <motion.button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      navigate('/admin/staff')
                    }}
                    className="px-4 py-2 bg-gray-800/50 hover:bg-gray-800 border border-neon-purple/50 rounded-lg text-gray-300 text-sm font-semibold flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ArrowRight size={16} />
                    Manage Staff
                  </motion.button>
                )}
              </div>
              <motion.div 
                onClick={(e) => {
                  e.preventDefault()
                  if (isOwner) navigate('/admin/staff')
                }}
                className={`bg-gray-900/30 rounded-lg border border-gray-800/50 overflow-hidden ${
                  isOwner ? 'cursor-pointer hover:border-gray-700 transition-colors' : ''
                }`}
                whileHover={isOwner ? { scale: 1.01 } : {}}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {allStaffMetrics.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-gray-400">
                      <Activity className="mx-auto mb-2 animate-spin" size={24} />
                      <p>Loading staff metrics...</p>
                    </div>
                  ) : (
                    allStaffMetrics.map((staff) => (
                      <motion.div
                        key={staff.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`bg-gray-900/50 backdrop-blur-sm rounded-lg p-4 border ${
                          staff.cognitiveLoad?.overallColor === 'green' ? 'border-green-500/30' :
                          staff.cognitiveLoad?.overallColor === 'blue' ? 'border-blue-500/30' :
                          staff.cognitiveLoad?.overallColor === 'yellow' ? 'border-yellow-500/30' :
                          staff.cognitiveLoad?.overallColor === 'orange' ? 'border-orange-500/30' :
                          'border-gray-800/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              staff.isOnline ? 'bg-green-500' : 'bg-gray-500'
                            }`} />
                            <p className="font-semibold text-white">{staff.name}</p>
                            <span className="text-xs px-2 py-0.5 bg-gray-800/50 text-gray-300 rounded">
                              {staff.role}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Status:</span>
                            <span className={`font-semibold ${
                              staff.cognitiveLoad?.overallColor === 'green' ? 'text-green-400' :
                              staff.cognitiveLoad?.overallColor === 'blue' ? 'text-blue-400' :
                              staff.cognitiveLoad?.overallColor === 'yellow' ? 'text-yellow-400' :
                              staff.cognitiveLoad?.overallColor === 'orange' ? 'text-orange-400' :
                              'text-gray-400'
                            }`}>
                              {staff.cognitiveLoad?.overallStatus || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Weekly Listens:</span>
                            <span className="text-white">{staff.weeklyListens}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Voting Rate:</span>
                            <span className="text-white">{staff.staffMetrics?.votingParticipationRate || 0}%</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Avg Energy:</span>
                            <span className="text-white">{staff.staffMetrics?.avgEnergyAssigned || 0}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )}

        {/* Personal Reports Section - All Roles */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Personal Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-4 border border-gray-800"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Zap size={20} className="text-yellow-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Avg Energy</p>
                  <p className="text-lg font-bold text-white">{staffMetrics.avgEnergyAssigned}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-4 border border-gray-800"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Users size={20} className="text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Voting Rate</p>
                  <p className="text-lg font-bold text-white">{staffMetrics.votingParticipationRate}%</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-4 border border-gray-800"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <TrendingUp size={20} className="text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Tracks Advanced</p>
                  <p className="text-lg font-bold text-white">{advancedTracks.length}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Listening Scores Section - All Roles */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Gauge size={24} className="text-gray-300" />
            Listening Scores
          </h2>
          
          {cognitiveLoad ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Daily Activity */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-gray-900/50 backdrop-blur-sm rounded-lg p-4 border ${getStatusBgColor(cognitiveLoad.daily.status)}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock size={18} className={getStatusColor(cognitiveLoad.daily.status)} />
                    <p className="text-sm font-semibold text-gray-300">Daily Activity</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${getStatusBgColor(cognitiveLoad.daily.status)} ${getStatusColor(cognitiveLoad.daily.status)}`}>
                    {cognitiveLoad.daily.status}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Listens: {cognitiveLoad.daily.listens}</span>
                    <span>Demos: {cognitiveLoad.daily.demos}</span>
                  </div>
                  <div className="relative h-2 bg-gray-900/50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(cognitiveLoad.daily.percentage, 100)}%` }}
                      className={`h-full ${
                        cognitiveLoad.daily.color === 'green' ? 'bg-green-500' :
                        cognitiveLoad.daily.color === 'blue' ? 'bg-blue-500' :
                        cognitiveLoad.daily.color === 'yellow' ? 'bg-yellow-500' :
                        'bg-orange-500'
                      }`}
                    />
                  </div>
                  <p className="text-xs text-gray-500">Coverage: {cognitiveLoad.daily.percentage.toFixed(1)}%</p>
                </div>
              </motion.div>

              {/* Weekly Momentum */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`bg-gray-900/50 backdrop-blur-sm rounded-lg p-4 border ${getStatusBgColor(cognitiveLoad.weekly.status)}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={18} className={getStatusColor(cognitiveLoad.weekly.status)} />
                    <p className="text-sm font-semibold text-gray-300">Weekly Momentum</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${getStatusBgColor(cognitiveLoad.weekly.status)} ${getStatusColor(cognitiveLoad.weekly.status)}`}>
                    {cognitiveLoad.weekly.status}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Listens: {cognitiveLoad.weekly.listens}</span>
                    <span>Demos: {cognitiveLoad.weekly.demos}</span>
                  </div>
                  <div className="relative h-2 bg-gray-900/50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(cognitiveLoad.weekly.percentage, 100)}%` }}
                      transition={{ delay: 0.1 }}
                      className={`h-full ${
                        cognitiveLoad.weekly.color === 'green' ? 'bg-green-500' :
                        cognitiveLoad.weekly.color === 'blue' ? 'bg-blue-500' :
                        cognitiveLoad.weekly.color === 'yellow' ? 'bg-yellow-500' :
                        'bg-orange-500'
                      }`}
                    />
                  </div>
                  <p className="text-xs text-gray-500">Coverage: {cognitiveLoad.weekly.percentage.toFixed(1)}%</p>
                </div>
              </motion.div>

              {/* Monthly Consistency */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`bg-gray-900/50 backdrop-blur-sm rounded-lg p-4 border ${getStatusBgColor(cognitiveLoad.monthly.status)}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={18} className={getStatusColor(cognitiveLoad.monthly.status)} />
                    <p className="text-sm font-semibold text-gray-300">Monthly Consistency</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${getStatusBgColor(cognitiveLoad.monthly.status)} ${getStatusColor(cognitiveLoad.monthly.status)}`}>
                    {cognitiveLoad.monthly.status}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Listens: {cognitiveLoad.monthly.listens}</span>
                    <span>Demos: {cognitiveLoad.monthly.demos}</span>
                  </div>
                  <div className="relative h-2 bg-gray-900/50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(cognitiveLoad.monthly.percentage, 100)}%` }}
                      transition={{ delay: 0.2 }}
                      className={`h-full ${
                        cognitiveLoad.monthly.color === 'green' ? 'bg-green-500' :
                        cognitiveLoad.monthly.color === 'blue' ? 'bg-blue-500' :
                        cognitiveLoad.monthly.color === 'yellow' ? 'bg-yellow-500' :
                        'bg-orange-500'
                      }`}
                    />
                  </div>
                  <p className="text-xs text-gray-500">Coverage: {cognitiveLoad.monthly.percentage.toFixed(1)}%</p>
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-8 border border-gray-800 text-center">
              <Activity className="text-gray-300 mx-auto mb-2 animate-spin" size={24} />
              <p className="text-gray-400">Loading cognitive load metrics...</p>
            </div>
          )}

          {/* Overall Status */}
          {cognitiveLoad && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`bg-gray-900/50 backdrop-blur-sm rounded-lg p-3 border ${getStatusBgColor(cognitiveLoad.overallStatus)} mb-6 w-fit`}
            >
              <div className="flex items-center gap-3">
                <Gauge size={20} className={getStatusColor(cognitiveLoad.overallStatus)} />
                <div>
                  <p className="text-xs text-gray-400">Overall Score</p>
                  <p className={`text-xl font-bold ${getStatusColor(cognitiveLoad.overallStatus)}`}>
                    {cognitiveLoad.overallStatus}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Close Eye List - All Roles */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Eye size={24} className="text-gray-300" />
            Close Eye
          </h2>
          <div className="bg-gray-900/30 rounded-lg border border-gray-800/50 overflow-hidden">
            <div className="max-h-64 overflow-y-auto p-4">
              {watchedTracks.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No tracks being watched</p>
              ) : (
                <div className="space-y-2">
                  {watchedTracks.map((track) => (
                    <div
                      key={track.id}
                      onClick={(e) => {
                        e.preventDefault()
                        navigate(`/phase/${track.column}`, { state: { scrollToTrackId: track.id } })
                      }}
                      className="p-3 bg-gray-900/50 rounded hover:bg-gray-900/70 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold truncate">{track.artist}</p>
                          <p className="text-gray-400 text-sm truncate">{track.title}</p>
                        </div>
                        <span className="text-xs text-gray-500 ml-4">{track.column}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tracks I Advanced - All Roles */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Tracks I Advanced</h2>
          <div className="bg-gray-900/30 rounded-lg border border-gray-800/50 overflow-hidden">
            <div
              style={{ gridTemplateColumns: getGridTemplate() }}
              className="grid gap-4 px-4 py-2 bg-gray-900/40 border-b border-gray-800/50 text-sm font-semibold text-gray-400 uppercase items-center"
            >
              <ResizableColumnHeader
                onResize={(width) => handleResize(0, width)}
                minWidth={minWidths[0]}
              >
                <div className="text-center">Link</div>
              </ResizableColumnHeader>
              <ResizableColumnHeader
                onResize={(width) => handleResize(1, width)}
                minWidth={minWidths[1]}
              >
                <div className="text-center">Watch</div>
              </ResizableColumnHeader>
              <ResizableColumnHeader
                onResize={(width) => handleResize(2, width)}
                minWidth={minWidths[2]}
              >
                <div className="text-left">Artist / Title</div>
              </ResizableColumnHeader>
              <ResizableColumnHeader
                onResize={(width) => handleResize(3, width)}
                minWidth={minWidths[3]}
              >
                <div className="text-center">Genre</div>
              </ResizableColumnHeader>
              <ResizableColumnHeader
                onResize={(width) => handleResize(4, width)}
                minWidth={minWidths[4]}
              >
                <div className="text-center">BPM</div>
              </ResizableColumnHeader>
              <ResizableColumnHeader
                onResize={(width) => handleResize(5, width)}
                minWidth={minWidths[5]}
              >
                <div className="text-center">Energy</div>
              </ResizableColumnHeader>
              <ResizableColumnHeader
                onResize={(width) => handleResize(6, width)}
                minWidth={minWidths[6]}
                isLast={true}
              >
                <div className="text-center">Votes</div>
              </ResizableColumnHeader>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {advancedTracks.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-500">
                  <p>No tracks advanced yet</p>
                </div>
              ) : (
                advancedTracks.map((track) => (
                  <TrackRow key={track.id} track={track} useGridTemplate={true} columnWidths={columnWidths} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Team Overview - Managers Only */}
        {isManager && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Users size={24} className="text-gray-300" />
              Team Overview
            </h2>
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-6 border border-gray-800">
              <p className="text-gray-400 mb-4">View your team's activity status and login status.</p>
              <div className="space-y-3">
                {/* This would show a list of Scouts with their activity status */}
                <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-800/50">
                  <p className="text-gray-300 text-sm">Team member list would appear here</p>
                  <p className="text-gray-500 text-xs mt-2">Feature requires additional Supabase queries</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  )
}

export default StaffAdmin
