import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Grid3X3, Building2, Music } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getAppBaseUrl } from '../lib/appHost'
import ComingSoonModal from './ComingSoonModal'

/**
 * Shared app switcher: grid icon button + dropdown (Label, Venue, Artist).
 * Uses absolute URLs: subdomains in production (https://label.soundpath.app, etc.),
 * same-origin paths on localhost (/app/label/launchpad, /app/venue). Ensures browser
 * switches context correctly when moving between Label and Venue apps.
 */
export default function AppSwitcher({ variant = 'default', className = '' }) {
  const location = useLocation()
  const { activeOrgId } = useAuth()
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [comingSoonApp, setComingSoonApp] = useState(null)
  const buttonRef = useRef(null)

  const isCompact = variant === 'compact'
  const path = location.pathname
  const isLabelPath = path.startsWith('/app/label') || path.startsWith('/label')
  const isVenuePath = path.startsWith('/app/venue') || path === '/venue' || path.startsWith('/venue/')

  const labelUrl = getAppBaseUrl('label')
  const venueUrl = getAppBaseUrl('venue')

  const comingSoonReturnPath = activeOrgId
    ? `/app/label/labels/${activeOrgId}`
    : '/app/label/launchpad'

  useEffect(() => {
    if (!open || !buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    setPosition({ top: rect.bottom + 4, left: rect.left })
  }, [open])

  useEffect(() => {
    setOpen(false)
  }, [path])

  const closeDropdown = () => setOpen(false)

  const handleArtist = (e) => {
    e.preventDefault()
    setOpen(false)
    setComingSoonApp('artist')
  }

  const dropdownContent = (
    <>
      <div
        className="fixed inset-0 z-[100]"
        aria-hidden
        onClick={closeDropdown}
      />
      <motion.div
        role="menu"
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed z-[101] w-52 py-2 bg-[#0B0E14] border border-gray-700 rounded-lg shadow-xl"
        style={{ top: position.top, left: position.left }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <a
          href={labelUrl}
          onClick={closeDropdown}
          className={`flex items-center gap-2 px-3 py-2 text-left transition-colors block w-full ${
            isLabelPath ? 'text-white bg-gray-800' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <Building2 size={18} /> Label
        </a>
        <a
          href={venueUrl}
          onClick={closeDropdown}
          className={`flex items-center gap-2 px-3 py-2 text-left transition-colors block w-full ${
            isVenuePath ? 'text-white bg-gray-800' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <Music size={18} /> Venue
        </a>
        <button
          type="button"
          onClick={handleArtist}
          className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-400 hover:bg-gray-800 hover:text-white"
        >
          <Music size={18} /> Artist <span className="ml-auto text-[10px] text-amber-400 uppercase">Soon</span>
        </button>
      </motion.div>
    </>
  )

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={
          className ||
          (isCompact
            ? 'flex items-center justify-center w-10 h-10 rounded-lg bg-[#0B0E14] border border-gray-700 hover:border-gray-600 transition-colors'
            : 'flex-shrink-0 p-1.5 rounded-lg bg-[#0B0E14] border border-gray-700 hover:border-gray-600 transition-colors')
        }
        aria-label="App switcher"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Grid3X3 size={isCompact ? 20 : 18} className="text-gray-300" />
      </button>
      {open && createPortal(dropdownContent, document.body)}
      <ComingSoonModal
        isOpen={comingSoonApp !== null}
        onClose={() => setComingSoonApp(null)}
        appName={comingSoonApp === 'artist' ? 'Artist' : 'App'}
        returnPath={comingSoonReturnPath}
      />
    </>
  )
}
