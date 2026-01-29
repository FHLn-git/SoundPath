import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Send, Trophy, Calendar, Building2, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useBilling } from '../context/BillingContext'
import { supabase } from '../lib/supabaseClient'
import Toast from '../components/Toast'
import UpgradeOverlay from '../components/UpgradeOverlay'
import PremiumOverlay from '../components/PremiumOverlay'

const PersonalPitched = () => {
  const { staffProfile, activeOrgId, isSystemAdmin } = useAuth()
  const { hasFeature } = useBilling()
  const [loading, setLoading] = useState(true)
  const [pitchedTracks, setPitchedTracks] = useState([])
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' })
  const [showUpgradeOverlay, setShowUpgradeOverlay] = useState(false)
  const [hasPersonalInboxAccess, setHasPersonalInboxAccess] = useState(false)
  const [isFreeTier, setIsFreeTier] = useState(false)
  const [showPitchedToModal, setShowPitchedToModal] = useState({
    isOpen: false,
    track: null,
    pitchedTo: '',
  })
  const [showMarkSignedModal, setShowMarkSignedModal] = useState({
    isOpen: false,
    track: null,
    signingLabel: '',
    releaseDate: '',
  })

  // Personal inbox access: Available to ALL authenticated users in personal view
  useEffect(() => {
    if (staffProfile) {
      // All authenticated users have access to Personal Workspace
      setHasPersonalInboxAccess(activeOrgId === null)
    }
  }, [activeOrgId, staffProfile])

  // Check if user is on free tier (Pitched is available for Agent tier and above)
  useEffect(() => {
    const checkTier = async () => {
      if (!staffProfile || activeOrgId !== null) {
        setIsFreeTier(false)
        return
      }

      const userIsSystemAdmin = Boolean(isSystemAdmin || staffProfile?.role === 'SystemAdmin')
      if (userIsSystemAdmin) {
        setIsFreeTier(false)
        return
      }

      // Check user's tier directly from staff_members table
      // Agent tier and above have access to Pitched view
      if (supabase) {
        try {
          const { data: staffData, error } = await supabase
            .from('staff_members')
            .select('tier')
            .eq('id', staffProfile.id)
            .single()

          if (!error && staffData) {
            const tier = staffData.tier || 'free'
            // Agent, starter, and pro tiers have access
            const hasAccess = tier === 'agent' || tier === 'starter' || tier === 'pro'
            setIsFreeTier(!hasAccess)
          } else {
            // Fallback to network feature check if tier not available
            const networkAccess = await hasFeature('network')
            setIsFreeTier(!networkAccess)
          }
        } catch (error) {
          console.error('Error checking tier:', error)
          // Fallback to network feature check
          const networkAccess = await hasFeature('network')
          setIsFreeTier(!networkAccess)
        }
      }
    }
    if (staffProfile && activeOrgId === null) {
      checkTier()
    }
  }, [staffProfile, activeOrgId, hasFeature, isSystemAdmin, supabase])

  // Load pitched tracks (organization_id IS NULL, recipient_user_id = current user, crate = 'pitched')
  // Available to ALL authenticated users - no feature check needed
  useEffect(() => {
    const loadPitchedTracks = async () => {
      if (!supabase || !staffProfile || activeOrgId !== null) {
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
          .eq('crate', 'pitched')
          .eq('archived', false)
          .order('pitched_at', { ascending: false, nullsLast: true })

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
          pitchedAt: track.pitched_at ? new Date(track.pitched_at) : null,
          pitchedTo: track.pitched_to || '',
        }))

        setPitchedTracks(transformedTracks)
      } catch (error) {
        console.error('Error loading pitched tracks:', error)
        setToast({
          isVisible: true,
          message: 'Failed to load pitched tracks',
          type: 'error',
        })
      } finally {
        setLoading(false)
      }
    }

    loadPitchedTracks()
  }, [staffProfile, activeOrgId])

  // Calculate days since pitch
  const getDaysSincePitch = pitchedAt => {
    if (!pitchedAt) return 'N/A'
    const now = new Date()
    const pitchDate = new Date(pitchedAt)
    const diffTime = Math.abs(now - pitchDate)
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Handle updating pitched_to
  const handleUpdatePitchedTo = async () => {
    if (!supabase || !showPitchedToModal.track) return

    try {
      const { error } = await supabase
        .from('tracks')
        .update({
          pitched_to: showPitchedToModal.pitchedTo,
        })
        .eq('id', showPitchedToModal.track.id)

      if (error) throw error

      setToast({
        isVisible: true,
        message: 'Pitched To updated successfully!',
        type: 'success',
      })

      setShowPitchedToModal({ isOpen: false, track: null, pitchedTo: '' })

      // Reload tracks
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
        .eq('crate', 'pitched')
        .eq('archived', false)
        .order('pitched_at', { ascending: false, nullsLast: true })

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
        pitchedAt: track.pitched_at ? new Date(track.pitched_at) : null,
        pitchedTo: track.pitched_to || '',
      }))

      setPitchedTracks(transformedTracks)
    } catch (error) {
      console.error('Error updating pitched to:', error)
      setToast({
        isVisible: true,
        message: error.message || 'Failed to update',
        type: 'error',
      })
    }
  }

  // Handle marking as signed
  const handleMarkAsSigned = async () => {
    if (!supabase || !showMarkSignedModal.track) return

    try {
      const { error } = await supabase
        .from('tracks')
        .update({
          crate: 'signed',
          contract_signed: true,
          signing_label: showMarkSignedModal.signingLabel,
          release_date: showMarkSignedModal.releaseDate || null,
        })
        .eq('id', showMarkSignedModal.track.id)

      if (error) throw error

      setToast({
        isVisible: true,
        message: 'Track marked as signed!',
        type: 'success',
      })

      setShowMarkSignedModal({ isOpen: false, track: null, signingLabel: '', releaseDate: '' })

      // Reload tracks
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
        .eq('crate', 'pitched')
        .eq('archived', false)
        .order('pitched_at', { ascending: false, nullsLast: true })

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
        pitchedAt: track.pitched_at ? new Date(track.pitched_at) : null,
        pitchedTo: track.pitched_to || '',
      }))

      setPitchedTracks(transformedTracks)
    } catch (error) {
      console.error('Error marking as signed:', error)
      setToast({
        isVisible: true,
        message: error.message || 'Failed to mark as signed',
        type: 'error',
      })
    }
  }

  // No access restrictions - Personal Workspace available to all authenticated users

  return (
    <div className="flex flex-col bg-[#0B0E14] min-h-screen relative">
      <UpgradeOverlay
        isOpen={showUpgradeOverlay}
        onClose={() => setShowUpgradeOverlay(false)}
        featureName="Personal Inbox"
        planName="Agent"
      />
      {/* Header */}
      <div className="p-3 border-b border-gray-800 bg-[#0B0E14]/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Send size={24} className="text-orange-400" />
            <h1 className="text-2xl font-bold text-white">Pitched</h1>
          </div>
          <p className="text-gray-400 text-sm">
            {pitchedTracks.length} {pitchedTracks.length === 1 ? 'track' : 'tracks'} pitched
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 bg-[#0B0E14] relative">
        {/* Premium Overlay for Free Users */}
        {isFreeTier && <PremiumOverlay />}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-400">Loading pitched tracks...</p>
          </div>
        ) : pitchedTracks.length === 0 ? (
          <div className="text-center py-12 bg-gray-900/30 rounded-lg border border-gray-800">
            <Send size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">No pitched tracks yet</p>
            <p className="text-gray-600 text-sm">Tracks you pitch will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 p-3 bg-gray-900/50 rounded-lg border border-gray-800 text-xs font-semibold text-gray-400 mb-2">
              <div className="col-span-3">Track</div>
              <div className="col-span-2">Pitched To</div>
              <div className="col-span-1 text-center">Days Since</div>
              <div className="col-span-2">Genre</div>
              <div className="col-span-1 text-center">BPM</div>
              <div className="col-span-1 text-center">Energy</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Track Rows */}
            {pitchedTracks.map(track => {
              const daysSince = getDaysSincePitch(track.pitchedAt)
              return (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-12 gap-2 p-3 bg-gray-900/30 rounded-lg border border-gray-800 hover:bg-gray-900/50 transition-colors items-center"
                >
                  <div className="col-span-3 min-w-0">
                    <p className="text-white font-semibold truncate">{track.artist}</p>
                    <p className="text-gray-400 text-sm truncate">{track.title}</p>
                  </div>
                  <div className="col-span-2">
                    {track.pitchedTo ? (
                      <p className="text-gray-300 text-sm truncate">{track.pitchedTo}</p>
                    ) : (
                      <button
                        onClick={() =>
                          setShowPitchedToModal({ isOpen: true, track, pitchedTo: '' })
                        }
                        className="text-orange-400 hover:text-orange-300 text-xs underline"
                      >
                        Add Label
                      </button>
                    )}
                  </div>
                  <div className="col-span-1 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        daysSince === 'N/A'
                          ? 'bg-gray-800 text-gray-500'
                          : daysSince < 7
                            ? 'bg-green-500/20 text-green-400'
                            : daysSince < 30
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {daysSince}
                    </span>
                  </div>
                  <div className="col-span-2 text-gray-400 text-sm">{track.genre || 'N/A'}</div>
                  <div className="col-span-1 text-center text-gray-400 text-sm">
                    {track.bpm || 'N/A'}
                  </div>
                  <div className="col-span-1 text-center text-gray-400 text-sm">
                    {track.energy || 'N/A'}
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    {track.link && (
                      <a
                        href={track.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs font-semibold text-white transition-colors"
                      >
                        Listen
                      </a>
                    )}
                    <button
                      onClick={() =>
                        setShowPitchedToModal({
                          isOpen: true,
                          track,
                          pitchedTo: track.pitchedTo || '',
                        })
                      }
                      className="px-2 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs font-semibold text-white transition-colors"
                      title="Edit Pitched To"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        setShowMarkSignedModal({
                          isOpen: true,
                          track,
                          signingLabel: '',
                          releaseDate: '',
                        })
                      }
                      className="px-2 py-1 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 rounded text-xs font-semibold text-yellow-400 transition-colors flex items-center gap-1"
                      title="Mark as Signed"
                    >
                      <Trophy size={12} />
                      Sign
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pitched To Modal */}
      {showPitchedToModal.isOpen && showPitchedToModal.track && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900/95 border border-gray-700 rounded-lg p-6 w-full max-w-md backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Edit Pitched To</h3>
              <button
                onClick={() => setShowPitchedToModal({ isOpen: false, track: null, pitchedTo: '' })}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-2">
              {showPitchedToModal.track.artist} • {showPitchedToModal.track.title}
            </p>
            <input
              type="text"
              value={showPitchedToModal.pitchedTo}
              onChange={e =>
                setShowPitchedToModal({ ...showPitchedToModal, pitchedTo: e.target.value })
              }
              placeholder="Label or person name"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white mb-4 focus:outline-none focus:border-gray-600"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleUpdatePitchedTo}
                className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-white font-semibold transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setShowPitchedToModal({ isOpen: false, track: null, pitchedTo: '' })}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-400"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Mark as Signed Modal */}
      {showMarkSignedModal.isOpen && showMarkSignedModal.track && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900/95 border border-gray-700 rounded-lg p-6 w-full max-w-md backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Mark as Signed</h3>
              <button
                onClick={() =>
                  setShowMarkSignedModal({
                    isOpen: false,
                    track: null,
                    signingLabel: '',
                    releaseDate: '',
                  })
                }
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              {showMarkSignedModal.track.artist} • {showMarkSignedModal.track.title}
            </p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Signing Label</label>
                <input
                  type="text"
                  value={showMarkSignedModal.signingLabel}
                  onChange={e =>
                    setShowMarkSignedModal({ ...showMarkSignedModal, signingLabel: e.target.value })
                  }
                  placeholder="Label name"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-600"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Release Date (optional)</label>
                <input
                  type="date"
                  value={showMarkSignedModal.releaseDate}
                  onChange={e =>
                    setShowMarkSignedModal({ ...showMarkSignedModal, releaseDate: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-600"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleMarkAsSigned}
                className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white font-semibold transition-colors"
              >
                Mark as Signed
              </button>
              <button
                onClick={() =>
                  setShowMarkSignedModal({
                    isOpen: false,
                    track: null,
                    signingLabel: '',
                    releaseDate: '',
                  })
                }
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-400"
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
    </div>
  )
}

export default PersonalPitched
