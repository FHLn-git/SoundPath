import { useDroppable } from '@dnd-kit/core'
import TrackCard from './TrackCard'

const Column = ({ column, tracks, onMoveTrack, onVote, allColumns }) => {
  const currentIndex = allColumns.findIndex((c) => c.id === column.id)
  const canMoveLeft = currentIndex > 0
  const canMoveRight = currentIndex < allColumns.length - 1

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  })

  return (
    <div className="flex flex-col h-full">
      <div className="glass-morphism rounded-lg p-4 mb-4">
        <h2 className="text-lg font-semibold text-neon-purple mb-2">{column.title}</h2>
        <p className="text-xs text-gray-400">{tracks.length} tracks</p>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[400px] rounded-lg p-3 transition-colors duration-200 ${
          isOver
            ? 'bg-neon-purple/10 border-2 border-dashed border-neon-purple/50'
            : 'bg-gray-900/30'
        }`}
      >
        {tracks.map((track, index) => (
          <TrackCard
            key={track.id}
            track={track}
            index={index}
            onMoveTrack={onMoveTrack}
            onVote={onVote}
            canMoveLeft={canMoveLeft}
            canMoveRight={canMoveRight}
            allColumns={allColumns}
            currentColumnIndex={currentIndex}
          />
        ))}
      </div>
    </div>
  )
}

export default Column
