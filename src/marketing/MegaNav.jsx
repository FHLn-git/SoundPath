import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  ChevronDown,
  Menu,
  X,
  Building2,
  Music,
  UserCircle,
  Briefcase,
  FileSignature,
  Archive,
  GitBranch,
  HelpCircle,
  BookOpen,
  Mail,
  LayoutGrid,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/* Solutions = the dream/conceptualization. Short copy for mega-menu. */
const SOLUTIONS = [
  { id: 'labels', label: 'Labels', href: '/solutions/labels', icon: Building2, description: 'Modernize your A&R pipeline' },
  { id: 'venues', label: 'Venues', href: '/solutions/venues', icon: Music, description: 'Unify booking, capacity & calendar' },
  { id: 'artists', label: 'Artists', href: '/solutions/artists', icon: UserCircle, description: 'One portfolio for pitches & deals' },
  { id: 'agents', label: 'Agents', href: '/solutions/agents', icon: Briefcase, description: 'Roster, deals & commissions in sync' },
]

/* Products = the reality/sales. Short copy for mega-menu. */
const CORE_HUBS = [
  { id: 'label', label: 'Label', href: '/products/label', icon: Building2, description: 'A&R pipeline from inbox to vault' },
  { id: 'venue', label: 'Venue', href: '/products/venue', icon: Music, description: 'Booking & capacity hub for venues' },
  { id: 'artist', label: 'Artist', href: '/products/artist', icon: UserCircle, description: 'Portfolio & deal hub (coming soon)' },
]

const UTILITY_APPS = [
  { id: 'sign', label: 'Sign', href: '/products/sign', icon: FileSignature, description: 'Metadata-aware contract engine' },
  { id: 'vault', label: 'Vault', href: '/products/vault', icon: Archive, description: 'Catalog & release archive' },
  { id: 'splits', label: 'Splits', href: '/products/splits', icon: GitBranch, description: 'Royalties & splits tied to deals' },
]

const RESOURCES = [
  { id: 'faq', label: 'FAQ', href: '/resources/faq', icon: HelpCircle },
  { id: 'help', label: 'Help Center', href: '/resources/help', icon: BookOpen },
  { id: 'contact', label: 'Contact', href: '/resources/contact', icon: Mail },
]

function Dropdown({ label, children, open, onOpen, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, onClose])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => onOpen(label)}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-white/5"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {label}
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 pt-1 z-50"
            style={{ minWidth: 'min(90vw, 520px)' }}
          >
            <div className="rounded-xl border border-white/10 bg-[#0B0E14]/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function MegaNav() {
  const navigate = useNavigate()
  const { user, staffProfile } = useAuth()
  const [openDropdown, setOpenDropdown] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const closeDropdown = () => setOpenDropdown(null)

  const handleNav = (path) => {
    navigate(path)
    setMobileMenuOpen(false)
    closeDropdown()
  }

  const defaultRoute = '/app/label/launchpad'

  return (
    <header
      className="sticky top-0 z-50 border-b border-white/10"
      style={{
        background: 'rgba(11, 14, 20, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 1px 0 0 rgba(255,255,255,0.06)',
      }}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 shrink-0"
            onClick={() => { setMobileMenuOpen(false); closeDropdown(); }}
          >
            <div className="p-2 bg-gradient-to-br from-neon-purple to-recording-red rounded-lg">
              <Zap size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white">SoundPath</span>
          </Link>

          {/* Desktop: Fat nav items */}
          <div className="hidden lg:flex items-center gap-1">
            <Dropdown
              label="Solutions"
              open={openDropdown === 'Solutions'}
              onOpen={setOpenDropdown}
              onClose={closeDropdown}
            >
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-1">
                {SOLUTIONS.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.id}
                      to={item.href}
                      onClick={closeDropdown}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <div className="p-1.5 rounded-lg bg-neon-purple/20 shrink-0">
                        <Icon className="w-4 h-4 text-neon-purple" />
                      </div>
                      <div className="text-left min-w-0">
                        <div className="font-medium text-white">{item.label}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </Dropdown>

            <Dropdown
              label="Products"
              open={openDropdown === 'Products'}
              onOpen={setOpenDropdown}
              onClose={closeDropdown}
            >
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 tracking-wider">Core Hubs</div>
                  {CORE_HUBS.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.id}
                        to={item.href}
                        onClick={closeDropdown}
                        className="flex items-start gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <Icon className="w-4 h-4 text-neon-purple shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <span className="font-medium text-white">{item.label}</span>
                          <span className="block text-xs text-gray-500 mt-0.5">{item.description}</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
                <div>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 tracking-wider">Utility Apps</div>
                  {UTILITY_APPS.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.id}
                        to={item.href}
                        onClick={closeDropdown}
                        className="flex items-start gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <Icon className="w-4 h-4 text-neon-purple shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <span className="font-medium text-white">{item.label}</span>
                          <span className="block text-xs text-gray-500 mt-0.5">{item.description}</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </Dropdown>

            <Link
              to="/pricing"
              onClick={closeDropdown}
              className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              Pricing
            </Link>

            <Dropdown
              label="Resources"
              open={openDropdown === 'Resources'}
              onOpen={setOpenDropdown}
              onClose={closeDropdown}
            >
              <div className="py-2">
                {RESOURCES.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.id}
                      to={item.href}
                      onClick={closeDropdown}
                      className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <Icon className="w-4 h-4 text-neon-purple" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </Dropdown>
          </div>

          {/* CTAs */}
          <div className="hidden lg:flex items-center gap-3">
            {user && staffProfile ? (
              <button
                type="button"
                onClick={() => handleNav(defaultRoute)}
                className="px-4 py-2 text-sm font-semibold text-gray-300 hover:text-white border border-gray-600 rounded-lg hover:border-gray-500 transition-colors"
              >
                Open App
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    closeDropdown()
                    navigate('/', { state: { openLogin: true } })
                  }}
                  className="px-4 py-2 text-sm font-semibold text-gray-300 hover:text-white border border-gray-600 rounded-lg hover:border-gray-500 transition-colors"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => handleNav('/signup')}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-opacity bg-gradient-to-r from-neon-purple to-recording-red hover:opacity-90"
                >
                  Secure Alpha Access
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((o) => !o)}
            className="lg:hidden p-2 text-gray-300 hover:text-white rounded-lg"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile mega menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden overflow-hidden border-t border-white/10"
            >
              <div className="py-4 space-y-4">
                <div>
                  <div className="px-3 text-xs font-semibold text-gray-500 tracking-wider mb-2">Solutions</div>
                  <div className="space-y-1">
                    {SOLUTIONS.map((item) => {
                      const Icon = item.icon
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleNav(item.href)}
                          className="w-full flex items-start gap-2 p-3 rounded-lg bg-white/5 text-left hover:bg-white/10"
                        >
                          <Icon className="w-4 h-4 text-neon-purple shrink-0 mt-0.5" />
                          <div>
                            <span className="text-sm font-medium text-white">{item.label}</span>
                            <span className="block text-xs text-gray-500 mt-0.5">{item.description}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <div className="px-3 text-xs font-semibold text-gray-500 tracking-wider mb-2">Products</div>
                  <div className="space-y-1">
                    <div className="px-3 py-1 text-[10px] font-semibold text-gray-500">Core Hubs</div>
                    {CORE_HUBS.map((item) => {
                      const Icon = item.icon
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleNav(item.href)}
                          className="w-full flex items-start gap-2 p-3 rounded-lg bg-white/5 text-left hover:bg-white/10"
                        >
                          <Icon className="w-4 h-4 text-neon-purple shrink-0 mt-0.5" />
                          <div>
                            <span className="text-sm font-medium text-white">{item.label}</span>
                            <span className="block text-xs text-gray-500 mt-0.5">{item.description}</span>
                          </div>
                        </button>
                      )
                    })}
                    <div className="px-3 py-1 text-[10px] font-semibold text-gray-500 mt-2">Utility Apps</div>
                    {UTILITY_APPS.map((item) => {
                      const Icon = item.icon
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleNav(item.href)}
                          className="w-full flex items-start gap-2 p-3 rounded-lg bg-white/5 text-left hover:bg-white/10"
                        >
                          <Icon className="w-4 h-4 text-neon-purple shrink-0 mt-0.5" />
                          <div>
                            <span className="text-sm font-medium text-white">{item.label}</span>
                            <span className="block text-xs text-gray-500 mt-0.5">{item.description}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleNav('/pricing')}
                  className="w-full flex items-center gap-2 px-3 py-3 rounded-lg bg-white/5 text-left hover:bg-white/10"
                >
                  <LayoutGrid className="w-4 h-4 text-neon-purple" />
                  <span className="font-medium text-white">Pricing</span>
                </button>
                <div>
                  <div className="px-3 text-xs font-semibold text-gray-500 tracking-wider mb-2">Resources</div>
                  <div className="space-y-1">
                    {RESOURCES.map((item) => {
                      const Icon = item.icon
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleNav(item.href)}
                          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-gray-300 hover:bg-white/5 hover:text-white"
                        >
                          <Icon className="w-4 h-4 text-neon-purple" />
                          {item.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="pt-4 border-t border-white/10 flex gap-3">
                  {user && staffProfile ? (
                    <button
                      type="button"
                      onClick={() => handleNav(defaultRoute)}
                      className="flex-1 py-3 rounded-lg font-semibold bg-gradient-to-r from-neon-purple to-recording-red text-white"
                    >
                      Open App
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false)
                          closeDropdown()
                          navigate('/', { state: { openLogin: true } })
                        }}
                        className="flex-1 py-3 rounded-lg font-semibold border border-gray-600 text-gray-300"
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => handleNav('/signup')}
                        className="flex-1 py-3 rounded-lg font-semibold bg-gradient-to-r from-neon-purple to-recording-red text-white"
                      >
                        Secure Alpha Access
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  )
}
