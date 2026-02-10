/**
 * Promoter Portal: Dashboard Lite – list of all shows the promoter is invited to (current and historical).
 * Route: /portal/promoter and /app/portal/promoter
 */
import { Link, useNavigate } from 'react-router-dom'
import { usePromoterShows } from '../hooks/usePromoterShows'
import { useAuth } from '../context/AuthContext'
import { Calendar, Clock, ChevronRight, AlertCircle } from 'lucide-react'

const base = (path = '') => (window.location.pathname.startsWith('/app/') ? `/app/portal/promoter${path}` : `/portal/promoter${path}`)

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function statusBadge(status, approvalStatuses) {
  const anyPending = [approvalStatuses?.productionApprovalStatus, approvalStatuses?.hospitalityApprovalStatus, approvalStatuses?.scheduleApprovalStatus].some((s) => s === 'PENDING_APPROVAL')
  if (status === 'completed') return { label: 'Completed', className: 'bg-gray-500/20 text-gray-400' }
  if (status === 'confirmed' && !anyPending) return { label: 'Confirmed', className: 'bg-green-500/20 text-green-400' }
  if (status === 'pending-approval' || anyPending) return { label: 'Pending approval', className: 'bg-amber-500/20 text-amber-400' }
  return { label: 'Draft', className: 'bg-gray-600 text-gray-400' }
}

export default function PromoterPortalPage() {
  const navigate = useNavigate()
  const { user } = useAuth?.() ?? {}
  const { shows, loading, error, refetch } = usePromoterShows()

  if (!user) {
    navigate('/')
    return null
  }

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = shows.filter((s) => s.date >= today)
  const past = shows.filter((s) => s.date < today)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900/50 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Promoter Portal</h1>
            <p className="text-sm text-gray-500">Your shows across SoundPath</p>
          </div>
          <a href="/" className="text-sm text-gray-400 hover:text-white">SoundPath</a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading && (
          <div className="flex items-center justify-center py-12 text-gray-500">Loading your shows…</div>
        )}
        {error && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 text-red-400 mb-6">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error.message}</span>
          </div>
        )}
        {!loading && !error && shows.length === 0 && (
          <div className="text-center py-16">
            <Calendar className="w-12 h-12 mx-auto text-gray-600 mb-4" />
            <h2 className="text-lg font-medium text-gray-300 mb-2">No shows yet</h2>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              When a venue invites you to advance a show, it will appear here. Use the link from your invitation email to get started.
            </p>
          </div>
        )}
        {!loading && !error && shows.length > 0 && (
          <div className="space-y-8">
            {upcoming.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Upcoming</h2>
                <ul className="space-y-2">
                  {upcoming.map((show) => {
                    const badge = statusBadge(show.status, show)
                    return (
                      <li key={show.id}>
                        <Link
                          to={base(`/show/${show.id}`)}
                          className="flex items-center gap-4 p-4 rounded-xl border border-gray-700 bg-gray-800/30 hover:border-gray-600 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">{show.name}</p>
                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3.5 h-3.5" />
                              {formatDate(show.date)}
                              {show.doors && ` · Doors ${show.doors}`}
                            </p>
                          </div>
                          <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${badge.className}`}>
                            {badge.label}
                          </span>
                          <ChevronRight className="w-5 h-5 text-gray-500 shrink-0" />
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Past</h2>
                <ul className="space-y-2">
                  {past.map((show) => {
                    const badge = statusBadge(show.status, show)
                    return (
                      <li key={show.id}>
                        <Link
                          to={base(`/show/${show.id}`)}
                          className="flex items-center gap-4 p-4 rounded-xl border border-gray-700 bg-gray-800/30 hover:border-gray-600 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">{show.name}</p>
                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3.5 h-3.5" />
                              {formatDate(show.date)}
                            </p>
                          </div>
                          <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${badge.className}`}>
                            {badge.label}
                          </span>
                          <ChevronRight className="w-5 h-5 text-gray-500 shrink-0" />
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
