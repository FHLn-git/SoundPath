/**
 * SoundPath App Selector – shown after login.
 * Unified behavior: open apps inside SoundPath (no cross-domain token handoff).
 */
import { Building2, Music, User, LogOut, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AppSelector() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const openLabel = () => {
    navigate('/app/label/launchpad')
  }

  const openVenue = () => {
    navigate('/app/venue')
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white flex flex-col">
      <header className="border-b border-gray-800 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-7 h-7 text-amber-400" />
          <span className="text-xl font-bold">SoundPath</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400 truncate max-w-[140px] md:max-w-[200px]" title={user?.email}>
            {user?.email}
          </span>
          <button
            type="button"
            onClick={() => signOut()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white text-sm"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">
          Choose your app
        </h1>
        <p className="text-gray-400 text-center mb-10 max-w-md">
          Open the app you want to use. You’re already signed in—no need to log in again.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
          <button
            type="button"
            onClick={openLabel}
            className="flex flex-col items-center gap-4 p-6 rounded-xl border-2 border-gray-700 bg-gray-900/50 hover:border-[#a855f7] hover:bg-gray-800/50 transition-all text-left group"
          >
            <div className="w-14 h-14 rounded-xl bg-gray-800 flex items-center justify-center group-hover:bg-[#a855f7]/20 transition-colors">
              <Building2 className="w-7 h-7 text-[#a855f7]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Label</h2>
              <p className="text-sm text-gray-400">
                A&R pipeline, demos, artists, and label workspace.
              </p>
            </div>
            <span className="text-sm text-[#a855f7] font-medium mt-auto">Open Label app →</span>
          </button>

          <button
            type="button"
            onClick={openVenue}
            className="flex flex-col items-center gap-4 p-6 rounded-xl border-2 border-gray-700 bg-gray-900/50 hover:border-[#a855f7] hover:bg-gray-800/50 transition-all text-left group"
          >
            <div className="w-14 h-14 rounded-xl bg-gray-800 flex items-center justify-center group-hover:bg-[#a855f7]/20 transition-colors">
              <Music className="w-7 h-7 text-[#a855f7]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Venue</h2>
              <p className="text-sm text-gray-400">
                Events, run-of-show, promoter portal, and settlements.
              </p>
            </div>
            <span className="text-sm text-[#a855f7] font-medium mt-auto">Open Venue app →</span>
          </button>

          <div className="flex flex-col items-center gap-4 p-6 rounded-xl border-2 border-dashed border-gray-700 bg-gray-900/30 opacity-80 cursor-not-allowed">
            <div className="w-14 h-14 rounded-xl bg-gray-800 flex items-center justify-center">
              <User className="w-7 h-7 text-gray-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-500 mb-1">Artist</h2>
              <p className="text-sm text-gray-500">
                Submissions, releases, and artist tools.
              </p>
            </div>
            <span className="text-xs text-amber-400/90 font-medium mt-auto uppercase">Coming soon</span>
          </div>
        </div>
      </main>
    </div>
  )
}
