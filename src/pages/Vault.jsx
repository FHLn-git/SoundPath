import { useState } from 'react'
import { Search, Eye, Lock } from 'lucide-react'
import LinkShield from '../components/LinkShield'
import EnergyMeter from '../components/EnergyMeter'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useResizableColumns } from '../hooks/useResizableColumns'
import ResizableColumnHeader from '../components/ResizableColumnHeader'

const Vault = () => {
  const { tracks, toggleWatched } = useApp()
  const { canViewMetrics } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const { columnWidths, handleResize, getGridTemplate, minWidths } = useResizableColumns('vault')

  const vaultTracks = tracks
    .filter(
      (t) =>
        t.column === 'vault' &&
        !t.archived &&
        (searchQuery === '' ||
          t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.title.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      if (a.releaseDate && b.releaseDate) {
        return new Date(b.releaseDate) - new Date(a.releaseDate)
      }
      return 0
    })

  const handleWatchToggle = (trackId) => {
    toggleWatched(trackId)
  }

  return (
    <div className="flex flex-col bg-gray-950">
      <div className="pb-6 border-b border-gray-800 bg-gray-950/50 backdrop-blur-sm">
        <h1 className="text-3xl font-bold text-white mb-4">The Vault</h1>
        <div className="relative max-w-[600px]">
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

      <div className="overflow-y-auto p-4">
        <div
          style={{ gridTemplateColumns: getGridTemplate() }}
          className="mb-4 grid gap-4 px-4 py-2 bg-gray-900/40 border-b border-gray-800 text-xs font-semibold text-gray-500 uppercase items-center"
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
            <div className="text-center">Score</div>
          </ResizableColumnHeader>
          <ResizableColumnHeader
            onResize={(width) => handleResize(6, width)}
            minWidth={minWidths[6]}
            isLast={true}
          >
            <div className="text-center">Metrics</div>
          </ResizableColumnHeader>
        </div>

        {vaultTracks.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <p>No tracks in The Vault</p>
          </div>
        ) : (
          vaultTracks.map((track) => (
            <div
              key={track.id}
              style={{ gridTemplateColumns: getGridTemplate() }}
              className="grid gap-4 items-center py-1.5 px-3 hover:bg-gray-900/50 border-b border-gray-800 text-sm font-mono"
            >
              <div className="flex justify-center">
                <LinkShield url={track.link} />
              </div>
              <button
                onClick={() => handleWatchToggle(track.id)}
                className={`p-1.5 rounded transition-colors ${
                  track.watched
                    ? 'text-white hover:bg-gray-800/50'
                    : 'text-gray-500 hover:bg-gray-800/50'
                }`}
                title={track.watched ? 'Watching' : 'Watch'}
              >
                <Eye size={16} fill={track.watched ? 'currentColor' : 'none'} />
              </button>
              <div className="flex flex-col min-w-0">
                <span className="text-white font-semibold truncate">{track.artist}</span>
                <span className="text-gray-400 text-xs truncate">{track.title}</span>
              </div>
              <span className="text-gray-300 truncate text-center">{track.genre}</span>
              <span className="text-gray-300 text-center">{track.bpm || 'N/A'}</span>
              <div className="flex flex-col items-center gap-1">
                <EnergyMeter energy={track.energy || 0} />
                <span
                  className={`text-xs font-semibold ${
                    track.votes > 0
                      ? 'text-green-400'
                      : track.votes < 0
                      ? 'text-red-400'
                      : 'text-gray-400'
                  }`}
                >
                  {track.votes > 0 ? '+' : ''}
                  {track.votes}
                </span>
              </div>
              <div className="flex flex-col items-center gap-1 text-xs">
                {canViewMetrics() ? (
                  <>
                    <span className="text-gray-400">
                      Plays: {track.spotifyPlays ? track.spotifyPlays.toLocaleString() : 'N/A'}
                    </span>
                    <span className="text-green-400">
                      ${((track.totalEarnings || 0)).toLocaleString()}
                    </span>
                  </>
                ) : (
                  <div className="flex items-center gap-1 text-gray-500">
                    <Lock size={12} />
                    <span className="text-xs">Restricted</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Vault
