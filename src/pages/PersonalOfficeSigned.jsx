import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Building2, Calendar, TrendingUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Toast from '../components/Toast'

const PersonalOfficeSigned = () => {
  const { staffProfile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [signedTracks, setSignedTracks] = useState([])
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' })

  // Load signed tracks - tracks where contract_signed = true
  // These are tracks that were originally in the agent's personal office (organization_id IS NULL, recipient_user_id = user)
  // OR tracks where the agent was the sender (sender_id = user)
  useEffect(() => {
    const loadSignedTracks = async () => {
      if (!supabase || !staffProfile) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        // Get tracks that were signed and either:
        // 1. Originally in personal office (recipient_user_id = user, organization_id IS NULL initially, then moved)
        // 2. Or sent by this agent (sender_id = user)
        // For now, we'll get all signed tracks where the agent was involved
        const { data, error } = await supabase
          .from('tracks')
          .select(
            `
            *,
            artists (
              name
            ),
            organizations (
              id,
              name
            )
          `
          )
          .or(`recipient_user_id.eq.${staffProfile.id},sender_id.eq.${staffProfile.id}`)
          .eq('contract_signed', true)
          .eq('archived', false)
          .order('release_date', { ascending: false, nullsLast: true })

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
          releaseDate: track.release_date,
          targetReleaseDate: track.target_release_date,
          organization: track.organizations?.name || 'Unknown Label',
          organizationId: track.organization_id,
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
  }, [staffProfile])

  return (
    <div className="flex flex-col bg-[#0B0E14] min-h-screen">
      {/* Header */}
      <div className="p-3 border-b border-gray-800 bg-[#0B0E14]/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy size={24} className="text-yellow-400" />
            <h1 className="text-2xl font-bold text-white">Signed</h1>
          </div>
          <p className="text-gray-400 text-sm">Your Hall of Fame - Signed Talent</p>
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
              <p className="text-2xl font-bold text-green-400">
                $
                {signedTracks
                  .reduce((sum, t) => sum + (parseFloat(t.totalEarnings) || 0), 0)
                  .toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
              <p className="text-gray-500 text-xs mb-1">Total Plays</p>
              <p className="text-2xl font-bold text-blue-400">
                {signedTracks.reduce((sum, t) => sum + (t.spotifyPlays || 0), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 bg-[#0B0E14]">
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
          <div className="space-y-3">
            {signedTracks.map(track => (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-900/30 rounded-lg border border-yellow-500/20 p-4 hover:bg-gray-900/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy size={16} className="text-yellow-400 flex-shrink-0" />
                      <p className="text-white font-semibold truncate">{track.artist}</p>
                      <span className="text-gray-600">•</span>
                      <p className="text-gray-400 text-sm truncate">{track.title}</p>
                    </div>
                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                      {track.organization && (
                        <div className="flex items-center gap-1.5">
                          <Building2 size={14} className="text-gray-500" />
                          <p className="text-gray-500 text-xs">{track.organization}</p>
                        </div>
                      )}
                      {track.releaseDate && (
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-gray-500" />
                          <p className="text-gray-500 text-xs">
                            Released: {new Date(track.releaseDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {track.totalEarnings > 0 && (
                        <div className="flex items-center gap-1.5">
                          <TrendingUp size={14} className="text-green-400" />
                          <p className="text-green-400 text-xs font-semibold">
                            ${parseFloat(track.totalEarnings).toFixed(2)}
                          </p>
                        </div>
                      )}
                      {track.spotifyPlays > 0 && (
                        <p className="text-blue-400 text-xs">
                          {track.spotifyPlays.toLocaleString()} plays
                        </p>
                      )}
                    </div>
                  </div>
                  {track.link && (
                    <a
                      href={track.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-4 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs font-semibold text-white transition-colors"
                    >
                      Listen
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
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

export default PersonalOfficeSigned
