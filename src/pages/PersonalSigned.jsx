import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Calendar, Building2, TrendingUp, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useBilling } from '../context/BillingContext'
import { supabase } from '../lib/supabaseClient'
import Toast from '../components/Toast'
import UpgradeOverlay from '../components/UpgradeOverlay'
import PremiumOverlay from '../components/PremiumOverlay'

const PersonalSigned = () => {
  const { staffProfile, activeOrgId, isSystemAdmin } = useAuth()
  const { hasFeature } = useBilling()
  const [loading, setLoading] = useState(true)
  const [signedTracks, setSignedTracks] = useState([])
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' })
  const [showUpgradeOverlay, setShowUpgradeOverlay] = useState(false)
  const [hasPersonalInboxAccess, setHasPersonalInboxAccess] = useState(false)
  const [isFreeTier, setIsFreeTier] = useState(false)
  const [showEditModal, setShowEditModal] = useState({
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

  // Check if user is on free tier (Signed is available for Agent tier and above)
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
      // Agent tier and above have access to Signed view
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

  // Load signed tracks (organization_id IS NULL, recipient_user_id = current user, crate = 'signed' OR contract_signed = true)
  // Available to ALL authenticated users - no feature check needed
  useEffect(() => {
    const loadSignedTracks = async () => {
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
          .eq('archived', false)
          .or('crate.eq.signed,contract_signed.eq.true')
          .order('release_date', { ascending: false, nullsLast: true })
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
          signingLabel: track.signing_label || '',
          releaseDate: track.release_date || null,
          totalEarnings: track.total_earnings || 0,
          spotifyPlays: track.spotify_plays || 0,
        }))

        setSignedTracks(transformedTracks)
      } catch (error) {
        console.error('Error loading signed tracks:', error)
        setToast({
          isVisible: true,
          message: 'Failed to load signed tracks',
          type: 'error',
        })
      } finally {
        setLoading(false)
      }
    }

    loadSignedTracks()
  }, [staffProfile, activeOrgId])

  // Handle updating signed track metadata
  const handleUpdateSignedTrack = async () => {
    if (!supabase || !showEditModal.track) return

    try {
      const { error } = await supabase
        .from('tracks')
        .update({
          signing_label: showEditModal.signingLabel,
          release_date: showEditModal.releaseDate || null,
        })
        .eq('id', showEditModal.track.id)

      if (error) throw error

      setToast({
        isVisible: true,
        message: 'Track updated successfully!',
        type: 'success',
      })

      setShowEditModal({ isOpen: false, track: null, signingLabel: '', releaseDate: '' })

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
        .eq('archived', false)
        .or('crate.eq.signed,contract_signed.eq.true')
        .order('release_date', { ascending: false, nullsLast: true })
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
        signingLabel: track.signing_label || '',
        releaseDate: track.release_date || null,
        totalEarnings: track.total_earnings || 0,
        spotifyPlays: track.spotify_plays || 0,
      }))

      setSignedTracks(transformedTracks)
    } catch (error) {
      console.error('Error updating signed track:', error)
      setToast({
        isVisible: true,
        message: error.message || 'Failed to update',
        type: 'error',
      })
    }
  }

  // Calculate total stats
  const totalEarnings = signedTracks.reduce((sum, t) => sum + (parseFloat(t.totalEarnings) || 0), 0)
  const totalPlays = signedTracks.reduce((sum, t) => sum + (t.spotifyPlays || 0), 0)

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
            <Trophy size={24} className="text-yellow-400" />
            <h1 className="text-2xl font-bold text-white">Signed</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Your Hall of Fame - {signedTracks.length}{' '}
            {signedTracks.length === 1 ? 'track' : 'tracks'} signed
          </p>
        </div>
      </div>

      {/* Stats */}
      {!loading && signedTracks.length > 0 && (
        <div className="p-4 border-b border-gray-800 bg-[#0B0E14]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
              <p className="text-gray-500 text-xs mb-1">Total Signed</p>
              <p className="text-2xl font-bold text-white">{signedTracks.length}</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
              <p className="text-gray-500 text-xs mb-1">Total Earnings</p>
              <p className="text-2xl font-bold text-green-400">${totalEarnings.toFixed(2)}</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
              <p className="text-gray-500 text-xs mb-1">Total Plays</p>
              <p className="text-2xl font-bold text-blue-400">{totalPlays.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 bg-[#0B0E14] relative">
        {/* Premium Overlay for Free Users */}
        {isFreeTier && <PremiumOverlay />}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-400">Loading signed tracks...</p>
          </div>
        ) : signedTracks.length === 0 ? (
          <div className="text-center py-12 bg-gray-900/30 rounded-lg border border-gray-800">
            <Trophy size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">No signed tracks yet</p>
            <p className="text-gray-600 text-sm">Your signed talent will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 p-3 bg-gray-900/50 rounded-lg border border-gray-800 text-xs font-semibold text-gray-400 mb-2">
              <div className="col-span-3">Track</div>
              <div className="col-span-2">Signing Label</div>
              <div className="col-span-2">Release Date</div>
              <div className="col-span-2">Genre</div>
              <div className="col-span-1 text-center">Earnings</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Track Rows */}
            {signedTracks.map(track => (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-12 gap-2 p-3 bg-gray-900/30 rounded-lg border border-yellow-500/20 hover:bg-gray-900/50 transition-colors items-center"
              >
                <div className="col-span-3 min-w-0">
                  <p className="text-white font-semibold truncate">{track.artist}</p>
                  <p className="text-gray-400 text-sm truncate">{track.title}</p>
                </div>
                <div className="col-span-2">
                  {track.signingLabel ? (
                    <div className="flex items-center gap-1">
                      <Building2 size={14} className="text-gray-500" />
                      <p className="text-gray-300 text-sm truncate">{track.signingLabel}</p>
                    </div>
                  ) : (
                    <button
                      onClick={() =>
                        setShowEditModal({
                          isOpen: true,
                          track,
                          signingLabel: '',
                          releaseDate: track.releaseDate || '',
                        })
                      }
                      className="text-yellow-400 hover:text-yellow-300 text-xs underline"
                    >
                      Add Label
                    </button>
                  )}
                </div>
                <div className="col-span-2">
                  {track.releaseDate ? (
                    <div className="flex items-center gap-1">
                      <Calendar size={14} className="text-gray-500" />
                      <p className="text-gray-300 text-sm">
                        {new Date(track.releaseDate).toLocaleDateString()}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() =>
                        setShowEditModal({
                          isOpen: true,
                          track,
                          signingLabel: track.signingLabel || '',
                          releaseDate: '',
                        })
                      }
                      className="text-yellow-400 hover:text-yellow-300 text-xs underline"
                    >
                      Add Date
                    </button>
                  )}
                </div>
                <div className="col-span-2 text-gray-400 text-sm">{track.genre || 'N/A'}</div>
                <div className="col-span-1 text-center">
                  {track.totalEarnings > 0 ? (
                    <div className="flex items-center justify-center gap-1">
                      <TrendingUp size={12} className="text-green-400" />
                      <p className="text-green-400 text-xs font-semibold">
                        ${parseFloat(track.totalEarnings).toFixed(2)}
                      </p>
                    </div>
                  ) : (
                    <span className="text-gray-600 text-xs">—</span>
                  )}
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
                      setShowEditModal({
                        isOpen: true,
                        track,
                        signingLabel: track.signingLabel || '',
                        releaseDate: track.releaseDate || '',
                      })
                    }
                    className="px-2 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs font-semibold text-white transition-colors"
                    title="Edit Details"
                  >
                    Edit
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal.isOpen && showEditModal.track && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900/95 border border-gray-700 rounded-lg p-6 w-full max-w-md backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Edit Signed Track</h3>
              <button
                onClick={() =>
                  setShowEditModal({
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
              {showEditModal.track.artist} • {showEditModal.track.title}
            </p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Signing Label</label>
                <input
                  type="text"
                  value={showEditModal.signingLabel}
                  onChange={e =>
                    setShowEditModal({ ...showEditModal, signingLabel: e.target.value })
                  }
                  placeholder="Label name"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-600"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Release Date</label>
                <input
                  type="date"
                  value={showEditModal.releaseDate}
                  onChange={e =>
                    setShowEditModal({ ...showEditModal, releaseDate: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-600"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleUpdateSignedTrack}
                className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white font-semibold transition-colors"
              >
                Save
              </button>
              <button
                onClick={() =>
                  setShowEditModal({
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

export default PersonalSigned
