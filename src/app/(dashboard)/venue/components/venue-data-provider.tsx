"use client"

import { createContext, useContext, useCallback } from "react"
import { EventProvider, type Event } from "@/components/event-context"
import { useVenue } from "@/lib/use-venue"
import { useShows } from "@/lib/use-shows"
import { upsertShow, deleteShow } from "@/lib/show-api"
import { VenueSignIn } from "@/components/venue-sign-in"
import { formatOperationError } from "@/lib/format-error"

type VenueDataContextValue = {
  loading: boolean
  error: Error | null
}

const VenueDataContext = createContext<VenueDataContextValue | undefined>(undefined)

export function useVenueData() {
  const ctx = useContext(VenueDataContext)
  return ctx ?? { loading: false, error: null }
}

interface VenueDataProviderProps {
  children: React.ReactNode
}

export function VenueDataProvider({ children }: VenueDataProviderProps) {
  const { activeVenueId, userId, loading: venueLoading, error: venueError } = useVenue()
  const { shows, loading: showsLoading, refetch } = useShows(activeVenueId)

  const onPersistEvent = useCallback(
    async (event: Event) => {
      if (!activeVenueId) return null
      const updated = await upsertShow(activeVenueId, event)
      await refetch()
      return updated
    },
    [activeVenueId, refetch]
  )

  const onDeleteEvent = useCallback(
    async (id: string) => {
      await deleteShow(id)
      await refetch()
    },
    [refetch]
  )

  const loading = venueLoading || (!!activeVenueId && showsLoading)

  if (venueError) {
    const message = formatOperationError(venueError, {
      operation: "Load venues",
      fallbackReason: "Check your connection and sign-in, then try again.",
    })
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4 max-w-md mx-auto">
        <p className="text-destructive font-medium mb-1">Couldn’t load venues</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    )
  }

  if (!venueLoading && !userId) {
    return <VenueSignIn />
  }

  return (
    <VenueDataContext.Provider value={{ loading, error: venueError }}>
      <EventProvider
        initialEvents={activeVenueId ? shows : undefined}
        venueId={activeVenueId}
        onPersistEvent={activeVenueId ? onPersistEvent : undefined}
        onDeleteEvent={activeVenueId ? onDeleteEvent : undefined}
      >
        {children}
      </EventProvider>
    </VenueDataContext.Provider>
  )
}
