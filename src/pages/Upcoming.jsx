import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import TrackRow from '../components/TrackRow'
import ConfirmationModal from '../components/ConfirmationModal'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useResizableColumns } from '../hooks/useResizableColumns'
import ResizableColumnHeader from '../components/ResizableColumnHeader'

const Upcoming = () => {
  const { tracks, moveTrack, archiveTrack, getOrganizationSettings } = useApp()
  const { isOwner } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [orgSettings, setOrgSettings] = useState({ require_rejection_reason: true })
  const { columnWidths, handleResize, getGridTemplate, minWidths } = useResizableColumns('upcoming')
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    track: null,
    action: null,
    destination: null,
    isCriticalStage: false,
  })

  // Load organization settings
  useEffect(() => {
    if (getOrganizationSettings) {
      getOrganizationSettings().then(setOrgSettings)
    }
  }, [getOrganizationSettings])

  const upcomingTracks = tracks
    .filter(
      t =>
        t.column === 'upcoming' &&
        !t.archived &&
        (searchQuery === '' ||
          t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.title.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      if (a.releaseDate && b.releaseDate) {
        return new Date(a.releaseDate) - new Date(b.releaseDate)
      }
      return 0
    })

  const handleMove = (trackId, direction) => {
    const track = tracks.find(t => t.id === trackId)
    if (!track) return

    const phases = ['inbox', 'second-listen', 'team-review', 'contracting', 'upcoming', 'vault']
    const currentIndex = phases.indexOf(track.column)
    if (direction === 'right' && currentIndex < phases.length - 1) {
      moveTrack(trackId, phases[currentIndex + 1])
    } else if (direction === 'left' && currentIndex > 0) {
      moveTrack(trackId, phases[currentIndex - 1])
    }
  }

  const handleReject = trackId => {
    const track = tracks.find(t => t.id === trackId)
    if (!track) return

    // Upcoming is always a critical stage
    setConfirmationModal({
      isOpen: true,
      track,
      action: 'reject',
      destination: 'Archive',
      isCriticalStage: true,
    })
  }

  const confirmReject = rejectionReason => {
    if (confirmationModal.track) {
      archiveTrack(confirmationModal.track.id, rejectionReason)
    }
  }

  return (
    <div className="flex flex-col bg-gray-950">
      <div className="p-6 border-b border-gray-800 bg-gray-950/50 backdrop-blur-sm">
        <h1 className="text-3xl font-bold text-white mb-4">Upcoming Releases</h1>
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search by Artist or Title..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-700 font-mono"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div
          style={{ gridTemplateColumns: getGridTemplate() }}
          className="mb-1 grid gap-4 px-4 py-2 bg-gray-900/40 border-b border-gray-800 text-xs font-semibold text-gray-500 uppercase items-center"
        >
          <ResizableColumnHeader onResize={width => handleResize(0, width)} minWidth={minWidths[0]}>
            <div className="text-center">Link</div>
          </ResizableColumnHeader>
          <ResizableColumnHeader onResize={width => handleResize(1, width)} minWidth={minWidths[1]}>
            <div className="text-center">Watch</div>
          </ResizableColumnHeader>
          <ResizableColumnHeader onResize={width => handleResize(2, width)} minWidth={minWidths[2]}>
            <div className="text-left">Artist / Title</div>
          </ResizableColumnHeader>
          <ResizableColumnHeader onResize={width => handleResize(3, width)} minWidth={minWidths[3]}>
            <div className="text-center">Genre</div>
          </ResizableColumnHeader>
          <ResizableColumnHeader onResize={width => handleResize(4, width)} minWidth={minWidths[4]}>
            <div className="text-center">BPM</div>
          </ResizableColumnHeader>
          <ResizableColumnHeader onResize={width => handleResize(5, width)} minWidth={minWidths[5]}>
            <div className="text-center">Release Date / Status</div>
          </ResizableColumnHeader>
          <ResizableColumnHeader
            onResize={width => handleResize(6, width)}
            minWidth={minWidths[6]}
            isLast={true}
          >
            <div className="text-right">Actions</div>
          </ResizableColumnHeader>
        </div>

        {upcomingTracks.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <p>No upcoming releases scheduled</p>
          </div>
        ) : (
          upcomingTracks.map(track => (
            <TrackRow
              key={track.id}
              track={track}
              onMove={handleMove}
              useGridTemplate={true}
              columnWidths={columnWidths}
              showPhaseControls={!!isOwner}
              onReject={isOwner ? handleReject : null}
            />
          ))
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() =>
          setConfirmationModal({
            isOpen: false,
            track: null,
            action: null,
            destination: null,
            isCriticalStage: false,
          })
        }
        onConfirm={confirmReject}
        track={confirmationModal.track}
        action={confirmationModal.action}
        destination={confirmationModal.destination}
        isCriticalStage={confirmationModal.isCriticalStage}
        requireRejectionReason={orgSettings.require_rejection_reason}
      />
    </div>
  )
}

export default Upcoming
