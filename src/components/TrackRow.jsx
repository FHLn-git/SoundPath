import { motion } from 'framer-motion'
import { ThumbsUp, ThumbsDown, Calendar, CheckCircle, DollarSign, Eye, ArrowRight, X, Edit } from 'lucide-react'
import EnergyMeter from './EnergyMeter'
import EnergyEditor from './EnergyEditor'
import LinkShield from './LinkShield'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'

const TrackRow = ({
  track,
  onMove,
  showPhaseControls = false,
  onAdvance,
  onReject,
  onRevise,
  useGridTemplate = false,
  columnWidths = null,
  onContractSignedChange = null,
}) => {
  const { voteOnTrack, currentStaff, updateTrack, toggleWatched } = useApp()
  const { 
    canAdvanceBeyondSecondListen, 
    staffProfile,
    canVote,
    canSetEnergy,
    canAdvanceLobby,
    canAdvanceOffice,
    canAdvanceContract,
  } = useAuth()
  const daysInPipeline = Math.floor((new Date() - new Date(track.createdAt)) / (1000 * 60 * 60 * 24))
  const hasVoted = track.staffVotes?.[currentStaff.id] !== undefined
  const userVote = track.staffVotes?.[currentStaff.id] || 0
  const isWatched = track.watched || false

  // Calculate track age for Inbox display
  const getTrackAge = () => {
    if (!track.createdAt) return { text: 'New', days: 0, color: 'text-green-400' }
    
    const days = daysInPipeline
    if (days < 7) {
      return { text: `${days}d`, days, color: 'text-green-400' }
    } else if (days <= 21) {
      const weeks = Math.floor(days / 7)
      return { text: `${weeks}w`, days, color: 'text-yellow-400' }
    } else {
      const weeks = Math.floor(days / 7)
      return { text: `${weeks}w`, days, color: 'text-red-400' }
    }
  }

  const trackAge = getTrackAge()

  // Calculate Consensus Score (sum of all votes)
  const consensusScore = track.votes || 0

  const handleVote = (vote) => {
    // Voting is now in Team Review phase
    if (showPhaseControls && track.column === 'team-review') {
      if (hasVoted && userVote === vote) {
        // Remove vote if clicking same button
        voteOnTrack(track.id, 0)
      } else {
        voteOnTrack(track.id, vote)
      }
    }
  }

  const handleEnergyChange = (energy) => {
    updateTrack(track.id, { energy })
  }

  const handleWatchToggle = (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWatched(track.id)
  }

  const handleAdvanceClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (onAdvance) {
      onAdvance(track.id)
    }
  }

  const handleRejectClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (onReject) {
      onReject(track.id)
    }
  }

  const handleReviseClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (onRevise) {
      onRevise(track.id)
    }
  }

  const isInbox = track.column === 'inbox'
  const isSecondListen = track.column === 'second-listen'
  const isTeamReview = track.column === 'team-review'
  const isContracting = track.column === 'contracting'
  const isUpcoming = track.column === 'upcoming'
  const hideEnergyVotes = isInbox || isSecondListen || isContracting || isUpcoming

  const getActionButton = () => {
    if (isTeamReview) {
      return { text: 'Sign', disabled: false }
    }
    if (isContracting) {
      const isDisabled = !track.contractSigned
      return {
        text: 'Schedule Release',
        disabled: isDisabled,
      }
    }
    if (isSecondListen) {
      const isDisabled = !track.energy || track.energy === 0
      return { text: 'Advance', disabled: isDisabled }
    }
    return {
      text: 'Advance',
      disabled: false,
    }
  }

  const actionButton = getActionButton()

  // Determine if this is a simple list view (like artist detail page) vs phase view
  const isSimpleView = !showPhaseControls && !onAdvance && !onReject

  const gridStyle = showPhaseControls || useGridTemplate
    ? columnWidths
      ? { gridTemplateColumns: columnWidths.join(' ') }
      : isSimpleView && useGridTemplate
      ? { gridTemplateColumns: '60px 60px 2fr 1fr 1fr 100px 100px' } // Artist detail page
      : isInbox
      ? { gridTemplateColumns: '60px 60px 2fr 1fr 1fr 80px 200px' }
      : { gridTemplateColumns: '60px 60px 2fr 1fr 1fr 100px 200px' }
    : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={gridStyle}
      className={`grid gap-4 items-center text-sm font-mono transition-all ${
        isSimpleView
          ? 'py-2 px-4 hover:bg-gray-900/60 border-b border-gray-800/30 bg-gray-900/20 hover:border-gray-700'
          : 'py-1.5 px-3 hover:bg-gray-900/50 border-b border-gray-800'
      }`}
      whileHover={isSimpleView ? { scale: 1.01, backgroundColor: 'rgba(139, 92, 246, 0.15)' } : {}}
    >
      {/* Link Shield */}
      <div className="flex justify-center">
        <LinkShield url={track.link} trackId={track.id} />
      </div>

      {/* Eyeball Icon */}
      <button
        type="button"
        onClick={handleWatchToggle}
        className={`p-1.5 rounded transition-colors ${
          isWatched
            ? 'text-white hover:bg-gray-800/50'
            : 'text-gray-500 hover:bg-gray-800/50'
        }`}
        title={isWatched ? 'Watching' : 'Watch'}
      >
        <Eye size={16} fill={isWatched ? 'currentColor' : 'none'} />
      </button>

      {/* Artist & Title */}
      <div className="flex flex-col min-w-0 leading-tight">
        <span className="text-white font-semibold truncate text-sm">{track.artist}</span>
        <span className="text-gray-400 truncate text-xs">{track.title}</span>
      </div>

      {/* Genre */}
      {isSimpleView ? (
        <div className="flex items-center justify-center">
          <span className="px-2.5 py-0.5 rounded-md bg-gray-800/50 text-gray-300 text-xs font-medium border border-gray-700/50">
            {track.genre || 'N/A'}
          </span>
        </div>
      ) : (
        <span className="text-gray-300 truncate text-center">{track.genre}</span>
      )}

      {/* BPM */}
      <div className="flex items-center justify-center">
        <span className="text-gray-300 text-sm">{track.bpm || 'N/A'}</span>
      </div>

      {/* Track Age (Inbox only) */}
      {isInbox ? (
        <div className="flex justify-center items-center">
          <span className={`font-semibold text-sm ${trackAge.color}`} title={`${trackAge.days} days in inbox`}>
            {trackAge.text}
          </span>
        </div>
      ) : isSecondListen ? (
        <div />
      ) : isContracting ? (
        <div className="flex flex-col items-center justify-center gap-1">
          <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={track.contractSigned || false}
              onChange={(e) => {
                if (onContractSignedChange) {
                  onContractSignedChange(track, e.target.checked)
                } else {
                  updateTrack(track.id, { contractSigned: e.target.checked })
                }
              }}
              className="rounded"
            />
            <CheckCircle size={12} />
          </label>
          <span className="text-xs text-gray-400">
            {track.targetReleaseDate ? new Date(track.targetReleaseDate).toLocaleDateString() : 'No date'}
          </span>
        </div>
      ) : isUpcoming ? (
        <div className="flex flex-col items-center justify-center gap-1">
          <span className="text-green-400 font-semibold text-sm">
            {track.releaseDate ? new Date(track.releaseDate).toLocaleDateString() : 'TBD'}
          </span>
          <span className="text-xs text-gray-400">
            {track.contractSigned ? 'Signed' : 'Pending'}
          </span>
        </div>
      ) : (
        <div className={`flex flex-col items-center ${isSimpleView ? 'gap-0.5' : 'gap-1'}`}>
          {isTeamReview ? (
            <EnergyEditor energy={track.energy || 0} readOnly={true} />
          ) : (
            <EnergyMeter energy={track.energy || 0} />
          )}
          <div className="flex items-center gap-2">
            {showPhaseControls && isTeamReview ? (
              <>
                {canVote() ? (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleVote(1)
                      }}
                      disabled={hasVoted && userVote !== 1}
                      className={`p-1 rounded transition-colors ${
                        userVote === 1
                          ? 'bg-green-500/30 text-green-400'
                          : hasVoted
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-green-500/20 text-gray-400'
                      }`}
                      title={hasVoted ? 'You have already voted' : 'Vote up'}
                    >
                      <ThumbsUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleVote(-1)
                      }}
                      disabled={hasVoted && userVote !== -1}
                      className={`p-1 rounded transition-colors ${
                        userVote === -1
                          ? 'bg-red-500/30 text-red-400'
                          : hasVoted
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-red-500/20 text-gray-400'
                      }`}
                      title={hasVoted ? 'You have already voted' : 'Vote down'}
                    >
                      <ThumbsDown size={14} />
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-gray-500">No voting permission</span>
                )}
                <span
                  className={`text-sm font-bold ${
                    consensusScore > 0
                      ? 'text-green-400'
                      : consensusScore < 0
                      ? 'text-red-400'
                      : 'text-gray-400'
                  }`}
                >
                  {consensusScore > 0 ? '+' : ''}
                  {consensusScore}
                </span>
              </>
            ) : (
              <span
                className={`${isSimpleView ? 'text-xs' : 'text-sm'} font-semibold ${
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
            )}
          </div>
        </div>
      )}

          {/* Advance/Reject Buttons (only in phase views) */}
          {showPhaseControls && (
            <div className="flex items-center justify-end gap-2">
              {/* Check granular permissions for advancement */}
              {(() => {
                let canAdvance = false
                let permissionMessage = ''
                
                if (isInbox && canAdvanceLobby()) {
                  canAdvance = true
                } else if (isSecondListen && canAdvanceOffice()) {
                  canAdvance = true
                } else if (isTeamReview && canAdvanceContract()) {
                  canAdvance = true
                } else if (isContracting && canAdvanceContract()) {
                  canAdvance = true
                } else {
                  permissionMessage = 'Insufficient permissions'
                }

                return canAdvance ? (
                  <button
                    type="button"
                    onClick={handleAdvanceClick}
                    disabled={actionButton.disabled}
                    className={`px-2 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
                      actionButton.disabled
                        ? 'bg-gray-700/30 text-gray-500 cursor-not-allowed'
                        : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                    }`}
                    title={
                      actionButton.disabled
                        ? actionButton.text === 'Promote to Lobby' && isSecondListen
                          ? 'Set Energy Level first'
                          : actionButton.text === 'Schedule Release' && isContracting
                          ? 'Sign contract first'
                          : 'Cannot advance'
                        : 'Advance to next phase'
                    }
                  >
                    <ArrowRight size={12} />
                    {actionButton.text}
                  </button>
                ) : permissionMessage ? (
                  <span className="text-xs text-gray-500">{permissionMessage}</span>
                ) : null
              })()}
          {isTeamReview ? (
            <>
              <button
                type="button"
                onClick={handleReviseClick}
                className="px-2 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded text-xs font-semibold transition-colors flex items-center gap-1"
                title="Revise"
              >
                <Edit size={12} />
                Revise
              </button>
              {/* Owners can reject in Team Review */}
              {staffProfile?.role === 'Owner' && (
                <button
                  type="button"
                  onClick={handleRejectClick}
                  className="w-6 h-6 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 rounded transition-colors"
                  title="Archive/Reject (Owner Only)"
                >
                  <X size={14} />
                </button>
              )}
            </>
          ) : isContracting ? (
            /* Owners can reject in Contracting */
            staffProfile?.role === 'Owner' && (
              <button
                onClick={handleRejectClick}
                className="w-6 h-6 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 rounded transition-colors"
                title="Archive/Reject (Owner Only)"
              >
                <X size={14} />
              </button>
            )
          ) : isUpcoming ? (
            /* Owners can reject in Upcoming */
            staffProfile?.role === 'Owner' && (
              <button
                onClick={handleRejectClick}
                className="w-6 h-6 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 rounded transition-colors"
                title="Archive/Reject (Owner Only)"
              >
                <X size={14} />
              </button>
            )
          ) : (
            /* Reject available for all in Inbox and Second Listen */
            <button
              type="button"
              onClick={handleRejectClick}
              className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs font-semibold transition-colors flex items-center gap-1"
              title="Archive/Reject"
            >
              <X size={12} />
              Reject
            </button>
          )}
          {isSecondListen && (
            canSetEnergy() ? (
              <EnergyEditor
                energy={track.energy || 0}
                onEnergyChange={handleEnergyChange}
                readOnly={false}
              />
            ) : (
              <EnergyMeter energy={track.energy || 0} />
            )
          )}
        </div>
      )}
    </motion.div>
  )
}

export default TrackRow
