import { useState, useEffect, useCallback } from 'react'

const DEFAULT_COLUMNS = {
  inbox: ['60px', '60px', '2fr', '1fr', '1fr', '80px', '200px'],
  'second-listen': ['60px', '60px', '2fr', '1fr', '1fr', '100px', '200px'],
  'team-review': ['60px', '60px', '2fr', '1fr', '1fr', '100px', '200px'],
  contracting: ['60px', '60px', '2fr', '1fr', '1fr', '100px', '200px'],
  upcoming: ['60px', '60px', '2fr', '1fr', '1fr', '100px', '100px'],
  vault: ['60px', '60px', '2fr', '1fr', '1fr', '140px', '220px'],
  artists: ['2fr', '1.5fr', '100px', '100px', '120px'],
  'profile-tracks': ['60px', '60px', '2fr', '1fr', '1fr', '100px', '100px'],
  'staff-management': ['200px', '120px', '100px', '120px', '120px', '150px', '120px', '200px'],
  'artist-detail': ['60px', '60px', '2fr', '1fr', '1fr', '100px', '100px'],
}

const MIN_WIDTHS = {
  inbox: [60, 60, 150, 80, 80, 60, 150],
  'second-listen': [60, 60, 150, 80, 80, 80, 150],
  'team-review': [60, 60, 150, 80, 80, 80, 150],
  contracting: [60, 60, 150, 80, 80, 100, 150],
  upcoming: [60, 60, 150, 80, 80, 80, 100],
  vault: [60, 60, 150, 80, 80, 100, 150],
  artists: [150, 120, 60, 60, 80],
  'profile-tracks': [60, 60, 150, 80, 80, 80, 100],
  'staff-management': [150, 100, 80, 100, 100, 120, 100, 150],
  'artist-detail': [60, 60, 150, 80, 80, 80, 100],
}

export const useResizableColumns = viewType => {
  const storageKey = `columnWidths_${viewType}`

  const [columnWidths, setColumnWidths] = useState(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return DEFAULT_COLUMNS[viewType] || DEFAULT_COLUMNS.inbox
      }
    }
    return DEFAULT_COLUMNS[viewType] || DEFAULT_COLUMNS.inbox
  })

  const minWidths = MIN_WIDTHS[viewType] || MIN_WIDTHS.inbox

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(columnWidths))
  }, [columnWidths, storageKey])

  const handleResize = useCallback(
    (columnIndex, newWidth) => {
      setColumnWidths(prev => {
        const updated = [...prev]
        const minWidth = minWidths[columnIndex]
        const pixelWidth = Math.max(minWidth, newWidth)

        // Always convert to pixels when resizing
        // If it was fr, we use the actual measured width from the resize
        updated[columnIndex] = `${pixelWidth}px`

        return updated
      })
    },
    [minWidths]
  )

  const getGridTemplate = useCallback(() => {
    return columnWidths.join(' ')
  }, [columnWidths])

  return {
    columnWidths,
    setColumnWidths,
    handleResize,
    getGridTemplate,
    minWidths,
  }
}
