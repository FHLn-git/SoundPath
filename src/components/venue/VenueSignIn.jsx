/**
 * Shown when user opens Venue but isn't signed in. One ecosystem = same sign-in as Label.
 * Links to main app sign-in/signup.
 */
import { Link } from 'react-router-dom'
import { Music2, LogIn, UserPlus } from 'lucide-react'

export default function VenueSignIn() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm mx-auto rounded-xl border border-gray-700 bg-[#0B0E14] p-6 shadow-xl">
        <div className="flex flex-col items-center gap-2 text-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-neon-purple/10 border border-neon-purple/30">
            <Music2 className="h-6 w-6 text-neon-purple" />
          </div>
          <h2 className="text-lg font-semibold text-white">SoundPath | VENUE</h2>
          <p className="text-sm text-gray-500">
            Sign in with your universal SoundPath account to manage venues and shows.
          </p>
        </div>
        <div className="space-y-3">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg bg-neon-purple text-white font-medium hover:bg-neon-purple/90 transition-colors"
          >
            <LogIn className="h-4 w-4" />
            Sign in
          </Link>
          <Link
            to="/signup"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg border border-gray-600 text-gray-300 font-medium hover:bg-gray-800 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Create account
          </Link>
        </div>
      </div>
    </div>
  )
}
