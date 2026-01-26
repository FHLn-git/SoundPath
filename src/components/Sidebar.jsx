import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutDashboard, Users, Shield, Archive, Calendar, CalendarRange, Rocket, Key, HelpCircle, Webhook, Inbox, Send, Trophy, Crown } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useBilling } from '../context/BillingContext'
import { useState, useEffect } from 'react'

const Sidebar = () => {
  const { tracks, getUpcomingCount, connectionStatus } = useApp()
  const { staffProfile, isSystemAdmin, memberships, activeOrgId, activeMembership } = useAuth()
  const { plan, hasFeature } = useBilling()
  const location = useLocation()
  const [showConnectionTooltip, setShowConnectionTooltip] = useState(false)
  const [hasArtistDirectoryAccess, setHasArtistDirectoryAccess] = useState(false)
  const [hasManagerAccess, setHasManagerAccess] = useState(false)
  const [isFreeTier, setIsFreeTier] = useState(false)
  const upcomingCount = getUpcomingCount()
  const vaultCount = tracks.filter((t) => t.column === 'vault' && !t.archived).length
  

  // Check access for free tier restrictions - only restrict free tier, allow all paid tiers and system admins
  useEffect(() => {
    const checkAccess = () => {
      // Check system admin status with fallback - check both isSystemAdmin and staffProfile.role
      const userIsSystemAdmin = Boolean(isSystemAdmin || staffProfile?.role === 'SystemAdmin')
      
      // If system admin, always grant access
      if (userIsSystemAdmin) {
        setHasArtistDirectoryAccess(true)
        setHasManagerAccess(true)
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
      setHasManagerAccess(access)
    }
    checkAccess()
  }, [plan, isSystemAdmin, staffProfile])

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
  // Personal view uses /dashboard (which now shows personal inbox crates)
  // Pitched and Signed are ALWAYS available in personal view - no access restrictions
  const personalNavItems = [
    { path: '/dashboard', label: 'DASHBOARD', icon: LayoutDashboard },
    ...(hasArtistDirectoryAccess ? [{ path: '/artists', label: 'ARTIST DIRECTORY', icon: Users }] : []),
    { path: '/personal/pitched', label: 'PITCHED', icon: Send, isPremium: true },
    { path: '/personal/signed', label: 'SIGNED', icon: Trophy, isPremium: true },
    ...(hasManagerAccess ? [{ path: '/admin', label: 'Manager', icon: Shield }] : []),
  ]
  
  const labelNavItems = [
    { path: '/dashboard', label: dashboardLabel, icon: LayoutDashboard },
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


  return (
    <motion.aside
      initial={{ x: -250 }}
      animate={{ x: 0 }}
      className="fixed left-0 top-0 h-full w-64 bg-gray-950/95 backdrop-blur-lg border-r border-gray-800 z-30"
    >
      {/* SoundPath Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-white">
            SoundPath
          </h1>
          {/* Connection Status Indicator */}
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
        </div>
        <p className="text-xs text-gray-400 mt-1">A&R Command Center</p>
        
        {/* Name/Workspace Info */}
        {staffProfile && (
          <div className="mt-3 pt-3 border-t border-gray-800">
            <p className="text-xs font-semibold text-white">{staffProfile.name}</p>
            {isPersonalView ? (
              <p className="text-xs text-gray-500">Personal Workspace</p>
            ) : activeMembership ? (
              <p className="text-xs text-gray-500">{activeMembership.role} • {activeOrg?.organization_name || 'Workspace'}</p>
            ) : null}
          </div>
        )}
      </div>

      {/* Launchpad Link */}
      {memberships && memberships.length > 0 && (
        <div className="p-4 border-b border-gray-800">
          <NavLink
            to="/launchpad"
            className={({ isActive }) =>
              `w-full flex items-center gap-2 p-2 bg-gray-900/50 hover:bg-gray-900/70 rounded-lg border transition-all ${
                isActive
                  ? 'border-gray-600 bg-gray-800/50'
                  : 'border-gray-800'
              }`
            }
          >
            <Rocket size={16} className="text-gray-400 flex-shrink-0" />
            <span className="text-white text-sm font-semibold truncate">
              {isGlobalView ? 'All Labels (Global)' : isPersonalView ? 'Launchpad' : (activeOrg?.organization_name || 'Launchpad')}
            </span>
          </NavLink>
        </div>
      )}


      <nav className="p-4 space-y-2">
        {navItems.map((item) => {
          const showProBadge = isPersonalView && item.isPremium && isFreeTier
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard' || item.path === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 relative ${
                  isActive
                    ? 'bg-gray-800/50 text-white border border-gray-700'
                    : 'text-gray-400 hover:text-white hover:bg-gray-900/50'
                } ${showProBadge ? 'opacity-75' : ''}`
              }
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
                {showProBadge && (
                  <Crown size={12} className="text-yellow-400 ml-1" />
                )}
              </div>
              {item.count !== undefined && (
                <span className="px-2 py-0.5 bg-gray-800 text-gray-300 rounded text-xs font-semibold">
                  {item.count}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Help Section */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800 bg-gray-950/95">
        <NavLink
          to="/help"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              isActive
                ? 'bg-gray-800/50 text-white border border-gray-700'
                : 'text-gray-400 hover:text-white hover:bg-gray-900/50'
            }`
          }
        >
          <HelpCircle size={20} />
          <span className="font-medium text-sm">Help & Support</span>
        </NavLink>
      </div>
    </motion.aside>
  )
}

export default Sidebar
