/**
 * SoundPath App Selector – shown after login.
 * Uses absolute subdomain URLs in production (label.soundpath.app, venue.soundpath.app)
 * so the browser switches context; path-based on localhost.
 */
import { Building2, Music, User, LogOut, Zap, FileSignature, Archive, GitBranch } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getAppBaseUrl } from '../lib/appHost'

export default function AppSelector() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const openLabel = () => {
    const url = getAppBaseUrl('label')
    try {
      const targetHost = new URL(url).host
      if (url.startsWith('http') && targetHost !== window.location.host) {
        window.location.href = url
        return
      }
    } catch (_) {}
    navigate('/app/label/launchpad')
  }

  const openVenue = () => {
    const url = getAppBaseUrl('venue')
    try {
      const targetHost = new URL(url).host
      if (url.startsWith('http') && targetHost !== window.location.host) {
        window.location.href = url
        return
      }
    } catch (_) {}
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

        <div className="w-full max-w-3xl space-y-10">
          {/* Core hubs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={openLabel}
              className="flex flex-col items-center gap-4 p-6 rounded-xl border-2 border-gray-700 bg-gray-900/50 hover:border-neon-purple hover:bg-gray-800/50 transition-all text-left group"
            >
              <div className="w-14 h-14 rounded-xl bg-gray-800 flex items-center justify-center group-hover:bg-neon-purple/20 transition-colors">
                <Building2 className="w-7 h-7 text-neon-purple" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Label</h2>
                <p className="text-sm text-gray-400">
                  A&R pipeline, demos, artists, and label workspace.
                </p>
              </div>
              <span className="text-sm text-neon-purple font-medium mt-auto">Open Label app →</span>
            </button>

            <button
              type="button"
              onClick={openVenue}
              className="flex flex-col items-center gap-4 p-6 rounded-xl border-2 border-gray-700 bg-gray-900/50 hover:border-emerald-500 hover:bg-gray-800/50 transition-all text-left group"
            >
              <div className="w-14 h-14 rounded-xl bg-gray-800 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                <Music className="w-7 h-7 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Venue</h2>
                <p className="text-sm text-gray-400">
                  Events, run-of-show, promoter portal, and settlements.
                </p>
              </div>
              <span className="text-sm text-emerald-500 font-medium mt-auto">Open Venue app →</span>
            </button>

            <div className="flex flex-col items-center gap-4 p-6 rounded-xl border-2 border-dashed border-gray-700 bg-gray-900/30 opacity-80 cursor-not-allowed">
              <div className="w-14 h-14 rounded-xl bg-gray-800 flex items-center justify-center">
                <User className="w-7 h-7 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-500 mb-1">Artist</h2>
                <p className="text-sm text-gray-500">
                  Submissions, releases, and artist tools.
                </p>
              </div>
              <span className="text-xs text-amber-400 font-medium mt-auto uppercase">Coming soon</span>
            </div>
          </div>

          {/* Utility apps */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 text-center">Utility apps</h2>
            <p className="text-gray-500 text-sm text-center mb-4 max-w-md mx-auto">
              Deals, catalog, and splits—coming soon. These will be available as add-ons to your hub.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: 'sign', label: 'Sign', description: 'Metadata-aware contracts and deals.', icon: FileSignature },
                { id: 'vault', label: 'Vault', description: 'Catalog and release archive.', icon: Archive },
                { id: 'splits', label: 'Splits', description: 'Royalties and splits per deal.', icon: GitBranch },
              ].map(({ id, label, description, icon: Icon }) => (
                <div
                  key={id}
                  className="flex flex-col items-center gap-4 p-6 rounded-xl border-2 border-dashed border-gray-700 bg-gray-900/30 opacity-80 cursor-not-allowed"
                >
                  <div className="w-14 h-14 rounded-xl bg-gray-800 flex items-center justify-center">
                    <Icon className="w-7 h-7 text-gray-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-500 mb-1">{label}</h2>
                    <p className="text-sm text-gray-500">
                      {description}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 font-medium mt-auto uppercase">Coming soon</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
