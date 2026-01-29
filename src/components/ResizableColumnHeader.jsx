import { useState, useRef, useEffect } from 'react'

const ResizableColumnHeader = ({ children, onResize, minWidth = 60, isLast = false }) => {
  const [isResizing, setIsResizing] = useState(false)
  const [startX, setStartX] = useState(0)
  const [startWidth, setStartWidth] = useState(0)
  const headerRef = useRef(null)

  const handleMouseDown = e => {
    if (isLast) return // Don't resize the last column (Actions)

    e.preventDefault()
    setIsResizing(true)
    setStartX(e.clientX)
    if (headerRef.current) {
      const rect = headerRef.current.getBoundingClientRect()
      setStartWidth(rect.width)
    }
  }

  useEffect(() => {
    const handleMouseMove = e => {
      if (!isResizing) return

      const diff = e.clientX - startX
      const newWidth = startWidth + diff

      if (newWidth >= minWidth) {
        onResize(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, startX, startWidth, minWidth, onResize])

  return (
    <div ref={headerRef} className="relative group h-full w-full" style={{ margin: 0, padding: 0 }}>
      <div style={{ width: '100%', height: '100%' }}>{children}</div>
      {!isLast && (
        <div
          onMouseDown={handleMouseDown}
          className={`absolute right-0 top-0 h-full w-1.5 cursor-col-resize transition-colors ${
            isResizing ? 'bg-neon-purple' : 'bg-transparent group-hover:bg-neon-purple/50'
          }`}
          style={{
            zIndex: 10,
            marginRight: '-3px',
            cursor: 'col-resize',
          }}
          title="Drag to resize column"
        />
      )}
    </div>
  )
}

export default ResizableColumnHeader
