/**
 * Venue app header: SoundPath | VENUE branding, venue switcher, app switcher (Label / Venue / Artist).
 * In-app navigation (Link) so one SPA, one sign-in.
 */
import { Link } from 'react-router-dom'
import { Building2, Music, ChevronDown, Plus, Grid3X3, FileSignature, Archive, GitBranch, Bell } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { formatVenueAddressLine } from '../../lib/venueApi'

function venueInitials(name) {
  if (!name?.trim()) return '??'
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase().slice(0, 2)
  return name.slice(0, 2).toUpperCase()
}

export default function VenueHeader({
  currentView,
  onViewChange,
  venues = [],
  activeVenue,
  onVenueSelect,
  onOpenCreateVenue,
  notifications = [],
  unreadNotificationCount = 0,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
}) {
  const [venueDropdownOpen, setVenueDropdownOpen] = useState(false)
  const [appDropdownOpen, setAppDropdownOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const venueRef = useRef(null)
  const appRef = useRef(null)

  useEffect(() => {
    const close = (e) => {
      if (!venueRef.current?.contains(e.target)) setVenueDropdownOpen(false)
      if (!appRef.current?.contains(e.target)) setAppDropdownOpen(false)
    if (!e.target.closest('[data-notifications-dropdown]')) setNotificationsOpen(false)
    }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  const showVenueSwitcher = venues.length > 0 || onOpenCreateVenue

  return (
    <header className="border-b border-gray-800 bg-[#0B0E14]/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            {/* App switcher */}
            <div className="relative" ref={appRef}>
              <button
                type="button"
                onClick={() => setAppDropdownOpen((o) => !o)}
                className="flex items-center justify-center h-10 w-10 rounded-lg border border-gray-600 bg-gray-800/80 hover:bg-gray-700 text-gray-300"
                aria-label="App switcher"
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              {appDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute left-0 top-full mt-1 min-w-[18rem] py-2 bg-[#0B0E14] border border-gray-700 rounded-lg shadow-xl z-50 grid grid-cols-[1fr_1fr] gap-0"
                >
                  <div className="py-1">
                    <Link
                      to="/app/label/launchpad"
                      className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                      onClick={() => setAppDropdownOpen(false)}
                    >
                      <Building2 className="w-4 h-4 shrink-0 text-[#a855f7]" /> Label
                    </Link>
                    <div className="flex items-center gap-2 px-3 py-2 text-white bg-gray-800">
                      <Music className="w-4 h-4 shrink-0 text-emerald-500" /> Venue
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 text-gray-500 cursor-not-allowed">
                      <Music className="w-4 h-4 shrink-0 text-amber-400" /> Artist
                      <span className="ml-auto text-[10px] text-amber-400 uppercase">Soon</span>
                    </div>
                  </div>
                  <div className="py-1 border-l border-gray-700 pl-1">
                    {[
                      { label: 'Sign', icon: FileSignature },
                      { label: 'Vault', icon: Archive },
                      { label: 'Splits', icon: GitBranch },
                    ].map(({ label, icon: Icon }) => (
                      <div key={label} className="flex items-center gap-2 px-3 py-2 text-gray-500 cursor-not-allowed">
                        <Icon className="w-4 h-4 shrink-0 text-gray-400" />
                        <span className="flex-1">{label}</span>
                        <span className="text-[10px] text-gray-500 uppercase">Soon</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">
                SoundPath <span className="text-gray-500 font-normal">| VENUE</span>
              </h1>
              <p className="text-xs text-gray-500">Event Management</p>
            </div>

            {/* Venue selector */}
            {showVenueSwitcher && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 hidden sm:inline">Venue</span>
                <div className="relative" ref={venueRef}>
                  <button
                    type="button"
                    onClick={() => setVenueDropdownOpen((o) => !o)}
                    className="flex items-center gap-2 min-w-[140px] justify-between px-3 py-2 rounded-lg border border-gray-600 bg-gray-800/80 hover:bg-gray-700 text-left text-sm text-gray-200"
                    aria-label="Select venue"
                  >
                  <span className="truncate">
                    {activeVenue?.name ?? (venues.length === 0 ? 'No venue' : 'Select venue')}
                  </span>
                  <ChevronDown className="w-4 h-4 shrink-0" />
                </button>
                {venueDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute left-0 top-full mt-1 w-56 py-2 bg-[#0B0E14] border border-gray-700 rounded-lg shadow-xl z-50"
                  >
                    {venues.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          onVenueSelect?.(v.id)
                          setVenueDropdownOpen(false)
                        }}
                        className={`flex items-center gap-2 w-full px-3 py-2 text-left text-sm transition-colors ${
                          activeVenue?.id === v.id ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                        }`}
                      >
                        <Building2 className="w-4 h-4 shrink-0" />
                        {v.name}
                      </button>
                    ))}
                    {onOpenCreateVenue && (
                      <>
                        <div className="my-1 border-t border-gray-700" />
                        <button
                          type="button"
                          onClick={() => {
                            onOpenCreateVenue()
                            setVenueDropdownOpen(false)
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
                        >
                          <Plus className="w-4 h-4 shrink-0" />
                          Create New Venue
                        </button>
                      </>
                    )}
                  </motion.div>
                )}
                </div>
              </div>
            )}
          </div>

          <nav className="flex items-center gap-1 p-1 bg-gray-800/50 rounded-lg">
            <button
              type="button"
              onClick={() => onViewChange('venue')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors gap-2 flex items-center ${
                currentView === 'venue'
                  ? 'bg-neon-purple/20 text-neon-purple'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Venue Admin</span>
            </button>
            <button
              type="button"
              onClick={() => onViewChange('promoter')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors gap-2 flex items-center ${
                currentView === 'promoter'
                  ? 'bg-neon-purple/20 text-neon-purple'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span className="hidden sm:inline">Promoter Portal</span>
            </button>
          </nav>

          <div className="flex items-center gap-2" data-notifications-dropdown>
            {/* Notifications bell */}
            {activeVenue && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotificationsOpen((o) => !o)}
                  className="relative flex items-center justify-center h-10 w-10 rounded-lg border border-gray-600 bg-gray-800/80 hover:bg-gray-700 text-gray-300"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotificationCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-medium text-white">
                      {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                    </span>
                  )}
                </button>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 top-full mt-1 w-80 max-h-[320px] overflow-auto py-2 bg-[#0B0E14] border border-gray-700 rounded-lg shadow-xl z-50"
                  >
                    <div className="px-3 py-1.5 flex items-center justify-between border-b border-gray-700">
                      <span className="text-xs font-medium text-gray-500 uppercase">Notifications</span>
                      {unreadNotificationCount > 0 && (
                        <button type="button" onClick={() => { onMarkAllNotificationsRead?.(); setNotificationsOpen(false) }} className="text-xs text-emerald-500 hover:text-emerald-400">
                          Mark all read
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <p className="px-3 py-4 text-sm text-gray-500">No notifications</p>
                    ) : (
                      notifications.slice(0, 20).map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => { onMarkNotificationRead?.(n.id); if (n.show_id) setNotificationsOpen(false) }}
                          className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${n.read_at ? 'text-gray-500' : 'text-gray-200 bg-gray-800/50'}`}
                        >
                          <p className="font-medium truncate">{n.title}</p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">{n.body}</p>
                        </button>
                      ))
                    )}
                  </motion.div>
                )}
              </div>
            )}
            {activeVenue ? (
              <>
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-medium text-white">{activeVenue.name}</span>
                  {(activeVenue.address || formatVenueAddressLine(activeVenue)) && (
                    <span className="text-xs text-gray-500 truncate max-w-[180px]">
                      {activeVenue.address || formatVenueAddressLine(activeVenue)}
                    </span>
                  )}
                </div>
                <div className="w-8 h-8 rounded-full bg-neon-purple/20 border border-neon-purple/40 flex items-center justify-center">
                  <span className="text-xs font-medium text-neon-purple">
                    {venueInitials(activeVenue.name)}
                  </span>
                </div>
              </>
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-gray-500" />
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
