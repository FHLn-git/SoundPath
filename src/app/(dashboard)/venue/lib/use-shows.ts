"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "./supabase"
import type { ShowRow } from "./venue-types"
import { showRowToEvent } from "./show-mapping"
import type { Event } from "@/components/event-context"

export function useShows(venueId: string | null) {
  const [shows, setShows] = useState<Event[]>([])
  const [loading, setLoading] = useState(!!venueId)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!supabase || !venueId) {
      setShows([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from("shows")
      .select("*")
      .eq("venue_id", venueId)
      .order("date", { ascending: true })

    if (fetchError) {
      setError(fetchError as Error)
      setShows([])
      setLoading(false)
      return
    }
    setShows(((data as ShowRow[]) ?? []).map(showRowToEvent))
    setLoading(false)
  }, [venueId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { shows, loading, error, refetch }
}
