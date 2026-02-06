/**
 * Venue – in-app experience. One SoundPath app: same build, same auth, same Supabase.
 * No iframe. Renders Venue UI directly so one deploy works.
 */
import { useState } from 'react'
import { useVenue } from '../hooks/useVenue'
import { useShows } from '../hooks/useShows'
import VenueHeader from '../components/venue/VenueHeader'
import CreateVenueModal from '../components/venue/CreateVenueModal'
import VenueSignIn from '../components/venue/VenueSignIn'
import VenueDashboard from '../components/venue/VenueDashboard'
import VenueDashboardSkeleton from '../components/venue/VenueDashboardSkeleton'
import { VenueCatalogProvider } from '../context/VenueCatalogContext'
import { formatOperationError } from '../lib/formatVenueError'
import { Building2, Plus } from 'lucide-react'

export default function VenueApp() {
  const [currentView, setCurrentView] = useState('venue')
  const [createVenueOpen, setCreateVenueOpen] = useState(false)

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

  const handleVenueCreated = async (venueId) => {
    setActiveVenueId(venueId)
    await refetchVenues()
  }

  // Not signed in – same Supabase session as Label; show sign-in so user uses one account
  if (!venueLoading && !userId) {
    return (
      <div className="venue-app-theme fixed inset-0 flex flex-col bg-gray-950">
        <VenueSignIn />
      </div>
    )
  }

  // Venue fetch error
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
            <div className="rounded-xl border border-gray-700 bg-gray-800/30 p-8 text-center text-gray-500">
              Promoter Portal – coming soon. Use Venue Admin to manage shows.
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
