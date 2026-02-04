import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import { useMobile } from '../hooks/useMobile'
import { useAuth } from '../context/AuthContext'

/**
 * Layout wrapper that handles mobile sidebar and provides hamburger menu
 */
const MobileLayout = ({ children, showBottomNav = false }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isMobile } = useMobile()
  const { activeOrgId } = useAuth()
  const location = useLocation()
  const isPersonalView = activeOrgId === null

  // Collapse state with localStorage persistence (desktop only)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      const saved = localStorage.getItem('sidebarCollapsed')
      return saved === 'true'
    }
    return false
  })

  // Save collapse state to localStorage
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem('sidebarCollapsed', isCollapsed.toString())
    }
  }, [isCollapsed, isMobile])

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  // Calculate sidebar width for content margin
  const sidebarWidth = isMobile ? 0 : isCollapsed ? 64 : 256

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar - hidden on mobile, shown via drawer */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Main Content */}
      <main
        className="flex-1 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ marginLeft: isMobile ? 0 : `${sidebarWidth}px` }}
      >
        {/* Mobile Header with Hamburger */}
        {isMobile && (
          <header className="sticky top-0 z-30 bg-gray-950/95 backdrop-blur-lg border-b border-gray-800 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors touch-target"
              aria-label="Open menu"
            >
              <Menu size={24} className="text-gray-300" />
            </button>
            <h1 className="text-base font-bold text-white">SoundPath <span className="text-gray-500 font-normal">|</span> <span className="text-neon-purple/90">LABEL</span></h1>
            <div className="w-10" /> {/* Spacer for centering */}
          </header>
        )}

        {/* Content Area */}
        <div className={`${isMobile ? 'p-4 pb-20' : 'max-w-[1600px] ml-0 p-10'}`}>{children}</div>
      </main>

      {/* Bottom Navigation for Personal Workspace on Mobile */}
      <AnimatePresence mode="wait">
        {isMobile && showBottomNav && isPersonalView && <BottomNav key={location.pathname} />}
      </AnimatePresence>
    </div>
  )
}

export default MobileLayout
