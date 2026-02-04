import { Link, Outlet } from 'react-router-dom'
import { Zap } from 'lucide-react'
import MegaNav from './MegaNav'

/**
 * Shared layout for all public marketing pages.
 * Separate from the authenticated app layout (sidebar / MobileLayout).
 * Provides seamless transition from public site to authenticated app via Sign In / Open App.
 */
export default function MarketingLayout() {
  return (
    <div className="min-h-screen bg-os-bg flex flex-col">
      <MegaNav />
      <main className="flex-1 min-h-0">
        <Outlet />
      </main>
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-gray-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-neon-purple to-recording-red rounded-lg">
              <Zap size={16} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-white">SoundPath</span>
            <span className="text-gray-600">|</span>
            <span className="text-xs text-gray-500">Music Industry OS</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link to="/pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</Link>
            <Link to="/resources/help" className="text-gray-400 hover:text-white transition-colors">Help Center</Link>
            <Link to="/resources/contact" className="text-gray-400 hover:text-white transition-colors">Contact</Link>
            <Link to="/terms" className="text-gray-400 hover:text-white transition-colors">Terms</Link>
            <Link to="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy</Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-4 pt-4 border-t border-gray-800/80 text-center sm:text-left">
          <p className="text-gray-500 text-xs">© {new Date().getFullYear()} SoundPath. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
