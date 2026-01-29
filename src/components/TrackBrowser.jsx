import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import TrackRow from './TrackRow'
import { useApp } from '../context/AppContext'

const PHASES = [
  { id: 'inbox', title: 'Inbox' },
  { id: 'second-listen', title: 'Second Listen' },
  { id: 'team-review', title: 'Team Review' },
  { id: 'contracting', title: 'Contracting' },
  { id: 'vault', title: 'The Vault' },
]

const TrackBrowser = ({ searchQuery = '' }) => {
  const { tracks, moveTrack } = useApp()
  const [selectedPhase, setSelectedPhase] = useState(null)

  const handlePhaseClick = phaseId => {
    if (selectedPhase === phaseId) {
      setSelectedPhase(null)
    } else {
      setSelectedPhase(phaseId)
    }
  }

  const handleMove = (trackId, direction) => {
    const track = tracks.find(t => t.id === trackId)
    if (!track) return

    const currentIndex = PHASES.findIndex(p => p.id === track.column)
    if (direction === 'right' && currentIndex < PHASES.length - 1) {
      moveTrack(trackId, PHASES[currentIndex + 1].id)
    } else if (direction === 'left' && currentIndex > 0) {
      moveTrack(trackId, PHASES[currentIndex - 1].id)
    }
  }

  const filteredTracks = selectedPhase ? tracks.filter(t => t.column === selectedPhase) : tracks

  const searchFilteredTracks = searchQuery
    ? filteredTracks.filter(
        t =>
          t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredTracks

  const tracksByPhase = PHASES.reduce((acc, phase) => {
    acc[phase.id] = tracks.filter(t => t.column === phase.id)
    return acc
  }, {})

  return (
    <div className="flex flex-col h-full">
      {/* Phase Headers */}
      <div className="flex gap-2 mb-4 pb-4 border-b border-gray-800/50">
        {PHASES.map(phase => {
          const count = tracksByPhase[phase.id]?.length || 0
          const isSelected = selectedPhase === phase.id

          return (
            <motion.button
              key={phase.id}
              onClick={() => handlePhaseClick(phase.id)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                isSelected
                  ? 'bg-neon-purple/30 text-neon-purple border-2 border-neon-purple'
                  : 'bg-gray-900/50 text-gray-300 hover:bg-gray-900/70 border-2 border-transparent'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {phase.title}
              <span className="ml-2 text-xs opacity-75">({count})</span>
            </motion.button>
          )
        })}
        {selectedPhase && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setSelectedPhase(null)}
            className="ml-auto px-3 py-2 rounded-lg bg-recording-red/20 text-recording-red hover:bg-recording-red/30 border border-recording-red/50"
          >
            <X size={16} />
          </motion.button>
        )}
      </div>

      {/* Column Headers */}
      {!selectedPhase && (
        <div className="grid grid-cols-[auto_1fr_120px_100px_100px_120px_100px] gap-4 px-4 py-2 bg-gray-900/30 border-b border-gray-800 text-xs font-semibold text-gray-400 uppercase">
          <div>Link</div>
          <div>Artist / Title</div>
          <div>Genre</div>
          <div>BPM</div>
          <div>Energy</div>
          <div>Votes</div>
        </div>
      )}

      {/* Track List */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {selectedPhase ? (
            <motion.div
              key={selectedPhase}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-1"
            >
              <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm z-10 grid grid-cols-[auto_1fr_120px_100px_100px_120px_100px] gap-4 px-4 py-3 border-b border-gray-800 text-xs font-semibold text-gray-400 uppercase">
                <div>Link</div>
                <div>Artist / Title</div>
                <div>Genre</div>
                <div>BPM</div>
                <div>Energy</div>
                <div>Votes</div>
              </div>
              {searchFilteredTracks.map(track => (
                <TrackRow key={track.id} track={track} onMove={handleMove} showPhaseControls />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="all"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {searchFilteredTracks.map(track => (
                <TrackRow key={track.id} track={track} onMove={handleMove} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {searchFilteredTracks.length === 0 && (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <p>No tracks found</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default TrackBrowser
