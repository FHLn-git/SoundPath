import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Plus,
  Package,
  Package2,
  Network,
  Inbox,
  Building2,
  MoveRight,
  X,
  Send,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useBilling } from '../context/BillingContext'
import { supabase } from '../lib/supabaseClient'
import AddDemoModal from '../components/AddDemoModal'
import GlobalIntakeDropdown from '../components/GlobalIntakeDropdown'
import TrackRow from '../components/TrackRow'
import Toast from '../components/Toast'
import UpgradeOverlay from '../components/UpgradeOverlay'
import CapacityOverlay from '../components/CapacityOverlay'
import { useApp } from '../context/AppContext'

const PersonalOffice = () => {
  const navigate = useNavigate()
  const { staffProfile, memberships, activeOrgId, isSystemAdmin } = useAuth()
  const { hasFeature, plan } = useBilling()
  const { GENRES, addTrack, loadTracks } = useApp()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' })
  const [showUpgradeOverlay, setShowUpgradeOverlay] = useState(false)
  const [hasPersonalInboxAccess, setHasPersonalInboxAccess] = useState(false)

  // Capacity check state
  const [capacityCheck, setCapacityCheck] = useState(null)
  const [showCapacityOverlay, setShowCapacityOverlay] = useState(false)
  const [capacityLock, setCapacityLock] = useState(false)
  const [promoteCapacityCheck, setPromoteCapacityCheck] = useState(null)
  const [showPromoteCapacityOverlay, setShowPromoteCapacityOverlay] = useState(false)

  // Quad-Crate state
  const [submissionsTracks, setSubmissionsTracks] = useState([])
  const [networkTracks, setNetworkTracks] = useState([])
  const [crate1Tracks, setCrate1Tracks] = useState([])
  const [crate2Tracks, setCrate2Tracks] = useState([])
  const [activeCrate, setActiveCrate] = useState('submissions')

  // Promote to Label modal
  const [showMoveToLabelModal, setShowMoveToLabelModal] = useState({ isOpen: false, track: null })

  // Check personal inbox access
  // CRITICAL: System admins must have full access to all features, bypassing all restrictions
  useEffect(() => {
    const checkAccess = async () => {
      // Check system admin status with fallback - check both isSystemAdmin and staffProfile.role
      const userIsSystemAdmin = Boolean(isSystemAdmin || staffProfile?.role === 'SystemAdmin')

      // System admins always have access to everything
      if (userIsSystemAdmin) {
        setHasPersonalInboxAccess(true)
        return
      }

      if (activeOrgId === null) {
        // Personal view - check if user has personal inbox feature
        // For personal inbox, we need to check the user's personal organization or free plan
        const access = await hasFeature('personal_inbox')
        setHasPersonalInboxAccess(access)
      } else {
        // Label view - personal inbox is not applicable in label workspace
        setHasPersonalInboxAccess(false)
      }
    }
    if (staffProfile) {
      checkAccess()
    }
  }, [activeOrgId, staffProfile, hasFeature, isSystemAdmin])

  // Load personal tracks (organization_id IS NULL, recipient_user_id = current user) - only if user has access
  useEffect(() => {
    const loadPersonalTracks = async () => {
      if (!supabase || !staffProfile || !hasPersonalInboxAccess || activeOrgId !== null) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('tracks')
          .select(
            `
            *,
            artists (
              name
            ),
            sender:staff_members!tracks_sender_id_fkey (
              id,
              name
            )
          `
          )
          .eq('recipient_user_id', staffProfile.id)
          .is('organization_id', null)
          .eq('archived', false)
          .order('created_at', { ascending: false })

        if (error) throw error

        // Transform tracks to match app format
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

        // Separate into crates (exclude pitched and signed tracks)
        setSubmissionsTracks(
          transformedTracks.filter(
            t =>
              t.source === 'public_form' &&
              !t.peer_to_peer &&
              t.crate !== 'pitched' &&
              t.crate !== 'signed' &&
              !t.contractSigned
          )
        )
        setNetworkTracks(
          transformedTracks.filter(
            t =>
              (t.crate === 'network' || t.peer_to_peer) &&
              t.crate !== 'pitched' &&
              t.crate !== 'signed' &&
              !t.contractSigned
          )
        )
        setCrate1Tracks(
          transformedTracks.filter(
            t =>
              (t.crate === 'crate_a' || t.crate === 'crate_1') &&
              t.crate !== 'pitched' &&
              t.crate !== 'signed' &&
              !t.contractSigned
          )
        )
        setCrate2Tracks(
          transformedTracks.filter(
            t =>
              (t.crate === 'crate_b' || t.crate === 'crate_2') &&
              t.crate !== 'pitched' &&
              t.crate !== 'signed' &&
              !t.contractSigned
          )
        )
      } catch (error) {
        console.error('Error loading personal tracks:', error)
        setToast({
          isVisible: true,
          message: 'Failed to load tracks',
          type: 'error',
        })
      } finally {
        setLoading(false)
      }
    }

    loadPersonalTracks()
  }, [staffProfile, hasPersonalInboxAccess, activeOrgId])

  // Capacity lock (data retention): if user is Free and over the limit, lock UI until upgrade or deletions.
  useEffect(() => {
    const checkCapacityLock = async () => {
      if (!supabase || !staffProfile || activeOrgId !== null) return
      try {
        const { data, error } = await supabase.rpc('check_track_capacity', {
          user_id_param: staffProfile.id,
          org_id_param: null,
        })
        if (error) throw error

        const current = data?.current_count ?? 0
        const max = data?.max_count ?? 0
        const tier = data?.tier || 'free'
        const overCapacity = tier === 'free' && max > 0 && current > max

        if (overCapacity) {
          setCapacityCheck(data)
          setCapacityLock(true)
          setShowCapacityOverlay(true)
        } else {
          setCapacityLock(false)
        }
      } catch (e) {
        console.error('Error checking personal capacity lock:', e)
      }
    }

    checkCapacityLock()
  }, [staffProfile?.id, activeOrgId])

  // Get current crate tracks
  const currentCrateTracks = useMemo(() => {
    switch (activeCrate) {
      case 'submissions':
        return submissionsTracks
      case 'network':
        return networkTracks
      case 'crate_1':
        return crate1Tracks
      case 'crate_2':
        return crate2Tracks
      default:
        return submissionsTracks
    }
  }, [activeCrate, submissionsTracks, networkTracks, crate1Tracks, crate2Tracks])

  // Handle pitching track
  const handlePitchTrack = async trackId => {
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
        .select(
          `
          *,
          artists (
            name
          ),
          sender:staff_members!tracks_sender_id_fkey (
            id,
            name
          )
        `
        )
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

      setSubmissionsTracks(
        transformedTracks.filter(
          t =>
            t.source === 'public_form' &&
            !t.peer_to_peer &&
            t.crate !== 'pitched' &&
            t.crate !== 'signed' &&
            !t.contractSigned
        )
      )
      setNetworkTracks(
        transformedTracks.filter(
          t =>
            (t.crate === 'network' || t.peer_to_peer) &&
            t.crate !== 'pitched' &&
            t.crate !== 'signed' &&
            !t.contractSigned
        )
      )
      setCrate1Tracks(
        transformedTracks.filter(
          t =>
            (t.crate === 'crate_a' || t.crate === 'crate_1') &&
            t.crate !== 'pitched' &&
            t.crate !== 'signed' &&
            !t.contractSigned
        )
      )
      setCrate2Tracks(
        transformedTracks.filter(
          t =>
            (t.crate === 'crate_b' || t.crate === 'crate_2') &&
            t.crate !== 'pitched' &&
            t.crate !== 'signed' &&
            !t.contractSigned
        )
      )
    } catch (error) {
      console.error('Error pitching track:', error)
      setToast({
        isVisible: true,
        message: error.message || 'Failed to pitch track',
        type: 'error',
      })
    }
  }

  // Check capacity before adding demo
  const checkCapacityBeforeAdd = async () => {
    if (!supabase || !staffProfile) return false

    try {
      const { data, error } = await supabase.rpc('check_track_capacity', {
        user_id_param: staffProfile.id,
        org_id_param: null,
      })

      if (error) throw error

      if (data && !data.can_add) {
        setCapacityCheck(data)
        setShowCapacityOverlay(true)
        return false
      }

      return true
    } catch (error) {
      console.error('Error checking capacity:', error)
      setToast({
        isVisible: true,
        message: 'Error checking capacity. Please try again.',
        type: 'error',
      })
      return false
    }
  }

  // Check capacity before promoting to label
  const checkCapacityBeforePromote = async orgId => {
    if (!supabase || !staffProfile) return false

    try {
      const { data, error } = await supabase.rpc('check_track_capacity', {
        user_id_param: staffProfile.id,
        org_id_param: orgId,
      })

      if (error) throw error

      if (data && !data.can_add) {
        setPromoteCapacityCheck(data)
        setShowPromoteCapacityOverlay(true)
        return false
      }

      return true
    } catch (error) {
      console.error('Error checking capacity:', error)
      setToast({
        isVisible: true,
        message: 'Error checking capacity. Please try again.',
        type: 'error',
      })
      return false
    }
  }

  // Handle moving track to label
  const handleMoveToLabel = async (trackId, orgId) => {
    if (!supabase || !staffProfile) return

    // Check capacity before promoting
    const canPromote = await checkCapacityBeforePromote(orgId)
    if (!canPromote) {
      return
    }

    try {
      const { error } = await supabase
        .from('tracks')
        .update({
          organization_id: orgId,
          recipient_user_id: null, // Remove personal inbox assignment
          // Artist Relations Tracker (Agent privacy + network rollups):
          // stamp who pitched/promoted this track into the label workspace
          sender_id: staffProfile.id,
          peer_to_peer: true,
        })
        .eq('id', trackId)

      if (error) throw error

      setToast({
        isVisible: true,
        message: 'Track moved to label successfully!',
        type: 'success',
      })

      setShowMoveToLabelModal({ isOpen: false, track: null })

      // Reload personal tracks
      const { data } = await supabase
        .from('tracks')
        .select(
          `
          *,
          artists (
            name
          ),
          sender:staff_members!tracks_sender_id_fkey (
            id,
            name
          )
        `
        )
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
      }))

      setSubmissionsTracks(
        transformedTracks.filter(
          t =>
            t.source === 'public_form' &&
            !t.peer_to_peer &&
            t.crate !== 'pitched' &&
            t.crate !== 'signed' &&
            !t.contractSigned
        )
      )
      setNetworkTracks(
        transformedTracks.filter(
          t =>
            (t.crate === 'network' || t.peer_to_peer) &&
            t.crate !== 'pitched' &&
            t.crate !== 'signed' &&
            !t.contractSigned
        )
      )
      setCrate1Tracks(
        transformedTracks.filter(
          t =>
            (t.crate === 'crate_a' || t.crate === 'crate_1') &&
            t.crate !== 'pitched' &&
            t.crate !== 'signed' &&
            !t.contractSigned
        )
      )
      setCrate2Tracks(
        transformedTracks.filter(
          t =>
            (t.crate === 'crate_b' || t.crate === 'crate_2') &&
            t.crate !== 'pitched' &&
            t.crate !== 'signed' &&
            !t.contractSigned
        )
      )
    } catch (error) {
      console.error('Error moving track to label:', error)
      setToast({
        isVisible: true,
        message: error.message || 'Failed to move track',
        type: 'error',
      })
    }
  }

  const crateConfig = [
    {
      id: 'submissions',
      title: 'Submissions',
      icon: Inbox,
      count: submissionsTracks.length,
      color: 'purple',
    },
    { id: 'network', title: 'Network', icon: Network, count: networkTracks.length, color: 'blue' },
    { id: 'crate_1', title: 'Crate A', icon: Package, count: crate1Tracks.length, color: 'green' },
    {
      id: 'crate_2',
      title: 'Crate B',
      icon: Package2,
      count: crate2Tracks.length,
      color: 'yellow',
    },
  ]

  const getCrateColorClasses = color => {
    const colors = {
      purple: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
      blue: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
      green: 'bg-green-500/20 border-green-500/30 text-green-400',
      yellow: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
    }
    return colors[color] || colors.purple
  }

  // Show upgrade overlay if no access
  if (!hasPersonalInboxAccess && activeOrgId === null) {
    return (
      <>
        <div className="flex flex-col bg-[#0B0E14] min-h-screen items-center justify-center p-10">
          <div className="text-center max-w-md">
            <h1 className="text-3xl font-bold text-white mb-4">Personal A&R Office</h1>
            <p className="text-gray-400 mb-6">
              Personal Inbox is available on Agent tier and above. Upgrade to unlock this feature.
            </p>
            <button
              onClick={() => navigate('/billing')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg text-white font-semibold transition-all"
            >
              View Plans
            </button>
          </div>
        </div>
        <UpgradeOverlay
          isOpen={showUpgradeOverlay}
          onClose={() => setShowUpgradeOverlay(false)}
          featureName="Personal Inbox"
          planName="Agent"
        />
      </>
    )
  }

  return (
    <div className="flex flex-col bg-[#0B0E14] min-h-screen relative">
      <UpgradeOverlay
        isOpen={showUpgradeOverlay}
        onClose={() => setShowUpgradeOverlay(false)}
        featureName="Personal Inbox"
        planName="Agent"
      />
      {/* Capacity lock overlay (Free tier over-limit) */}
      {capacityLock && capacityCheck && (
        <CapacityOverlay
          isOpen={true}
          onClose={() => {}}
          currentCount={capacityCheck.current_count || 0}
          maxCount={capacityCheck.max_count || 0}
          tier={capacityCheck.tier || 'free'}
          featureName="tracks"
        />
      )}
      {/* Header */}
      <div className="p-3 border-b border-gray-800 bg-[#0B0E14]/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Personal A&R Office</h1>
          <div className="relative">
            <GlobalIntakeDropdown
              buttonLabel="Add submission"
              manualAddDisabled={capacityLock}
              manualAddDisabledReason="Limit reached"
              onManualAdd={async () => {
                if (capacityLock) return
                const canAdd = await checkCapacityBeforeAdd()
                if (canAdd) {
                  setIsModalOpen(true)
                }
              }}
            />
            {showCapacityOverlay && capacityCheck && !capacityLock && (
              <CapacityOverlay
                isOpen={showCapacityOverlay}
                onClose={() => {
                  if (!capacityLock) setShowCapacityOverlay(false)
                }}
                currentCount={capacityCheck.current_count || 0}
                maxCount={capacityCheck.max_count || 0}
                tier={capacityCheck.tier || 'free'}
                featureName="tracks"
              />
            )}
          </div>
        </div>
      </div>

      {/* Quad-Crate Inbox */}
      <div className="p-4 bg-[#0B0E14]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/50 rounded-lg p-4 border border-gray-800 backdrop-blur-sm"
        >
          <h2 className="text-lg font-bold text-white mb-4">Personal Crates</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {crateConfig.map(crate => (
              <motion.button
                key={crate.id}
                type="button"
                onClick={() => setActiveCrate(crate.id)}
                className={`p-4 rounded-lg border transition-all text-center ${
                  activeCrate === crate.id
                    ? `${getCrateColorClasses(crate.color)} border-opacity-60`
                    : 'bg-gray-900/30 border-gray-800 hover:bg-gray-900/50 hover:border-gray-700'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="flex items-center justify-center mb-2">
                  <crate.icon
                    size={24}
                    className={activeCrate === crate.id ? '' : 'text-gray-400'}
                  />
                </div>
                <p
                  className={`font-semibold mb-1 ${activeCrate === crate.id ? '' : 'text-gray-300'}`}
                >
                  {crate.title}
                </p>
                <p
                  className={`text-2xl font-bold ${activeCrate === crate.id ? '' : 'text-gray-400'}`}
                >
                  {crate.count}
                </p>
              </motion.button>
            ))}
          </div>

          {/* Track List for Active Crate */}
          <div className="mt-4">
            <h3 className="text-md font-semibold text-white mb-3">
              {crateConfig.find(c => c.id === activeCrate)?.title} ({currentCrateTracks.length}{' '}
              tracks)
            </h3>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-400">Loading tracks...</p>
              </div>
            ) : currentCrateTracks.length === 0 ? (
              <div className="text-center py-8 bg-gray-900/30 rounded-lg border border-gray-800">
                <p className="text-gray-500">No tracks in this crate</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {currentCrateTracks.map(track => (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-900/30 rounded-lg border border-gray-800 p-3 hover:bg-gray-900/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white font-semibold truncate">{track.artist}</p>
                          <span className="text-gray-600">•</span>
                          <p className="text-gray-400 text-sm truncate">{track.title}</p>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          {track.genre && <p className="text-gray-500 text-xs">{track.genre}</p>}
                          {track.bpm && <p className="text-gray-600 text-xs">{track.bpm} BPM</p>}
                          {track.sender && (
                            <div className="flex items-center gap-1">
                              <Network size={12} className="text-blue-400" />
                              <p className="text-blue-400 text-xs">From {track.sender.name}</p>
                            </div>
                          )}
                          <p className="text-gray-600 text-xs">
                            {new Date(track.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {track.link && (
                          <a
                            href={track.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs font-semibold text-white transition-colors"
                          >
                            Listen
                          </a>
                        )}
                        <button
                          onClick={() => handlePitchTrack(track.id)}
                          className="px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 rounded text-xs font-semibold text-orange-400 transition-colors flex items-center gap-1.5"
                          title="Pitch Track"
                        >
                          <Send size={14} />
                          Pitch
                        </button>
                        {memberships && memberships.length > 0 && (
                          <div className="relative">
                            <button
                              onClick={async () => {
                                // Check capacity for the first available label
                                const firstOrgId = memberships[0]?.organization_id
                                if (firstOrgId) {
                                  const canPromote = await checkCapacityBeforePromote(firstOrgId)
                                  if (canPromote) {
                                    setShowMoveToLabelModal({ isOpen: true, track })
                                  }
                                } else {
                                  setShowMoveToLabelModal({ isOpen: true, track })
                                }
                              }}
                              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs font-semibold text-white transition-colors flex items-center gap-1.5 relative"
                              title="Promote to Label"
                            >
                              <Building2 size={14} />
                              Promote
                            </button>
                            {showPromoteCapacityOverlay && promoteCapacityCheck && (
                              <CapacityOverlay
                                isOpen={showPromoteCapacityOverlay}
                                onClose={() => setShowPromoteCapacityOverlay(false)}
                                currentCount={promoteCapacityCheck.current_count || 0}
                                maxCount={promoteCapacityCheck.max_count || 0}
                                tier={promoteCapacityCheck.tier || 'free'}
                                featureName="label tracks"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Add Demo Modal */}
      <AddDemoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={async data => {
          try {
            // Add track directly to Supabase for personal office
            if (supabase && staffProfile) {
              // Check capacity again before adding (in case it changed)
              const canAdd = await checkCapacityBeforeAdd()
              if (!canAdd) {
                setIsModalOpen(false)
                return
              }

              // First, find or create artist
              let artistId = null
              const { data: existingArtist } = await supabase
                .from('artists')
                .select('id')
                .eq('name', data.artist)
                .is('organization_id', null)
                .limit(1)
                .single()

              if (existingArtist) {
                artistId = existingArtist.id
              } else {
                const { data: newArtist, error: artistError } = await supabase
                  .from('artists')
                  .insert({
                    name: data.artist,
                    organization_id: null, // Personal artist
                  })
                  .select('id')
                  .single()

                if (artistError) throw artistError
                artistId = newArtist.id
              }

              // Create track
              const { error: trackError } = await supabase.from('tracks').insert({
                artist_id: artistId,
                artist_name: data.artist,
                title: data.title,
                sc_link: data.link || '',
                genre: data.genre || data.vibe || GENRES[0],
                bpm: parseInt(data.bpm) || 128,
                status: 'inbox',
                column: 'inbox',
                organization_id: null,
                recipient_user_id: staffProfile.id,
                crate: 'submissions',
                source: 'manual',
              })

              if (trackError) throw trackError

              // Reload tracks
              const { data: tracksData } = await supabase
                .from('tracks')
                .select(
                  `
                  *,
                  artists (
                    name
                  ),
                  sender:staff_members!tracks_sender_id_fkey (
                    id,
                    name
                  )
                `
                )
                .eq('recipient_user_id', staffProfile.id)
                .is('organization_id', null)
                .eq('archived', false)
                .order('created_at', { ascending: false })

              const transformedTracks = (tracksData || []).map(track => ({
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
              }))

              setSubmissionsTracks(
                transformedTracks.filter(
                  t =>
                    t.source === 'public_form' &&
                    !t.peer_to_peer &&
                    t.crate !== 'pitched' &&
                    t.crate !== 'signed' &&
                    !t.contractSigned
                )
              )
              setNetworkTracks(
                transformedTracks.filter(
                  t =>
                    (t.crate === 'network' || t.peer_to_peer) &&
                    t.crate !== 'pitched' &&
                    t.crate !== 'signed' &&
                    !t.contractSigned
                )
              )
              setCrate1Tracks(
                transformedTracks.filter(
                  t =>
                    (t.crate === 'crate_a' || t.crate === 'crate_1') &&
                    t.crate !== 'pitched' &&
                    t.crate !== 'signed' &&
                    !t.contractSigned
                )
              )
              setCrate2Tracks(
                transformedTracks.filter(
                  t =>
                    (t.crate === 'crate_b' || t.crate === 'crate_2') &&
                    t.crate !== 'pitched' &&
                    t.crate !== 'signed' &&
                    !t.contractSigned
                )
              )
            }
            setIsModalOpen(false)
            setToast({
              isVisible: true,
              message: 'Track added successfully',
              type: 'success',
            })
          } catch (error) {
            console.error('Error adding track:', error)
            setToast({
              isVisible: true,
              message: error.message || 'Failed to add track',
              type: 'error',
            })
          }
        }}
        vibeTags={GENRES}
      />

      {/* Move to Label Modal */}
      {showMoveToLabelModal.isOpen && showMoveToLabelModal.track && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900/95 border border-gray-700 rounded-lg p-6 w-full max-w-md backdrop-blur-sm"
          >
            <h3 className="text-lg font-bold text-white mb-3">
              Promote "{showMoveToLabelModal.track.title}" to Label
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              Select which label to promote this track to:
            </p>

            <div className="space-y-1.5 mb-4">
              {memberships?.map(membership => (
                <button
                  key={membership.membership_id}
                  onClick={() =>
                    handleMoveToLabel(showMoveToLabelModal.track.id, membership.organization_id)
                  }
                  className="w-full p-2.5 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-left transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-gray-400" />
                    <div>
                      <p className="text-white font-semibold text-sm">
                        {membership.organization_name}
                      </p>
                      <p className="text-xs text-gray-500">{membership.role}</p>
                    </div>
                  </div>
                  <MoveRight
                    size={14}
                    className="text-gray-600 group-hover:text-gray-400 transition-colors"
                  />
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowMoveToLabelModal({ isOpen: false, track: null })}
              className="w-full px-4 py-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-gray-400"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}

      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  )
}

export default PersonalOffice
