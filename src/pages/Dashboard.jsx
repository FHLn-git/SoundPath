import { motion } from 'framer-motion'
import { Plus, Eye, Calendar, TrendingUp, FileText, Users, Radio, Package, Package2, Inbox, Send, Building2, Network, Crown } from 'lucide-react'
import Toast from '../components/Toast'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useBilling } from '../context/BillingContext'
import AddDemoModal from '../components/AddDemoModal'
import GlobalIntakeDropdown from '../components/GlobalIntakeDropdown'
import GapAlert from '../components/GapAlert'
import StaffingAlert from '../components/StaffingAlert'
import UpgradeOverlay from '../components/UpgradeOverlay'
import PremiumOverlay from '../components/PremiumOverlay'
import CapacityOverlay from '../components/CapacityOverlay'
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const Dashboard = () => {
  const {
    GENRES,
    tracks,
    addTrack,
    getUpcomingReleases,
    getWatchedTracks,
    getQuickStats,
    getStaffActivity,
    getCompanyHealth,
    moveTrack,
  } = useApp()
  const { isOwner, staffProfile, memberships, activeOrgId, isSystemAdmin } = useAuth()
  const { hasFeature } = useBilling()
  
  const activeOrg = memberships?.find(m => m.organization_id === activeOrgId) || null
  const isPersonalView = activeOrgId === null
  const dashboardTitle = isPersonalView ? 'Personal Dashboard' : (activeOrg?.organization_name || 'Dashboard')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [companyHealth, setCompanyHealth] = useState(null)
  const [showUpgradeOverlay, setShowUpgradeOverlay] = useState(false)
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' })
  const [isFreeTier, setIsFreeTier] = useState(false)
  const [hasNetworkAccess, setHasNetworkAccess] = useState(false)
  const [personalCapacityLock, setPersonalCapacityLock] = useState(false)
  const [personalCapacityCheck, setPersonalCapacityCheck] = useState(null)
  const navigate = useNavigate()
  
  // Personal inbox crate state (like Launchpad)
  const [activeCrate, setActiveCrate] = useState('submissions')
  const [submissionsTracks, setSubmissionsTracks] = useState([])
  const [networkTracks, setNetworkTracks] = useState([])
  const [crateATracks, setCrateATracks] = useState([])
  const [crateBTracks, setCrateBTracks] = useState([])
  const [loadingPersonalTracks, setLoadingPersonalTracks] = useState(false)

  const upcomingReleases = getUpcomingReleases()
  const watchedTracks = getWatchedTracks()
  const stats = getQuickStats()
  const activity = getStaffActivity()

  // Get current crate tracks
  const currentCrateTracks = useMemo(() => {
    switch (activeCrate) {
      case 'submissions': return submissionsTracks
      case 'network': return networkTracks
      case 'crate_a': return crateATracks
      case 'crate_b': return crateBTracks
      default: return submissionsTracks
    }
  }, [activeCrate, submissionsTracks, networkTracks, crateATracks, crateBTracks])

  // Check if user is on free tier for personal workspace
  useEffect(() => {
    const checkTier = async () => {
      if (!staffProfile || !isPersonalView) {
        setIsFreeTier(false)
        setHasNetworkAccess(true)
        return
      }

      const userIsSystemAdmin = Boolean(isSystemAdmin || staffProfile?.role === 'SystemAdmin')
      if (userIsSystemAdmin) {
        setIsFreeTier(false)
        setHasNetworkAccess(true)
        return
      }

      // Check if user has network feature access
      const networkAccess = await hasFeature('network')
      setHasNetworkAccess(networkAccess)
      
      // If no network access, user is on free tier
      setIsFreeTier(!networkAccess)
    }
    if (staffProfile && isPersonalView) {
      checkTier()
    }
  }, [staffProfile, isPersonalView, hasFeature, isSystemAdmin])

  // Check if user is on free tier for personal workspace
  useEffect(() => {
    const checkTier = async () => {
      if (!staffProfile || !isPersonalView) {
        setIsFreeTier(false)
        return
      }

      const userIsSystemAdmin = Boolean(isSystemAdmin || staffProfile?.role === 'SystemAdmin')
      if (userIsSystemAdmin) {
        setIsFreeTier(false)
        setHasNetworkAccess(true)
        return
      }

      // Check if user has network feature access
      const networkAccess = await hasFeature('network')
      setHasNetworkAccess(networkAccess)
      
      // If no network access, user is on free tier
      setIsFreeTier(!networkAccess)
    }
    if (staffProfile && isPersonalView) {
      checkTier()
    }
  }, [staffProfile, isPersonalView, hasFeature, isSystemAdmin])

  // Load personal inbox tracks when in personal view (like Launchpad)
  // Available to ALL authenticated users - no feature check needed
  useEffect(() => {
    const loadPersonalInboxTracks = async () => {
      if (!supabase || !staffProfile || !isPersonalView) {
        return
      }

      try {
        setLoadingPersonalTracks(true)
        const { data, error } = await supabase
          .from('tracks')
          .select(`
            *,
            artists (name),
            sender:staff_members!tracks_sender_id_fkey (id, name)
          `)
          .eq('recipient_user_id', staffProfile.id)
          .is('organization_id', null)
          .eq('archived', false)
          .order('created_at', { ascending: false })

        if (error) throw error

        const transformedTracks = (data || []).map(track => ({
          id: track.id,
          title: track.title,
          artist: track.artists?.name || track.artist_name || 'Unknown Artist',
          genre: track.genre,
          bpm: track.bpm,
          energy: track.energy,
          column: track.status || track.column || 'inbox',
          votes: track.votes || 0,
          createdAt: new Date(track.created_at),
          link: track.sc_link || '',
          staffVotes: {},
          archived: false,
          source: track.source || 'manual',
          crate: track.crate || 'submissions',
          peer_to_peer: track.peer_to_peer || false,
          sender: track.sender || null,
          contractSigned: track.contract_signed || false,
        }))

        // Separate into crates (exclude pitched and signed tracks, exactly like PersonalOffice)
        setSubmissionsTracks(transformedTracks.filter(t => t.source === 'public_form' && !t.peer_to_peer && t.crate !== 'pitched' && t.crate !== 'signed' && !t.contractSigned))
        setNetworkTracks(transformedTracks.filter(t => (t.crate === 'network' || t.peer_to_peer) && t.crate !== 'pitched' && t.crate !== 'signed' && !t.contractSigned))
        setCrateATracks(transformedTracks.filter(t => t.crate === 'crate_a' && t.crate !== 'pitched' && t.crate !== 'signed' && !t.contractSigned))
        setCrateBTracks(transformedTracks.filter(t => t.crate === 'crate_b' && t.crate !== 'pitched' && t.crate !== 'signed' && !t.contractSigned))
      } catch (error) {
        console.error('Error loading personal inbox tracks:', error)
      } finally {
        setLoadingPersonalTracks(false)
      }
    }

    if (isPersonalView) {
      loadPersonalInboxTracks()
    }
  }, [staffProfile, isPersonalView])

  // Capacity lock (data retention): if user is Free and over the limit, lock UI until upgrade or deletions.
  useEffect(() => {
    const checkCapacityLock = async () => {
      if (!supabase || !staffProfile || !isPersonalView) return
      try {
        const { data, error } = await supabase.rpc('check_track_capacity', {
          user_id_param: staffProfile.id,
          org_id_param: null,
        })
        if (error) throw error

        const current = data?.current_count ?? 0
        const max = data?.max_count ?? 0
        const tier = data?.tier || 'free'

        // Only hard-lock if they are *over* the free limit (not merely at it)
        const overCapacity = tier === 'free' && max > 0 && current > max
        setPersonalCapacityCheck(data || null)
        setPersonalCapacityLock(overCapacity)
      } catch (e) {
        console.error('Error checking personal capacity lock:', e)
      }
    }

    checkCapacityLock()
  }, [staffProfile?.id, isPersonalView])

  // Load company health for owners (label view only)
  useEffect(() => {
    if (isOwner && getCompanyHealth && !isPersonalView) {
      getCompanyHealth().then(setCompanyHealth)
    }
  }, [isOwner, getCompanyHealth, activeOrgId, isPersonalView])

  // Handle pitching track - available to all users
  const handlePitchTrack = async (trackId) => {
    if (!supabase || !staffProfile) return

    try {
      const { error } = await supabase
        .from('tracks')
        .update({
          crate: 'pitched',
          pitched_at: new Date().toISOString(),
        })
        .eq('id', trackId)

      if (error) throw error

      setToast({
        isVisible: true,
        message: 'Track pitched successfully!',
        type: 'success',
      })

      // Reload personal tracks
      const { data } = await supabase
        .from('tracks')
        .select(`
          *,
          artists (name),
          sender:staff_members!tracks_sender_id_fkey (id, name)
        `)
        .eq('recipient_user_id', staffProfile.id)
        .is('organization_id', null)
        .eq('archived', false)
        .order('created_at', { ascending: false })

      const transformedTracks = (data || []).map(track => ({
        id: track.id,
        title: track.title,
        artist: track.artists?.name || track.artist_name || 'Unknown Artist',
        genre: track.genre,
        bpm: track.bpm,
        energy: track.energy,
        column: track.status || track.column || 'inbox',
        votes: track.votes || 0,
        createdAt: new Date(track.created_at),
        link: track.sc_link || '',
        staffVotes: {},
        archived: false,
        source: track.source || 'manual',
        crate: track.crate || 'submissions',
        peer_to_peer: track.peer_to_peer || false,
        sender: track.sender || null,
        contractSigned: track.contract_signed || false,
      }))

      setSubmissionsTracks(transformedTracks.filter(t => t.source === 'public_form' && !t.peer_to_peer && t.crate !== 'pitched' && t.crate !== 'signed' && !t.contractSigned))
      setNetworkTracks(transformedTracks.filter(t => (t.crate === 'network' || t.peer_to_peer) && t.crate !== 'pitched' && t.crate !== 'signed' && !t.contractSigned))
      setCrateATracks(transformedTracks.filter(t => t.crate === 'crate_a' && t.crate !== 'pitched' && t.crate !== 'signed' && !t.contractSigned))
      setCrateBTracks(transformedTracks.filter(t => t.crate === 'crate_b' && t.crate !== 'pitched' && t.crate !== 'signed' && !t.contractSigned))
    } catch (error) {
      console.error('Error pitching track:', error)
      setToast({
        isVisible: true,
        message: error.message || 'Failed to pitch track',
        type: 'error',
      })
    }
  }

  // EXACT SAME DASHBOARD FOR BOTH PERSONAL AND LABEL VIEW
  return (
    <div className="flex flex-col bg-gray-950 relative">
      {/* Capacity lock overlay (Free tier over-limit) */}
      {isPersonalView && personalCapacityLock && personalCapacityCheck && (
        <CapacityOverlay
          isOpen={true}
          onClose={() => {}}
          currentCount={personalCapacityCheck.current_count || 0}
          maxCount={personalCapacityCheck.max_count || 0}
          tier={personalCapacityCheck.tier || 'free'}
          featureName="tracks"
        />
      )}
      {/* Header */}
      <div className="p-3 border-b border-gray-800 bg-gray-950/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">{dashboardTitle}</h1>
          <GlobalIntakeDropdown
            buttonLabel="Add submission"
            manualAddDisabled={personalCapacityLock}
            manualAddDisabledReason="Limit reached"
            onManualAdd={() => {
              if (!personalCapacityLock) setIsModalOpen(true)
            }}
          />
        </div>
      </div>

      {/* Alerts - Above all widgets - ONLY FOR LABEL VIEW */}
      {!isPersonalView && (
        <div className="px-4 pt-3 space-y-2">
          <GapAlert />
          {isOwner && companyHealth && <StaffingAlert companyHealth={companyHealth} />}
        </div>
      )}

      {/* Widgets Grid */}
      <div className="p-4 bg-gray-950">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
          {/* Close Eye Widget - Top Left */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-1 bg-gray-900/50 rounded-lg p-4 border border-gray-800 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-gray-800/50 rounded-lg border border-gray-700">
                <Eye size={20} className="text-gray-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Close Eye</h2>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {watchedTracks.length === 0 ? (
                <p className="text-gray-500 text-sm">No tracks being watched</p>
              ) : (
                watchedTracks.map((track) => (
                  <div
                    key={track.id}
                    className="p-2 bg-gray-900/30 rounded hover:bg-gray-900/50 transition-colors cursor-pointer border border-gray-800"
                    onClick={(e) => {
                      e.preventDefault()
                      navigate(`/phase/${track.column}`, { state: { scrollToTrackId: track.id } })
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{track.artist}</p>
                        <p className="text-gray-400 text-xs truncate">{track.title}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Upcoming Releases Widget - Top Right */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 bg-gray-900/50 rounded-lg p-4 border border-gray-800 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-green-500/20 rounded-lg border border-green-500/30">
                <Calendar size={20} className="text-green-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Upcoming Releases</h2>
            </div>
            <div className="space-y-2">
              {upcomingReleases.length === 0 ? (
                <p className="text-gray-500 text-sm">No upcoming releases scheduled</p>
              ) : (
                upcomingReleases.map((track) => (
                  <div
                    key={track.id}
                    className="p-2 bg-gray-900/30 rounded hover:bg-gray-900/50 transition-colors border border-gray-800"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold">{track.artist}</p>
                        <p className="text-gray-400 text-sm">{track.title}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          track.targetReleaseDate && !track.contractSigned
                            ? 'text-red-400'
                            : 'text-green-400'
                        }`}>
                          {track.targetReleaseDate
                            ? new Date(track.targetReleaseDate).toLocaleDateString()
                            : 'TBD'}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {track.contractSigned ? 'Signed' : 'Pending'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-900/50 rounded-lg p-4 border border-gray-800 backdrop-blur-sm"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                <FileText size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="text-gray-500 text-xs">Total Tracks</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
            </div>
          </motion.div>

          <motion.button
            type="button"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={(e) => {
              e.preventDefault()
              navigate('/phase/inbox')
            }}
            className="bg-gray-900/50 rounded-lg p-4 border border-gray-800 hover:border-gray-700 transition-all text-left backdrop-blur-sm"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Users size={20} className="text-purple-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">In Pipeline</p>
                <p className="text-2xl font-bold text-white">
                  {stats.secondListen + stats.teamReview + stats.contracting + stats.upcoming}
                </p>
              </div>
            </div>
          </motion.button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-900/50 rounded-lg p-4 border border-gray-800 backdrop-blur-sm"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg border border-green-500/30">
                <TrendingUp size={20} className="text-green-400" />
              </div>
              <div>
                <p className="text-gray-500 text-xs">Activity Status</p>
                <p className="text-2xl font-bold text-white">{activity.status}</p>
              </div>
            </div>
          </motion.div>

          <motion.button
            type="button"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            onClick={(e) => {
              e.preventDefault()
              navigate('/phase/contracting')
            }}
            className="bg-gray-900/50 rounded-lg p-4 border border-gray-800 hover:border-gray-700 transition-all text-left backdrop-blur-sm"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Calendar size={20} className="text-yellow-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">In Contracting</p>
                <p className="text-2xl font-bold text-white">{stats.contracting}</p>
              </div>
            </div>
          </motion.button>
        </div>

        {/* Personal Inbox - EXACTLY LIKE LAUNCHPAD - ONLY FOR PERSONAL VIEW */}
        {isPersonalView && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gray-900/50 rounded-lg p-4 border border-gray-800 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-white">Personal Inbox</h2>
              <span className="text-xs text-gray-400">
                {currentCrateTracks.length} {currentCrateTracks.length === 1 ? 'track' : 'tracks'}
              </span>
            </div>

            {/* Crate Tabs - Quad-Inbox UI - Scrollable on mobile */}
            <div className="flex items-center gap-1 mb-2 bg-gray-900/50 border border-gray-800 rounded-lg p-1 overflow-x-auto scrollbar-hide md:overflow-x-visible">
              <button
                onClick={() => setActiveCrate('submissions')}
                className={`flex-shrink-0 px-2 py-1.5 rounded text-xs font-semibold transition-all flex items-center justify-center gap-1.5 touch-target ${
                  activeCrate === 'submissions'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <Radio size={12} />
                <span className="whitespace-nowrap">SUBMISSIONS ({submissionsTracks.length})</span>
              </button>
              <button
                onClick={() => setActiveCrate('network')}
                className={`flex-shrink-0 px-2 py-1.5 rounded text-xs font-semibold transition-all flex items-center justify-center gap-1.5 relative touch-target ${
                  activeCrate === 'network'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-gray-300'
                } ${!hasNetworkAccess ? 'opacity-60' : ''}`}
                disabled={!hasNetworkAccess}
              >
                <Network size={12} />
                <span className="whitespace-nowrap">NETWORK ({networkTracks.length})</span>
                {!hasNetworkAccess && (
                  <Crown size={10} className="text-yellow-400 ml-1" />
                )}
              </button>
              <button
                onClick={() => setActiveCrate('crate_a')}
                className={`flex-shrink-0 px-2 py-1.5 rounded text-xs font-semibold transition-all flex items-center justify-center gap-1.5 touch-target ${
                  activeCrate === 'crate_a'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <Package size={12} />
                <span className="whitespace-nowrap">CRATE 1 ({crateATracks.length})</span>
              </button>
              <button
                onClick={() => setActiveCrate('crate_b')}
                className={`flex-shrink-0 px-2 py-1.5 rounded text-xs font-semibold transition-all flex items-center justify-center gap-1.5 touch-target ${
                  activeCrate === 'crate_b'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <Package2 size={12} />
                <span className="whitespace-nowrap">CRATE 2 ({crateBTracks.length})</span>
              </button>
            </div>

                {/* Track List - EXACTLY LIKE LAUNCHPAD (organized by phase columns) */}
                <div className="bg-gray-900/40 border border-gray-800 rounded-lg p-2 relative">
                  {/* Premium Overlay for Network Crate */}
                  {activeCrate === 'network' && isFreeTier && (
                    <PremiumOverlay />
                  )}
                  
                  {loadingPersonalTracks ? (
                    <div className="text-center py-8">
                      <p className="text-gray-400">Loading tracks...</p>
                    </div>
                  ) : currentCrateTracks.length === 0 ? (
                    <div className="bg-gray-900/40 border border-gray-800 rounded-lg p-4 text-center">
                      <div>
                        <Inbox size={24} className="text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">No tracks in {activeCrate.replace('_', ' ')}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 w-full max-w-none">
                      {['inbox', 'second-listen', 'team-review', 'contracting', 'upcoming'].map((phase) => {
                        const phaseTracks = currentCrateTracks.filter(t => t.column === phase)
                        return (
                          <div key={phase} className="bg-gray-900/50 rounded p-2 border border-gray-800 flex flex-col h-full">
                            <h3 className="text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider flex-shrink-0">
                              {phase.replace('-', ' ')} ({phaseTracks.length})
                            </h3>
                            <div className="space-y-1 flex-1 overflow-y-auto min-h-0">
                              {phaseTracks.map((track) => (
                                <div
                                  key={track.id}
                                  className="bg-gray-900/60 border border-gray-800 rounded p-1.5 hover:border-gray-700 transition-all cursor-pointer group"
                                >
                                  <div className="flex items-start justify-between mb-0.5">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-white font-semibold text-xs truncate">{track.artist}</p>
                                      <p className="text-gray-500 text-xs truncate">{track.title}</p>
                                      {track.sender && (
                                        <p className="text-blue-400/70 text-xs truncate">From: {track.sender.name}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 mt-1">
                                    {track.link && (
                                      <a
                                        href={track.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-400 hover:text-blue-300 px-1.5 py-0.5 rounded hover:bg-blue-500/10 transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        Listen
                                      </a>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (!isFreeTier) {
                                          handlePitchTrack(track.id)
                                        } else {
                                          navigate('/billing')
                                        }
                                      }}
                                      className={`text-xs px-1.5 py-0.5 rounded transition-colors flex items-center gap-1 ${
                                        isFreeTier
                                          ? 'text-gray-500 cursor-not-allowed opacity-60'
                                          : 'text-orange-400 hover:text-orange-300 hover:bg-orange-500/10'
                                      }`}
                                      title={isFreeTier ? 'Upgrade to Pitch Tracks' : 'Pitch Track'}
                                      disabled={isFreeTier}
                                    >
                                      <Send size={12} />
                                      Pitch
                                      {isFreeTier && <Crown size={10} className="text-yellow-400 ml-0.5" />}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
          </motion.div>
        )}

        {/* Workflow Engine - ONLY FOR LABEL VIEW */}
        {!isPersonalView && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gray-900/50 rounded-lg p-4 border border-gray-800 backdrop-blur-sm"
          >
            <h2 className="text-lg font-bold text-white mb-2">Workflow Engine</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { id: 'inbox', title: 'Inbox', count: stats.inbox },
                { id: 'second-listen', title: 'Second Listen', count: stats.secondListen },
                { id: 'team-review', title: 'The Office', count: stats.teamReview },
                { id: 'contracting', title: 'Contracting', count: stats.contracting },
              ].map((phase) => (
                <motion.button
                  key={phase.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    navigate(`/phase/${phase.id}`)
                  }}
                  className="p-4 bg-gray-900/30 hover:bg-gray-900/50 rounded-lg border border-gray-800 hover:border-gray-700 transition-all text-center"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <p className="text-white font-semibold mb-1">{phase.title}</p>
                  <p className="text-gray-300 text-2xl font-bold">{phase.count}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <AddDemoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={(data) => {
          addTrack(data)
          setIsModalOpen(false)
        }}
        vibeTags={GENRES}
      />

      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  )
}

export default Dashboard
