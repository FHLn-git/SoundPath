"use client"

import { createContext, useContext, useCallback, useState } from "react"
import { EventProvider, type Event } from "@/components/event-context"
import { useVenue } from "@/lib/use-venue"
import { useShows } from "@/lib/use-shows"
import { upsertShow, deleteShow } from "@/lib/show-api"
import { VenueSignIn } from "@/components/venue-sign-in"
import { formatOperationError } from "@/lib/format-error"

type VenueDataContextValue = {
  loading: boolean
  error: Error | null
  /** When true, calendar shows shows from all child stages (stages = child orgs of venue org) */
  multiStageView: boolean
  setMultiStageView: (v: boolean) => void
  /** Stage org id -> name for display (when venue has organization_id) */
  stageNames: Record<string, string>
  /** Refetch shows/events (e.g. after accepting an offer) */
  refetchEvents: () => Promise<void>
}

const VenueDataContext = createContext<VenueDataContextValue | undefined>(undefined)

export function useVenueData() {
  const ctx = useContext(VenueDataContext)
  return (
    ctx ?? {
      loading: false,
      error: null,
      multiStageView: false,
      setMultiStageView: () => {},
      stageNames: {},
      refetchEvents: async () => {},
    }
  )
}

interface VenueDataProviderProps {
  children: React.ReactNode
}

export function VenueDataProvider({ children }: VenueDataProviderProps) {
  const { activeVenueId, activeVenue, userId, loading: venueLoading, error: venueError } =
    useVenue()
  const [multiStageView, setMultiStageView] = useState(false)
  const venueOrgId = activeVenue?.organization_id ?? null
  const { shows, loading: showsLoading, refetch, stageNames } = useShows(activeVenueId, {
    multiStage: multiStageView,
    venueOrgId,
  })

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

  const refetchEvents = useCallback(async () => {
    await refetch()
  }, [refetch])

  return (
    <VenueDataContext.Provider
      value={{
        loading,
        error: venueError,
        multiStageView,
        setMultiStageView,
        stageNames,
        refetchEvents,
      }}
    >
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
