import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import Column from './Column'

const KanbanBoard = ({ columns, tracks, onMoveTrack, onVote, showMoveToLabel, onMoveToLabel }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over) return

    const trackId = active.id
    const newColumnId = over.id

    // Check if dropped on a column
    if (columns.some((col) => col.id === newColumnId)) {
      onMoveTrack(trackId, newColumnId)
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {columns.map((column) => {
          const columnTracks = tracks.filter((track) => track.column === column.id)
          return (
            <Column
              key={column.id}
              column={column}
              tracks={columnTracks}
              onMoveTrack={onMoveTrack}
              onVote={onVote}
              allColumns={columns}
            />
          )
        })}
      </div>
    </DndContext>
  )
}

export default KanbanBoard
