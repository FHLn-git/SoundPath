import { motion } from 'framer-motion'
import { useDraggable } from '@dnd-kit/core'
import { ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown } from 'lucide-react'

const TrackCard = ({
  track,
  index,
  onMoveTrack,
  onVote,
  canMoveLeft,
  canMoveRight,
  allColumns,
  currentColumnIndex,
}) => {
  const createdAt = track.createdAt instanceof Date ? track.createdAt : new Date(track.createdAt)
  const daysInPipeline = Math.floor(
    (new Date() - createdAt) / (1000 * 60 * 60 * 24)
  )

  // Check if in Second Listen and calculate time there
  const isInSecondListen = track.column === 'second-listen'
  let borderClass = ''
  if (isInSecondListen && track.movedToSecondListen) {
    const movedDate = track.movedToSecondListen instanceof Date 
      ? track.movedToSecondListen 
      : new Date(track.movedToSecondListen)
    const hoursInSecondListen = (new Date() - movedDate) / (1000 * 60 * 60)
    if (hoursInSecondListen > 48) {
      borderClass = 'glow-green'
    } else {
      borderClass = 'glow-red'
    }
  }

  const handleArrowMove = (direction) => {
    if (direction === 'left' && canMoveLeft) {
      const newColumn = allColumns[currentColumnIndex - 1]
      onMoveTrack(track.id, newColumn.id)
    } else if (direction === 'right' && canMoveRight) {
      const newColumn = allColumns[currentColumnIndex + 1]
      onMoveTrack(track.id, newColumn.id)
    }
  }

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: track.id,
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`glass-morphism rounded-lg p-4 mb-3 cursor-grab active:cursor-grabbing transition-all duration-200 ${
        isDragging ? 'opacity-80 scale-105 z-50' : ''
      } ${borderClass}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="font-semibold text-white mb-1">{track.title}</h3>
          <p className="text-sm text-gray-300 mb-2">{track.artist}</p>
        </div>
        <div className="flex gap-1">
          {canMoveLeft && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleArrowMove('left')
              }}
              className="p-1 hover:bg-neon-purple/20 rounded transition-colors"
              aria-label="Move left"
            >
              <ChevronLeft size={16} className="text-neon-purple" />
            </button>
          )}
          {canMoveRight && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleArrowMove('right')
              }}
              className="p-1 hover:bg-neon-purple/20 rounded transition-colors"
              aria-label="Move right"
            >
              <ChevronRight size={16} className="text-neon-purple" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            track.vibe === 'Melodic'
              ? 'bg-purple-500/20 text-purple-300'
              : track.vibe === 'Main Stage'
              ? 'bg-recording-red/20 text-red-300'
              : track.vibe === 'Afterhours'
              ? 'bg-blue-500/20 text-blue-300'
              : 'bg-pink-500/20 text-pink-300'
          }`}
        >
          {track.vibe}
        </span>
        <span className="text-xs text-gray-400">
          {daysInPipeline} {daysInPipeline === 1 ? 'day' : 'days'} in pipeline
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onVote(track.id, 1)
          }}
          className="flex items-center gap-1 px-2 py-1 rounded hover:bg-green-500/20 transition-colors"
        >
          <ThumbsUp size={14} className="text-green-400" />
          <span className="text-xs text-gray-300">+1</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onVote(track.id, -1)
          }}
          className="flex items-center gap-1 px-2 py-1 rounded hover:bg-red-500/20 transition-colors"
        >
          <ThumbsDown size={14} className="text-red-400" />
          <span className="text-xs text-gray-300">-1</span>
        </button>
        <div className="ml-auto">
          <span
            className={`text-sm font-semibold ${
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
      </div>

      {track.link && (
        <a
          href={track.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="block mt-2 text-xs text-neon-purple hover:underline"
        >
          View Demo →
        </a>
      )}
    </motion.div>
  )
}

export default TrackCard
