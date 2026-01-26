import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, Building2, MoveRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Toast from '../components/Toast'

const PersonalOfficeSubmitted = () => {
  const { staffProfile, memberships } = useAuth()
  const [loading, setLoading] = useState(true)
  const [submittedTracks, setSubmittedTracks] = useState([])
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' })
  const [showMoveToLabelModal, setShowMoveToLabelModal] = useState({ isOpen: false, track: null })

  // Load tracks that the agent has sent to external labels
  // These are tracks where sender_id = current user AND organization_id IS NOT NULL
  useEffect(() => {
    const loadSubmittedTracks = async () => {
      if (!supabase || !staffProfile) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('tracks')
          .select(`
            *,
            artists (
              name
            ),
            organizations (
              id,
              name
            )
          `)
          .eq('sender_id', staffProfile.id)
          .not('organization_id', 'is', null)
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
          organization: track.organizations?.name || 'Unknown Label',
          organizationId: track.organization_id,
        }))

        setSubmittedTracks(transformedTracks)
      } catch (error) {
        console.error('Error loading submitted tracks:', error)
        setToast({
          isVisible: true,
          message: 'Failed to load submitted tracks',
          type: 'error',
        })
      } finally {
        setLoading(false)
      }
    }

    loadSubmittedTracks()
  }, [staffProfile])

  return (
    <div className="flex flex-col bg-[#0B0E14] min-h-screen">
      {/* Header */}
      <div className="p-3 border-b border-gray-800 bg-[#0B0E14]/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Send size={24} className="text-white" />
            <h1 className="text-2xl font-bold text-white">Submitted</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Tracks you've sent to external labels
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 bg-[#0B0E14]">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-400">Loading submitted tracks...</p>
          </div>
        ) : submittedTracks.length === 0 ? (
          <div className="text-center py-12 bg-gray-900/30 rounded-lg border border-gray-800">
            <Send size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">No submitted tracks</p>
            <p className="text-gray-600 text-sm">
              Tracks you send to labels will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {submittedTracks.map((track) => (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-900/30 rounded-lg border border-gray-800 p-4 hover:bg-gray-900/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white font-semibold truncate">{track.artist}</p>
                      <span className="text-gray-600">•</span>
                      <p className="text-gray-400 text-sm truncate">{track.title}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      {track.organization && (
                        <div className="flex items-center gap-1.5">
                          <Building2 size={14} className="text-gray-500" />
                          <p className="text-gray-500 text-xs">{track.organization}</p>
                        </div>
                      )}
                      {track.genre && (
                        <p className="text-gray-600 text-xs">{track.genre}</p>
                      )}
                      <p className="text-gray-600 text-xs">
                        {new Date(track.createdAt).toLocaleDateString()}
                      </p>
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

export default PersonalOfficeSubmitted
