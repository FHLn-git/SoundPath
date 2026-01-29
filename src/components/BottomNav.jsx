import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutDashboard, Users, Send, Trophy } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useBilling } from '../context/BillingContext'
import { useState, useEffect } from 'react'
import { Crown } from 'lucide-react'

/**
 * Bottom Navigation Bar for Personal Workspace on Mobile
 * Shows the 4 main tabs: Dashboard, Directory, Pitched, Signed
 */
const BottomNav = () => {
  const { activeOrgId, staffProfile, isSystemAdmin } = useAuth()
  const { hasFeature } = useBilling()
  const location = useLocation()
  const [hasArtistDirectoryAccess, setHasArtistDirectoryAccess] = useState(false)
  const [isFreeTier, setIsFreeTier] = useState(false)

  const isPersonalView = activeOrgId === null

  // Check access for free tier restrictions
  useEffect(() => {
    const checkAccess = async () => {
      const userIsSystemAdmin = Boolean(isSystemAdmin || staffProfile?.role === 'SystemAdmin')

      if (userIsSystemAdmin) {
        setHasArtistDirectoryAccess(true)
        setIsFreeTier(false)
        return
      }

      if (!staffProfile || !isPersonalView) {
        setHasArtistDirectoryAccess(true)
        setIsFreeTier(false)
        return
      }

      const networkAccess = await hasFeature('network')
      setHasArtistDirectoryAccess(networkAccess || userIsSystemAdmin)
      setIsFreeTier(!networkAccess && !userIsSystemAdmin)
    }
    checkAccess()
  }, [staffProfile, isPersonalView, hasFeature, isSystemAdmin])

  // Only show on mobile and in Personal Workspace
  if (!isPersonalView) {
    return null
  }

  const navItems = [
    { path: '/personal/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...(hasArtistDirectoryAccess ? [{ path: '/artists', label: 'Directory', icon: Users }] : []),
    { path: '/personal/pitched', label: 'Pitched', icon: Send, isPremium: true },
    { path: '/personal/signed', label: 'Signed', icon: Trophy, isPremium: true },
  ]

  return (
    <motion.nav
      initial={{ y: 150, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 150, opacity: 0, scale: 0.95 }}
      transition={{
        type: 'spring',
        stiffness: 280,
        damping: 22,
        mass: 0.9,
        velocity: 0.8,
      }}
      className="fixed bottom-0 left-0 right-0 bg-gray-950/98 backdrop-blur-lg border-t border-gray-800 z-40 md:hidden"
      style={{
        boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.6), 0 -2px 8px rgba(168, 85, 247, 0.1)',
      }}
    >
      <motion.div
        className="flex items-center justify-around px-2 py-2"
        initial={{ scale: 0.85, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        transition={{
          type: 'spring',
          stiffness: 350,
          damping: 22,
          delay: 0.08,
        }}
      >
        {navItems.map((item, index) => {
          const isActive =
            location.pathname === item.path ||
            (item.path === '/personal/dashboard' && location.pathname === '/personal/dashboard')
          const showProBadge = item.isPremium && isFreeTier

          return (
            <motion.div
              key={item.path}
              initial={{ y: 30, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 380,
                damping: 20,
                delay: 0.12 + index * 0.06,
              }}
            >
              <NavLink
                to={item.path}
                className={({ isActive: navIsActive }) =>
                  `flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[60px] touch-target ${
                    navIsActive || isActive ? 'text-neon-purple' : 'text-gray-400'
                  } ${showProBadge ? 'opacity-75' : ''}`
                }
              >
                <motion.div
                  className="relative"
                  whileHover={{
                    scale: 1.15,
                    y: -2,
                  }}
                  whileTap={{
                    scale: 0.9,
                    y: 0,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 15,
                  }}
                >
                  <item.icon size={20} />
                  {showProBadge && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 20,
                        delay: 0.3 + index * 0.06,
                      }}
                    >
                      <Crown size={10} className="absolute -top-1 -right-1 text-yellow-400" />
                    </motion.div>
                  )}
                </motion.div>
                <motion.span
                  className="text-xs font-medium"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 20,
                    delay: 0.18 + index * 0.06,
                  }}
                >
                  {item.label}
                </motion.span>
              </NavLink>
            </motion.div>
          )
        })}
      </motion.div>
    </motion.nav>
  )
}

export default BottomNav
