import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, TrendingUp, FileCheck, FileText, ChevronDown, Filter, Lock } from 'lucide-react'
import TrackRow from '../components/TrackRow'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useBilling } from '../context/BillingContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { useResizableColumns } from '../hooks/useResizableColumns'
import ResizableColumnHeader from '../components/ResizableColumnHeader'
import UpgradeOverlay from '../components/UpgradeOverlay'

const ArtistDirectory = () => {
  const { getAllArtists, moveTrack, GENRES } = useApp()
  const { canViewMetrics, activeOrgId, isSystemAdmin, staffProfile } = useAuth()
  const { plan } = useBilling()
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedArtist, setSelectedArtist] = useState(null)
  const [sortBy, setSortBy] = useState('submissions-high')
  const [genreFilter, setGenreFilter] = useState('all')
  const [signedOnly, setSignedOnly] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)
  const [showUpgradeOverlay, setShowUpgradeOverlay] = useState(false)
  const navigate = useNavigate()
  const { columnWidths, handleResize, getGridTemplate, minWidths } = useResizableColumns('artists')
  const { columnWidths: detailColumnWidths, handleResize: handleDetailResize, getGridTemplate: getDetailGridTemplate, minWidths: detailMinWidths } = useResizableColumns('artist-detail')

  // Check if user has access - only restrict free tier, allow all paid tiers and system admins
  useEffect(() => {
    const checkAccess = () => {
      // Check system admin status with fallback - check both isSystemAdmin and staffProfile.role
      const userIsSystemAdmin = Boolean(isSystemAdmin || staffProfile?.role === 'SystemAdmin')
      
      // If system admin, always grant access
      if (userIsSystemAdmin) {
        setHasAccess(true)
        setShowUpgradeOverlay(false)
        return
      }
      
      // For non-system admins, check plan tier
      // IMPORTANT: If plan is null (loading), default to allowing access to avoid blocking paid users
      // Only explicitly restrict if plan.id === 'free'
      const isFreeTier = plan?.id === 'free'
      // Grant access to: agent, starter, pro, enterprise tiers, and when plan is loading (null)
      // Only restrict free tier users
      const access = plan === null || !isFreeTier
      setHasAccess(access)
      if (!access) {
        setShowUpgradeOverlay(true)
      }
    }
    checkAccess()
  }, [plan, isSystemAdmin, staffProfile])

  // Handle auto-filter from navigation (e.g., from GapAlert "Fill Gap" button)
  useEffect(() => {
    if (location.state?.autoFilter && location.state?.sortBy) {
      setSortBy(location.state.sortBy)
      // Clear the state to prevent re-applying on re-renders
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, navigate, location.pathname])

  const artists = getAllArtists()

  // Filter and sort artists
  const filteredAndSortedArtists = useMemo(() => {
    let result = [...artists]

    // Search filter
    if (searchQuery) {
      result = result.filter((a) =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Genre filter
    if (genreFilter !== 'all') {
      result = result.filter((a) => a.dominantGenre === genreFilter)
    }

    // Signed only filter
    if (signedOnly) {
      result = result.filter((a) => a.totalSigned > 0)
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'submissions-high':
          return b.totalSubmitted - a.totalSubmitted
        case 'submissions-low':
          return a.totalSubmitted - b.totalSubmitted
        case 'signed-high':
          return b.totalSigned - a.totalSigned
        case 'signed-low':
          return a.totalSigned - b.totalSigned
        case 'conversion-high':
          return parseFloat(b.conversionRate) - parseFloat(a.conversionRate)
        case 'conversion-low':
          return parseFloat(a.conversionRate) - parseFloat(b.conversionRate)
        default:
          return 0
      }
    })

    return result
  }, [artists, searchQuery, genreFilter, signedOnly, sortBy])

  const handleMove = (trackId, direction) => {
    const track = selectedArtist?.tracks.find((t) => t.id === trackId)
    if (!track) return

    const phases = ['inbox', 'second-listen', 'team-review', 'contracting', 'vault']
    const currentIndex = phases.indexOf(track.column)
    if (direction === 'right' && currentIndex < phases.length - 1) {
      moveTrack(trackId, phases[currentIndex + 1])
    } else if (direction === 'left' && currentIndex > 0) {
      moveTrack(trackId, phases[currentIndex - 1])
    }
  }

  if (selectedArtist) {
    return (
      <div className="flex flex-col bg-gray-950">
        <div className="p-4 border-b border-gray-800 bg-gray-950/50 backdrop-blur-sm">
          <button
            onClick={() => setSelectedArtist(null)}
            className="mb-2 text-gray-400 hover:text-gray-300 transition-colors text-sm"
          >
            ← Back to Directory
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">{selectedArtist.name}</h1>
              <div className="flex gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-green-400" />
                  <span className="text-gray-400">Conversion Rate:</span>
                  {canViewMetrics() ? (
                    <span className="text-white font-semibold">{selectedArtist.conversionRate}%</span>
                  ) : (
                    <div className="flex items-center gap-1 text-gray-500">
                      <Lock size={12} />
                      <span className="text-xs">Restricted</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <FileCheck size={16} className="text-blue-400" />
                  <span className="text-gray-400">Total Signed:</span>
                  <span className="text-white font-semibold">{selectedArtist.totalSigned}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-purple-400" />
                  <span className="text-gray-400">Total Submitted:</span>
                  <span className="text-white font-semibold">{selectedArtist.totalSubmitted}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto p-4">
          {/* Table Header - matches TrackRow grid template */}
          <div
            style={{ gridTemplateColumns: getDetailGridTemplate() }}
            className="mb-1 grid gap-4 px-4 py-2 bg-gray-900/40 border-b border-gray-800 text-xs font-semibold text-gray-500 uppercase items-center"
          >
            <ResizableColumnHeader
              onResize={(width) => handleDetailResize(0, width)}
              minWidth={detailMinWidths[0]}
            >
              <div className="text-center">Link</div>
            </ResizableColumnHeader>
            <ResizableColumnHeader
              onResize={(width) => handleDetailResize(1, width)}
              minWidth={detailMinWidths[1]}
            >
              <div className="text-center">Watch</div>
            </ResizableColumnHeader>
            <ResizableColumnHeader
              onResize={(width) => handleDetailResize(2, width)}
              minWidth={detailMinWidths[2]}
            >
              <div className="text-left">Artist / Title</div>
            </ResizableColumnHeader>
            <ResizableColumnHeader
              onResize={(width) => handleDetailResize(3, width)}
              minWidth={detailMinWidths[3]}
            >
              <div className="text-center">Genre</div>
            </ResizableColumnHeader>
            <ResizableColumnHeader
              onResize={(width) => handleDetailResize(4, width)}
              minWidth={detailMinWidths[4]}
            >
              <div className="text-center">BPM</div>
            </ResizableColumnHeader>
            <ResizableColumnHeader
              onResize={(width) => handleDetailResize(5, width)}
              minWidth={detailMinWidths[5]}
            >
              <div className="text-center">Energy</div>
            </ResizableColumnHeader>
            <ResizableColumnHeader
              onResize={(width) => handleDetailResize(6, width)}
              minWidth={detailMinWidths[6]}
              isLast={true}
            >
              <div className="text-center">Votes</div>
            </ResizableColumnHeader>
          </div>
          {/* Track Rows */}
          {selectedArtist.tracks.map((track) => (
            <TrackRow key={track.id} track={track} onMove={handleMove} useGridTemplate={true} columnWidths={detailColumnWidths} />
          ))}
        </div>
      </div>
    )
  }

  // Show upgrade overlay if no access
  if (!hasAccess) {
    return (
      <>
        <div className="flex flex-col bg-gray-950 min-h-screen items-center justify-center p-10">
          <div className="text-center max-w-md">
            <h1 className="text-3xl font-bold text-white mb-4">Artist Directory</h1>
            <p className="text-gray-400 mb-6">
              Artist Directory is available on Agent tier and above. Upgrade to unlock this feature and manage your artist relationships.
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
          featureName="Artist Directory"
          planName="Agent"
        />
      </>
    )
  }

  return (
    <div className="flex flex-col bg-gray-950">
      <UpgradeOverlay
        isOpen={showUpgradeOverlay}
        onClose={() => setShowUpgradeOverlay(false)}
        featureName="Artist Directory"
        planName="Agent"
      />
      <div className="p-4 border-b border-gray-800 bg-gray-950/50 backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-white mb-2">Artist Directory</h1>
        
        {/* Filters and Search Row */}
        <div className="flex items-center gap-3 mb-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search artists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-900/50 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-700 font-mono"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 text-sm bg-gray-900/50 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gray-700 font-mono cursor-pointer min-w-[180px]"
            >
              <option value="submissions-high">Submissions (High-Low)</option>
              <option value="submissions-low">Submissions (Low-High)</option>
              <option value="signed-high">Signed Tracks (High-Low)</option>
              <option value="signed-low">Signed Tracks (Low-High)</option>
              <option value="conversion-high">Conversion Rate (High-Low)</option>
              <option value="conversion-low">Conversion Rate (Low-High)</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>

          {/* Genre Filter Dropdown */}
          <div className="relative">
            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 text-sm bg-gray-900/50 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gray-700 font-mono cursor-pointer min-w-[140px]"
            >
              <option value="all">All Genres</option>
              {GENRES.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>

          {/* Signed Only Toggle */}
          <button
            onClick={() => setSignedOnly(!signedOnly)}
            className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${
              signedOnly
                ? 'bg-gray-800 text-white border-2 border-gray-700'
                : 'bg-gray-900/50 text-gray-300 border-2 border-transparent hover:bg-gray-900/70'
            }`}
          >
            <Filter size={14} />
            Signed Only
          </button>
        </div>
      </div>

      <div className="overflow-y-auto p-4">
        {/* Table Header */}
        <div
          style={{ gridTemplateColumns: getGridTemplate() }}
          className="mb-1 grid gap-4 px-4 py-2 bg-gray-900/40 border-b border-gray-800 text-xs font-semibold text-gray-500 uppercase items-center"
        >
          <ResizableColumnHeader
            onResize={(width) => handleResize(0, width)}
            minWidth={minWidths[0]}
          >
            <div className="text-left">Artist Name</div>
          </ResizableColumnHeader>
          <ResizableColumnHeader
            onResize={(width) => handleResize(1, width)}
            minWidth={minWidths[1]}
          >
            <div className="text-left">Primary Genre</div>
          </ResizableColumnHeader>
          <ResizableColumnHeader
            onResize={(width) => handleResize(2, width)}
            minWidth={minWidths[2]}
          >
            <div className="text-center">Subs</div>
          </ResizableColumnHeader>
          <ResizableColumnHeader
            onResize={(width) => handleResize(3, width)}
            minWidth={minWidths[3]}
          >
            <div className="text-center">Signed</div>
          </ResizableColumnHeader>
          <ResizableColumnHeader
            onResize={(width) => handleResize(4, width)}
            minWidth={minWidths[4]}
            isLast={true}
          >
            <div className="text-center">Conv %</div>
          </ResizableColumnHeader>
        </div>

        {/* Table Rows */}
          {filteredAndSortedArtists.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <p>No artists found</p>
            </div>
          ) : (
          filteredAndSortedArtists.map((artist) => (
            <motion.div
              key={artist.name}
              onClick={() => setSelectedArtist(artist)}
              style={{ gridTemplateColumns: getGridTemplate() }}
              className="grid gap-4 items-center py-2 px-4 hover:bg-gray-900/60 border-b border-gray-800/30 text-sm font-mono cursor-pointer transition-all bg-gray-900/20 hover:border-gray-700"
              whileHover={{ scale: 1.01, backgroundColor: 'rgba(139, 92, 246, 0.15)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-800/50 flex items-center justify-center text-gray-300 font-bold text-sm border border-gray-700">
                  {artist.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-white font-semibold text-base truncate">{artist.name}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-gray-800/50 text-gray-300 text-xs font-medium border border-gray-700/50">
                  {artist.dominantGenre || 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <FileText size={14} className="text-gray-500" />
                <span className="text-gray-300 font-medium">{artist.totalSubmitted}</span>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <FileCheck size={14} className="text-blue-400" />
                <span className="text-blue-400 font-semibold text-base">{artist.totalSigned}</span>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                {canViewMetrics() ? (
                  <>
                    <TrendingUp size={14} className="text-green-400" />
                    <span className="text-green-400 font-bold text-base">{artist.conversionRate}%</span>
                  </>
                ) : (
                  <div className="flex items-center gap-1 text-gray-500">
                    <Lock size={12} />
                    <span className="text-xs">Restricted</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

export default ArtistDirectory
