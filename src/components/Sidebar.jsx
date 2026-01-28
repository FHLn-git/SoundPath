import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Users, Shield, Archive, Calendar, CalendarRange, Rocket, Key, HelpCircle, Webhook, Inbox, Send, Trophy, Crown, X, ChevronLeft, ChevronRight, Zap } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useBilling } from '../context/BillingContext'
import { useState, useEffect, useMemo } from 'react'
import { useMobile } from '../hooks/useMobile'

const Sidebar = ({ isOpen, onClose, isCollapsed, onToggleCollapse }) => {
  const { tracks, getUpcomingCount, connectionStatus } = useApp()
  const { staffProfile, isSystemAdmin, memberships, activeOrgId, activeMembership } = useAuth()
  const { plan, hasFeature } = useBilling()
  const location = useLocation()
  const { isMobile } = useMobile()
  const [showConnectionTooltip, setShowConnectionTooltip] = useState(false)
  const [hasArtistDirectoryAccess, setHasArtistDirectoryAccess] = useState(false)
  const [hasManagerAccess, setHasManagerAccess] = useState(false)
  const [isFreeTier, setIsFreeTier] = useState(false)
  const [hoveredItem, setHoveredItem] = useState(null)
  const upcomingCount = getUpcomingCount()
  const vaultCount = tracks.filter((t) => t.column === 'vault' && !t.archived).length
  
  // Default to open on desktop, controlled by prop on mobile
  const sidebarOpen = isMobile ? (isOpen ?? false) : true
  
  // Collapsed state - only for desktop
  const collapsed = isMobile ? false : (isCollapsed ?? false)
  

  // PERMISSION REFACTOR: Manager tab visibility based on memberships.length > 0 globally
  // LAYOUT UNIFICATION: This is now a global default for all users, not restricted to admin accounts
  // Features are VISIBLE for all users, but free tier shows Premium Overlay instead of hiding
  // CACHING: memberships array is fetched once at login and stored in AuthContext
  // It persists across workspace switches and is NOT cleared by clearWorkspace()
  const canManage = useMemo(() => {
    // System admins always have manager access
    if (isSystemAdmin || staffProfile?.role === 'SystemAdmin') {
      return true
    }
    
    // PERMISSION REFACTOR: Manager tab visible if user has ANY memberships
    // This ensures the tab is visible for all users with label associations, regardless of role
    // Free tier users will see Premium Overlay when accessing, not a hidden tab
    return memberships && memberships.length > 0
  }, [memberships, isSystemAdmin, staffProfile])

  // Check access for free tier restrictions
  // PERMISSION REFACTOR: Features are VISIBLE but show Premium Overlay for free tier
  useEffect(() => {
    const checkAccess = () => {
      // Check system admin status with fallback - check both isSystemAdmin and staffProfile.role
      const userIsSystemAdmin = Boolean(isSystemAdmin || staffProfile?.role === 'SystemAdmin')
      
      // If system admin, always grant access
      if (userIsSystemAdmin) {
        setHasArtistDirectoryAccess(true)
        // Manager tab visible if user has memberships (global check, not plan-based)
        setHasManagerAccess(canManage)
        return
      }
      
      // For non-system admins, check plan tier
      // IMPORTANT: If plan is null (loading), default to allowing access to avoid blocking paid users
      // Only explicitly restrict if plan.id === 'free'
      const isFreeTier = plan?.id === 'free'
      // Grant access to: agent, starter, pro, enterprise tiers, and when plan is loading (null)
      // Only restrict free tier users
      const access = plan === null || !isFreeTier
      setHasArtistDirectoryAccess(access)
      
      // PERMISSION REFACTOR: Manager tab shows if user has memberships (canManage)
      // Free tier users will see the tab but get Premium Overlay when accessing
      // This ensures features are VISIBLE for everyone, not hidden
      setHasManagerAccess(canManage)
    }
    checkAccess()
  }, [plan, isSystemAdmin, staffProfile, canManage])

  const getConnectionColor = () => {
    if (connectionStatus.status === 'connected') return 'bg-green-500'
    if (connectionStatus.status === 'error') return 'bg-red-500'
    return 'bg-yellow-500' // checking
  }

  const getConnectionPulse = () => {
    if (connectionStatus.status === 'checking') return 'animate-pulse'
    return ''
  }

  // Agent-Centric: Determine if we're in Personal view (no active org) or Label workspace
  const isPersonalView = activeOrgId === null
  const activeOrg = memberships?.find(m => m.organization_id === activeOrgId) || null
  const dashboardLabel = isPersonalView ? 'Personal Dashboard' : (activeOrg?.organization_name || 'Dashboard')

  // Workspace indicator text from URL: /labels → "[Label Name] Workspace"; /personal → "Personal Agent Office"
  const workspaceIndicatorText = location.pathname.startsWith('/labels/')
    ? (activeOrg ? `${activeOrg.organization_name} Workspace` : 'Label Workspace')
    : location.pathname.startsWith('/personal')
      ? 'Personal Agent Office'
      : null
  
  // Check if user is on free tier for personal workspace
  useEffect(() => {
    const checkTier = async () => {
      if (!staffProfile || !isPersonalView) {
        setIsFreeTier(false)
        return
      }

      const userIsSystemAdmin = Boolean(isSystemAdmin || staffProfile?.role === 'SystemAdmin')
      if (userIsSystemAdmin) {
        setIsFreeTier(false)
        return
      }

      // Check if user has network feature access
      const networkAccess = await hasFeature('network')
      setIsFreeTier(!networkAccess)
    }
    if (staffProfile && isPersonalView) {
      checkTier()
    }
  }, [staffProfile, isPersonalView, hasFeature, isSystemAdmin])
  
  // Agent-Centric Navigation: Show Personal features when activeOrgId is null, Label features when set
  // Personal dashboard at /personal/dashboard; Label dashboard at /labels/:orgId
  const personalNavItems = [
    { path: '/personal/dashboard', label: 'DASHBOARD', icon: LayoutDashboard },
    ...(hasArtistDirectoryAccess ? [{ path: '/artists', label: 'ARTIST DIRECTORY', icon: Users }] : []),
    { path: '/personal/pitched', label: 'PITCHED', icon: Send, isPremium: true },
    { path: '/personal/signed', label: 'SIGNED', icon: Trophy, isPremium: true },
    ...(hasManagerAccess ? [{ path: '/admin', label: 'Manager', icon: Shield }] : []),
  ]
  
  const labelNavItems = [
    { path: activeOrgId ? `/labels/${activeOrgId}` : '/launchpad', label: dashboardLabel, icon: LayoutDashboard },
    ...(hasArtistDirectoryAccess ? [{ path: '/artists', label: 'Artist Directory', icon: Users }] : []),
    { path: '/upcoming', label: 'Upcoming', icon: Calendar, count: upcomingCount },
    { path: '/vault', label: 'The Vault', icon: Archive, count: vaultCount },
    { path: '/calendar', label: 'Calendar', icon: CalendarRange },
    ...(hasManagerAccess ? [{ path: '/admin', label: 'Manager', icon: Shield }] : []),
    ...(activeMembership?.role === 'Owner' ? [
      { path: '/api-keys', label: 'API Keys', icon: Key },
      { path: '/webhooks', label: 'Webhooks', icon: Webhook }
    ] : []),
  ]
  
  // Combine based on view type
  const navItems = isPersonalView ? personalNavItems : labelNavItems

  const isGlobalView = activeOrgId === null && isSystemAdmin


  // Close sidebar when clicking a nav link on mobile
  const handleNavClick = () => {
    if (isMobile && onClose) {
      onClose()
    }
  }

  // Sidebar content
  const sidebarContent = (
    <>
      {/* SoundPath Header */}
      <div className={`border-b border-gray-800 ${collapsed ? 'p-3' : 'p-4 md:p-6'}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between mb-2'}`}>
          {collapsed ? (
            // Collapsed: Show only icon
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-neon-purple to-recording-red">
              <Zap size={20} className="text-white" />
            </div>
          ) : (
            // Expanded: Show full logo
            <>
              <motion.h1 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xl md:text-2xl font-bold text-white"
              >
                SoundPath
              </motion.h1>
              <div className="flex items-center gap-2">
                {/* Close button on mobile */}
                {isMobile && onClose && (
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors touch-target"
                    aria-label="Close menu"
                  >
                    <X size={20} className="text-gray-400" />
                  </button>
                )}
                {/* Connection Status Indicator - Only show in expanded or as tooltip in collapsed */}
                {!collapsed && (
                  <div
                    className="relative"
                    onMouseEnter={() => setShowConnectionTooltip(true)}
                    onMouseLeave={() => setShowConnectionTooltip(false)}
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${getConnectionColor()} ${getConnectionPulse()} shadow-lg cursor-help transition-all`}
                      title={
                        connectionStatus.status === 'connected'
                          ? 'Connected to Supabase'
                          : connectionStatus.status === 'error'
                          ? `Connection Error: ${connectionStatus.message || 'Unknown'}`
                          : 'Checking connection...'
                      }
                    />
                    {/* Tooltip */}
                    {showConnectionTooltip && connectionStatus.message && (
                      <div className="absolute right-0 top-6 w-48 p-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-gray-300 z-50 shadow-xl">
                        <div className="font-semibold mb-1">
                          {connectionStatus.status === 'connected' ? '✓ Connected' : '✗ Error'}
                        </div>
                        <div className="text-gray-400">{connectionStatus.message}</div>
                      </div>
                    )}
                  </div>
                )}
                {/* Connection indicator in collapsed state - show as small dot in header */}
                {collapsed && (
                  <div
                    className="relative"
                    onMouseEnter={() => setShowConnectionTooltip(true)}
                    onMouseLeave={() => setShowConnectionTooltip(false)}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${getConnectionColor()} ${getConnectionPulse()} shadow-lg cursor-help transition-all`}
                    />
                    {/* Tooltip */}
                    {showConnectionTooltip && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="absolute left-full ml-2 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white whitespace-nowrap z-50 shadow-xl pointer-events-none"
                      >
                        <div className="font-semibold mb-1">
                          {connectionStatus.status === 'connected' ? '✓ Connected' : connectionStatus.status === 'error' ? '✗ Error' : 'Checking...'}
                        </div>
                        {connectionStatus.message && (
                          <div className="text-gray-400">{connectionStatus.message}</div>
                        )}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 border-l border-b border-gray-700 rotate-45" />
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        {!collapsed && (
          <>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-gray-400 mt-1"
            >
              A&R Command Center
            </motion.p>
            
            {/* Workspace Indicator: [Label Name] Workspace | Personal Agent Office */}
            {workspaceIndicatorText && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-2 px-2 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700"
              >
                <p className="text-xs font-semibold text-neon-purple/90 truncate" title={workspaceIndicatorText}>
                  {workspaceIndicatorText}
                </p>
              </motion.div>
            )}
            
            {/* Name/Workspace Info */}
            {staffProfile && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 pt-3 border-t border-gray-800"
              >
                <p className="text-xs font-semibold text-white">{staffProfile.name}</p>
                {isPersonalView ? (
                  <p className="text-xs text-gray-500">Personal Workspace</p>
                ) : activeMembership ? (
                  <p className="text-xs text-gray-500">{activeMembership.role} • {activeOrg?.organization_name || 'Workspace'}</p>
                ) : null}
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Launchpad Link */}
      {memberships && memberships.length > 0 && (
        <div className={`border-b border-gray-800 ${collapsed ? 'p-2' : 'p-3 md:p-4'}`}>
          <div
            className="relative"
            onMouseEnter={() => !isMobile && collapsed && setHoveredItem('launchpad')}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <NavLink
              to="/launchpad"
              onClick={handleNavClick}
              className={({ isActive }) =>
                `w-full flex items-center ${collapsed ? 'justify-center' : 'gap-2'} p-2 bg-gray-900/50 hover:bg-gray-900/70 rounded-lg border transition-all relative ${
                  isActive
                    ? 'border-gray-600 bg-gray-800/50'
                    : 'border-gray-800'
                } ${isActive && collapsed ? 'ring-2 ring-neon-purple/50' : ''}`
              }
            >
              <Rocket size={collapsed ? 20 : 16} className={`${collapsed ? 'text-white' : 'text-gray-400'} flex-shrink-0`} />
              {!collapsed && (
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-white text-sm font-semibold truncate"
                >
                  {isGlobalView ? 'All Labels (Global)' : isPersonalView ? 'Launchpad' : (activeOrg?.organization_name || 'Launchpad')}
                </motion.span>
              )}
            </NavLink>
            {/* Tooltip for collapsed state */}
            {collapsed && hoveredItem === 'launchpad' && !isMobile && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute left-full ml-2 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white whitespace-nowrap z-50 shadow-xl pointer-events-none"
              >
                {isGlobalView ? 'All Labels (Global)' : isPersonalView ? 'Launchpad' : (activeOrg?.organization_name || 'Launchpad')}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 border-l border-b border-gray-700 rotate-45" />
              </motion.div>
            )}
          </div>
        </div>
      )}


      <nav className={`${collapsed ? 'p-2' : 'p-3 md:p-4'} space-y-2 overflow-y-auto flex-1`}>
        {navItems.map((item) => {
          const showProBadge = isPersonalView && item.isPremium && isFreeTier
          const isDashboardPath = item.path === '/personal/dashboard' || (activeOrgId && item.path === `/labels/${activeOrgId}`)
          const isActive = location.pathname === item.path ||
            (isDashboardPath && (location.pathname === '/personal/dashboard' || location.pathname.match(/^\/labels\/[^/]+$/)))
          
          return (
            <div
              key={item.path}
              className="relative"
              onMouseEnter={() => !isMobile && collapsed && setHoveredItem(item.path)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <NavLink
                to={item.path}
                onClick={handleNavClick}
                end={item.path === '/personal/dashboard' || item.path === '/' || (activeOrgId && item.path === `/labels/${activeOrgId}`)}
                className={({ isActive: navIsActive }) =>
                  `flex items-center ${collapsed ? 'justify-center' : 'justify-between'} ${collapsed ? 'px-2' : 'px-3 md:px-4'} py-2.5 md:py-3 rounded-lg transition-all duration-200 relative touch-target ${
                    navIsActive || isActive
                      ? 'bg-gray-800/50 text-white border border-gray-700'
                      : 'text-gray-400 hover:text-white hover:bg-gray-900/50'
                  } ${showProBadge ? 'opacity-75' : ''} ${isActive && collapsed ? 'ring-2 ring-neon-purple/50' : ''}`
                }
              >
                <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} relative`}>
                  <item.icon size={collapsed ? 20 : 18} className={`${collapsed ? '' : 'md:w-5 md:h-5'} flex-shrink-0`} />
                  {!collapsed && (
                    <motion.span 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="font-medium text-sm md:text-base"
                    >
                      {item.label}
                    </motion.span>
                  )}
                  {!collapsed && showProBadge && (
                    <Crown size={12} className="text-yellow-400 ml-1" />
                  )}
                  {/* Count badge - show as small dot in collapsed, full badge in expanded */}
                  {item.count !== undefined && (
                    collapsed ? (
                      item.count > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-neon-purple rounded-full border-2 border-gray-950" />
                      )
                    ) : null
                  )}
                </div>
                {/* Count badge in expanded state */}
                {!collapsed && item.count !== undefined && (
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-2 py-0.5 bg-gray-800 text-gray-300 rounded text-xs font-semibold"
                  >
                    {item.count}
                  </motion.span>
                )}
              </NavLink>
              {/* Tooltip for collapsed state */}
              {collapsed && hoveredItem === item.path && !isMobile && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute left-full ml-2 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white whitespace-nowrap z-50 shadow-xl pointer-events-none"
                >
                  {item.label}
                  {showProBadge && (
                    <Crown size={10} className="text-yellow-400 ml-1 inline" />
                  )}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 border-l border-b border-gray-700 rotate-45" />
                </motion.div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Help Section */}
      <div className={`border-t border-gray-800 bg-gray-950/95 ${collapsed ? 'p-2' : 'p-3 md:p-4'}`}>
        <div
          className="relative"
          onMouseEnter={() => !isMobile && collapsed && setHoveredItem('help')}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <NavLink
            to="/help"
            onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center ${collapsed ? 'justify-center' : 'gap-3'} ${collapsed ? 'px-2' : 'px-3 md:px-4'} py-2.5 md:py-3 rounded-lg transition-all duration-200 touch-target ${
                isActive
                  ? 'bg-gray-800/50 text-white border border-gray-700'
                  : 'text-gray-400 hover:text-white hover:bg-gray-900/50'
              } ${isActive && collapsed ? 'ring-2 ring-neon-purple/50' : ''}`
            }
          >
            <HelpCircle size={collapsed ? 20 : 18} className={`${collapsed ? '' : 'md:w-5 md:h-5'} flex-shrink-0`} />
            {!collapsed && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-medium text-sm md:text-base"
              >
                Help & Support
              </motion.span>
            )}
          </NavLink>
          {/* Tooltip for collapsed state */}
          {collapsed && hoveredItem === 'help' && !isMobile && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="absolute left-full ml-2 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white whitespace-nowrap z-50 shadow-xl pointer-events-none"
            >
              Help & Support
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 border-l border-b border-gray-700 rotate-45" />
            </motion.div>
          )}
        </div>
      </div>

      {/* Collapse Toggle Button - Desktop Only */}
      {!isMobile && onToggleCollapse && (
        <div className="p-2 border-t border-gray-800 bg-gray-950/95">
          <button
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-center p-2 hover:bg-gray-800 rounded-lg transition-all duration-200 text-gray-400 hover:text-white touch-target"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight size={20} />
            ) : (
              <ChevronLeft size={20} />
            )}
          </button>
        </div>
      )}
    </>
  )

  // Mobile: Slide-over drawer
  if (isMobile) {
    return (
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            {/* Sidebar Drawer */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full w-64 bg-gray-950/98 backdrop-blur-lg border-r border-gray-800 z-50 flex flex-col"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    )
  }

  // Desktop: Fixed sidebar with collapse functionality
  return (
    <motion.aside
      initial={{ x: -250 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed left-0 top-0 h-full bg-gray-950/95 backdrop-blur-lg border-r border-gray-800 z-30 hidden md:flex flex-col sidebar-transition"
      style={{ width: collapsed ? 64 : 256 }}
    >
      {sidebarContent}
    </motion.aside>
  )
}

export default Sidebar
