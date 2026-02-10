/**
 * Venue – SoundPath Venue app.
 * When VITE_VENUE_APP_URL is set (or in dev we default to ShowCheck on :3001),
 * we load the new Venue app (ShowCheck) in an iframe. Otherwise we show the legacy dashboard.
 * Same auth/Supabase: iframe is same-origin or receives session via cookie when possible.
 */
import { useState } from 'react'
import { useVenue } from '../hooks/useVenue'
import { useShows } from '../hooks/useShows'
import { useVenueNotifications } from '../hooks/useVenueNotifications'
import VenueHeader from '../components/venue/VenueHeader'
import CreateVenueModal from '../components/venue/CreateVenueModal'
import VenueSignIn from '../components/venue/VenueSignIn'
import VenueDashboard from '../components/venue/VenueDashboard'
import VenueDashboardSkeleton from '../components/venue/VenueDashboardSkeleton'
import { VenueCatalogProvider } from '../context/VenueCatalogContext'
import { formatOperationError } from '../lib/formatVenueError'
import { Building2, Plus } from 'lucide-react'

const DEFAULT_VENUE_APP_URL_DEV = 'http://localhost:3001'

function getVenueAppUrl() {
  const env = import.meta.env.VITE_VENUE_APP_URL
  if (env && String(env).trim() !== '') return String(env).trim()
  if (import.meta.env.DEV) return DEFAULT_VENUE_APP_URL_DEV
  return null
}

export default function VenueApp() {
  const [currentView, setCurrentView] = useState('venue')
  const [createVenueOpen, setCreateVenueOpen] = useState(false)

  const venueAppUrl = getVenueAppUrl()
  const useNewVenue = !!venueAppUrl

  const {
    userId,
    venues,
    activeVenue,
    activeVenueId,
    setActiveVenueId,
    loading: venueLoading,
    error: venueError,
    refetchVenues,
  } = useVenue()

  const { shows, loading: showsLoading, refetch: refetchShows } = useShows(activeVenueId)
  const { notifications, unreadCount: unreadNotificationCount, markAsRead: onMarkNotificationRead, markAllAsRead: onMarkAllNotificationsRead } = useVenueNotifications(activeVenueId)

  const handleVenueCreated = async (venueId) => {
    setActiveVenueId(venueId)
    await refetchVenues()
  }

  // New Venue (ShowCheck) in iframe – full viewport; ShowCheck has its own header and auth
  if (useNewVenue) {
    return (
      <div className="venue-app-theme fixed inset-0 flex flex-col bg-[#0B0E14]">
        <iframe
          src={venueAppUrl}
          title="SoundPath Venue"
          className="w-full flex-1 border-0"
          allow="same-origin"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    )
  }

  // Legacy Venue (in-app): same Supabase session
  if (!venueLoading && !userId) {
    return (
      <div className="venue-app-theme fixed inset-0 flex flex-col bg-gray-950">
        <VenueSignIn />
      </div>
    )
  }

  if (venueError) {
    const message = formatOperationError(venueError, {
      operation: 'Load venues',
      fallbackReason: 'Check your connection and sign-in, then try again.',
    })
    return (
      <div className="venue-app-theme fixed inset-0 flex flex-col bg-gray-950">
        <div className="flex flex-col items-center justify-center py-20 text-center px-4 max-w-md mx-auto">
          <p className="text-red-400 font-medium mb-1">Couldn't load venues</p>
          <p className="text-sm text-gray-500">{message}</p>
        </div>
      </div>
    )
  }

  const loading = venueLoading || (activeVenueId && showsLoading)

  return (
    <div className="venue-app-theme fixed inset-0 flex flex-col bg-gray-950">
      <VenueHeader
        currentView={currentView}
        onViewChange={setCurrentView}
        venues={venues}
        activeVenue={activeVenue}
        onVenueSelect={setActiveVenueId}
        onOpenCreateVenue={() => setCreateVenueOpen(true)}
        notifications={notifications}
        unreadNotificationCount={unreadNotificationCount}
        onMarkNotificationRead={onMarkNotificationRead}
        onMarkAllNotificationsRead={onMarkAllNotificationsRead}
      />

      <main className="flex-1 overflow-auto">
        {loading && (
          <div className="container mx-auto px-4 py-6">
            <VenueDashboardSkeleton />
          </div>
        )}

        {!loading && venues.length === 0 && (
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-neon-purple/10 mb-4">
                <Building2 className="w-8 h-8 text-neon-purple" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">No venue yet</h2>
              <p className="text-gray-500 mb-6">
                Create your first performance space to start managing shows, calendar, and payouts.
              </p>
              <button
                type="button"
                onClick={() => setCreateVenueOpen(true)}
                className="flex items-center gap-2 px-4 py-3 rounded-lg bg-neon-purple text-white font-medium hover:bg-neon-purple/90"
              >
                <Plus className="w-4 h-4" />
                Create New Venue
              </button>
            </div>
          </div>
        )}

        {!loading && venues.length > 0 && currentView === 'venue' && (
          <div className="container mx-auto px-4 py-6">
            <VenueCatalogProvider>
              <VenueDashboard
                activeVenueId={activeVenueId}
                activeVenue={activeVenue}
                venues={venues}
                shows={shows}
                loading={showsLoading && !!activeVenueId}
                refetchShows={refetchShows}
                refetchVenues={refetchVenues}
                setActiveVenueId={setActiveVenueId}
              />
            </VenueCatalogProvider>
          </div>
        )}

        {!loading && venues.length > 0 && currentView === 'promoter' && (
          <div className="container mx-auto px-4 py-6">
            <div className="rounded-xl border border-gray-700 bg-gray-800/30 p-8 text-center">
              <p className="text-gray-500 mb-4">View and manage all your invited shows in one place.</p>
              <a href={window.location.pathname.startsWith('/app/') ? '/app/portal/promoter' : '/portal/promoter'} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600">
                Open Promoter Portal
              </a>
            </div>
          </div>
        )}
      </main>

      <CreateVenueModal
        open={createVenueOpen}
        onOpenChange={setCreateVenueOpen}
        onCreated={handleVenueCreated}
      />
    </div>
  )
}
