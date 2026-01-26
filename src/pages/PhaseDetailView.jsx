import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Search } from 'lucide-react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import TrackRow from '../components/TrackRow'
import ConfirmationModal from '../components/ConfirmationModal'
import ReleaseSetupModal from '../components/ReleaseSetupModal'
import ReviseModal from '../components/ReviseModal'
import Toast from '../components/Toast'
import GapAlert from '../components/GapAlert'
import { useApp } from '../context/AppContext'
import { useResizableColumns } from '../hooks/useResizableColumns'
import ResizableColumnHeader from '../components/ResizableColumnHeader'

const PHASES = [
  { id: 'inbox', title: 'Inbox' },
  { id: 'second-listen', title: 'Second Listen' },
  { id: 'team-review', title: 'The Office' },
  { id: 'contracting', title: 'Contracting' },
]

const PhaseDetailView = () => {
  const { phaseId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { tracks, advanceTrack, archiveTrack, moveTrack, updateTrack, loadTracks, getOrganizationSettings } = useApp()
  const [searchQuery, setSearchQuery] = useState('')
  const { columnWidths, handleResize, getGridTemplate, minWidths } = useResizableColumns(phaseId || 'inbox')
  const trackRefs = useRef({})
  const scrollToTrackId = location.state?.scrollToTrackId
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    track: null,
    action: null,
    destination: null,
    isCriticalStage: false,
  })
  const [orgSettings, setOrgSettings] = useState({ require_rejection_reason: true })
  const [contractUncheckModal, setContractUncheckModal] = useState({ isOpen: false, track: null })
  const [releaseSetupModal, setReleaseSetupModal] = useState({ isOpen: false, track: null })
  const [reviseModal, setReviseModal] = useState({ isOpen: false, track: null })
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'error' })

  // Load organization settings
  useEffect(() => {
    if (getOrganizationSettings) {
      getOrganizationSettings().then(setOrgSettings)
    }
  }, [getOrganizationSettings])

  const currentPhase = PHASES.find((p) => p.id === phaseId) || PHASES[0]
  const phaseTracks = tracks.filter(
    (t) =>
      t.column === phaseId &&
      !t.archived &&
      (searchQuery === '' ||
        t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Scroll to track when navigating from Close Eye widget
  useEffect(() => {
    if (scrollToTrackId && trackRefs.current[scrollToTrackId]) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        trackRefs.current[scrollToTrackId]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
        // Clear the state to prevent re-scrolling on re-renders
        if (location.state?.scrollToTrackId) {
          navigate(location.pathname, { replace: true })
        }
      }, 100)
    }
  }, [scrollToTrackId, location.state, navigate])

  const getNextPhaseName = (currentPhaseId) => {
    const phases = ['inbox', 'second-listen', 'team-review', 'contracting', 'upcoming']
    const phaseNames = ['Inbox', 'Second Listen', 'The Office', 'Contracting', 'Upcoming']
    const currentIndex = phases.indexOf(currentPhaseId)
    if (currentIndex < phases.length - 1) {
      return phaseNames[currentIndex + 1]
    }
    return 'Next Phase'
  }

  const handleAdvance = (trackId) => {
    const track = tracks.find((t) => t.id === trackId)
    if (!track) return

    // Check Energy Gate for Second Listen
    if (track.column === 'second-listen' && (!track.energy || track.energy === 0)) {
      setToast({
        isVisible: true,
        message: 'Please set the Energy Level before advancing to the Office.',
        type: 'error',
      })
      return
    }

    // Team Review -> Contracting pre-flight check
    if (track.column === 'team-review') {
      setReleaseSetupModal({ isOpen: true, track })
      return
    }

    // Contracting -> Upcoming gate
    if (track.column === 'contracting' && !track.contractSigned) {
      setToast({
        isVisible: true,
        message: 'Contract must be signed before scheduling release.',
        type: 'error',
      })
      return
    }

    setConfirmationModal({
      isOpen: true,
      track,
      action: 'advance',
      destination: getNextPhaseName(track.column),
    })
  }

  const handleReleaseSetup = async (track, targetReleaseDate) => {
    try {
      // Update track with target release date
      await updateTrack(track.id, { targetReleaseDate: new Date(targetReleaseDate) })
      
      // Move track to contracting phase
      await moveTrack(track.id, 'contracting')
      
      // Reload tracks to reflect changes
      if (loadTracks) {
        await loadTracks()
      }
      
      // Show success message
      setToast({
        isVisible: true,
        message: `${track.artist} - ${track.title} moved to Contracting`,
        type: 'success',
      })
    } catch (error) {
      console.error('Error in release setup:', error)
      setToast({
        isVisible: true,
        message: `Failed to move track: ${error.message || 'Unknown error'}`,
        type: 'error',
      })
    }
  }

  const handleRevise = (trackId) => {
    const track = tracks.find((t) => t.id === trackId)
    if (!track) return
    setReviseModal({ isOpen: true, track })
  }

  const handleReviseSubmit = (track, data) => {
    console.log('Revise submission:', track, data)
    setToast({
      isVisible: true,
      message: `Revision submitted for ${track.artist} - ${track.title}`,
      type: 'success',
    })
  }

  const handleReject = (trackId) => {
    const track = tracks.find((t) => t.id === trackId)
    if (!track) return

    // Check if this is a critical stage
    const isCriticalStage = ['team-review', 'contracting', 'upcoming'].includes(track.column)

    setConfirmationModal({
      isOpen: true,
      track,
      action: 'reject',
      destination: 'Archive',
      isCriticalStage,
    })
  }

  const confirmAdvance = () => {
    if (confirmationModal.track) {
      const result = advanceTrack(confirmationModal.track.id)
      if (!result.success && result.error) {
        setToast({
          isVisible: true,
          message: result.error,
          type: 'error',
        })
      }
    }
  }

  const confirmReject = (rejectionReason) => {
    if (confirmationModal.track) {
      archiveTrack(confirmationModal.track.id, rejectionReason)
    }
  }

  const handleContractSignedChange = (track, newValue) => {
    // If unchecking (going from true to false), show confirmation
    if (track.contractSigned && !newValue) {
      setContractUncheckModal({ isOpen: true, track })
    } else {
      // If checking (going from false to true), update directly
      updateTrack(track.id, { contractSigned: newValue })
    }
  }

  const confirmContractUncheck = () => {
    if (contractUncheckModal.track) {
      updateTrack(contractUncheckModal.track.id, { contractSigned: false })
      setContractUncheckModal({ isOpen: false, track: null })
    }
  }

  const handleMove = (trackId, direction) => {
    const track = tracks.find((t) => t.id === trackId)
    if (!track) return

    const phases = ['inbox', 'second-listen', 'team-review', 'contracting', 'upcoming', 'vault']
    const currentIndex = phases.indexOf(track.column)
    if (direction === 'right' && currentIndex < phases.length - 1) {
      moveTrack(trackId, phases[currentIndex + 1])
    } else if (direction === 'left' && currentIndex > 0) {
      moveTrack(trackId, phases[currentIndex - 1])
    }
  }

  return (
    <div className="flex flex-col bg-gray-950">
      {/* Header with Phase Tabs */}
      <div className="pb-3 border-b border-gray-800 bg-gray-950/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-2">
          <motion.button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              navigate('/')
            }}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={20} className="text-gray-400" />
          </motion.button>
          <h1 className="text-3xl font-bold text-white">Workflow Engine</h1>
        </div>

        {/* Phase Tabs */}
        <div className="flex gap-2">
          {PHASES.map((phase) => {
            const isActive = phase.id === phaseId
            const count = tracks.filter((t) => t.column === phase.id && !t.archived).length

            return (
              <motion.button
                key={phase.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  navigate(`/phase/${phase.id}`)
                }}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-gray-800 text-white border-2 border-gray-700'
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
        </div>

        {/* Search */}
        <div className="mt-4 relative max-w-[600px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by Artist or Title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-700 font-mono"
          />
        </div>
      </div>

      {/* Gap Alert - Above phase navigation */}
      <div className="px-4 pt-2">
        <GapAlert />
      </div>

      {/* Track List */}
      <div className="overflow-y-auto">
        {(() => {
          const isInbox = phaseId === 'inbox'
          const isSecondListen = phaseId === 'second-listen'
          const isContracting = phaseId === 'contracting'
          const gridStyle = { gridTemplateColumns: getGridTemplate() }

          return (
            <div
              style={gridStyle}
              className="mb-1 grid gap-4 px-4 py-2 bg-gray-900/40 border-b border-gray-800 text-xs font-semibold text-gray-500 uppercase items-center"
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
                {isInbox ? (
                  <div className="text-center">AGE</div>
                ) : isSecondListen ? (
                  <div className="text-center" />
                ) : isContracting ? (
                  <div className="text-center">Signed / Release</div>
                ) : (
                  <div className="text-center">{phaseId === 'team-review' ? 'Energy / Consensus' : 'Energy / Votes'}</div>
                )}
              </ResizableColumnHeader>
              <ResizableColumnHeader
                onResize={(width) => handleResize(6, width)}
                minWidth={minWidths[6]}
                isLast={true}
              >
                <div className="text-right">Actions</div>
              </ResizableColumnHeader>
            </div>
          )
        })()}

        {phaseTracks.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <p>No tracks in {currentPhase.title}</p>
          </div>
        ) : (
          phaseTracks.map((track) => (
            <div
              key={track.id}
              ref={(el) => {
                if (el) trackRefs.current[track.id] = el
              }}
            >
              <TrackRow
                track={track}
                onMove={handleMove}
                showPhaseControls
                onAdvance={handleAdvance}
                onReject={handleReject}
                onRevise={handleRevise}
                columnWidths={columnWidths}
                onContractSignedChange={handleContractSignedChange}
              />
            </div>
          ))
        )}
      </div>

      {/* Confirmation Modal */}
      <ReleaseSetupModal
        isOpen={releaseSetupModal.isOpen}
        onClose={() => setReleaseSetupModal({ isOpen: false, track: null })}
        onConfirm={handleReleaseSetup}
        track={releaseSetupModal.track}
      />

      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() =>
          setConfirmationModal({ isOpen: false, track: null, action: null, destination: null, isCriticalStage: false })
        }
        onConfirm={confirmationModal.action === 'advance' 
          ? () => confirmAdvance() 
          : (reason) => confirmReject(reason)}
        track={confirmationModal.track}
        action={confirmationModal.action}
        destination={confirmationModal.destination}
        isCriticalStage={confirmationModal.isCriticalStage}
        requireRejectionReason={orgSettings.require_rejection_reason}
      />

      {/* Contract Uncheck Confirmation Modal */}
      <ConfirmationModal
        isOpen={contractUncheckModal.isOpen}
        onClose={() => setContractUncheckModal({ isOpen: false, track: null })}
        onConfirm={confirmContractUncheck}
        track={contractUncheckModal.track}
        action="uncheck"
        destination="Uncheck Contract Signed"
      />

      <ReviseModal
        isOpen={reviseModal.isOpen}
        onClose={() => setReviseModal({ isOpen: false, track: null })}
        track={reviseModal.track}
        onSubmit={handleReviseSubmit}
      />

      {/* Toast Notification */}
      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  )
}

export default PhaseDetailView
