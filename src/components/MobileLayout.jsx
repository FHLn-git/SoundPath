import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import UnifiedAppHeader from './UnifiedAppHeader'
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
    <div className="flex flex-col min-h-screen bg-gray-950">
      {/* Unified top header: full width, app switcher left */}
      <UnifiedAppHeader
        appLabel="LABEL"
        rightSlot={
          isMobile ? (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors touch-target"
              aria-label="Open menu"
            >
              <Menu size={22} className="text-gray-300" />
            </button>
          ) : null
        }
      />

      <div className="flex flex-1 min-h-0">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
          topOffset={56}
        />

        <main
          className="flex-1 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] min-w-0"
          style={{ marginLeft: isMobile ? 0 : `${sidebarWidth}px` }}
        >
          <div className={`${isMobile ? 'p-4 pb-20' : 'max-w-[1600px] ml-0 p-10'}`}>{children}</div>
        </main>
      </div>

      <AnimatePresence mode="wait">
        {isMobile && showBottomNav && isPersonalView && <BottomNav key={location.pathname} />}
      </AnimatePresence>
    </div>
  )
}

export default MobileLayout
