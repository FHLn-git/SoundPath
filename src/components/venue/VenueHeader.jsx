/**
 * Venue app header: SoundPath | VENUE branding, venue switcher, app switcher (Label / Venue / Artist).
 * In-app navigation (Link) so one SPA, one sign-in.
 */
import { Link } from 'react-router-dom'
import { Building2, Music2, Music, ChevronDown, Plus, Grid3X3 } from 'lucide-react'
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
}) {
  const [venueDropdownOpen, setVenueDropdownOpen] = useState(false)
  const [appDropdownOpen, setAppDropdownOpen] = useState(false)
  const venueRef = useRef(null)
  const appRef = useRef(null)

  useEffect(() => {
    const close = (e) => {
      if (!venueRef.current?.contains(e.target)) setVenueDropdownOpen(false)
      if (!appRef.current?.contains(e.target)) setAppDropdownOpen(false)
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
                  className="absolute left-0 top-full mt-1 w-52 py-2 bg-[#0B0E14] border border-gray-700 rounded-lg shadow-xl z-50"
                >
                  <Link
                    to="/app/label/launchpad"
                    className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                    onClick={() => setAppDropdownOpen(false)}
                  >
                    <Building2 className="w-4 h-4" /> Label
                  </Link>
                  <div className="flex items-center gap-2 px-3 py-2 text-white bg-gray-800">
                    <Music className="w-4 h-4" /> Venue
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 text-gray-500 cursor-not-allowed">
                    <Music className="w-4 h-4" /> Artist
                    <span className="ml-auto text-[10px] text-amber-500 uppercase">Soon</span>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-neon-purple/10 border border-neon-purple/30">
              <Music2 className="w-5 h-5 text-neon-purple" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">
                SoundPath <span className="text-gray-500 font-normal">| VENUE</span>
              </h1>
              <p className="text-xs text-gray-500">Event Management</p>
            </div>

            {/* Venue switcher */}
            {showVenueSwitcher && (
              <div className="relative" ref={venueRef}>
                <button
                  type="button"
                  onClick={() => setVenueDropdownOpen((o) => !o)}
                  className="flex items-center gap-2 min-w-[140px] justify-between px-3 py-2 rounded-lg border border-gray-600 bg-gray-800/80 hover:bg-gray-700 text-left text-sm text-gray-200"
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

          <div className="flex items-center gap-2">
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
