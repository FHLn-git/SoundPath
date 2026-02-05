"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "./supabase"
import type { Venue } from "./venue-types"

const ACTIVE_VENUE_KEY = "showcheck_active_venue_id"

export function useVenue() {
  const [userId, setUserId] = useState<string | null>(null)
  const [venues, setVenues] = useState<Venue[]>([])
  const [activeVenueId, setActiveVenueIdState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetchVenues = useCallback(async () => {
    if (!supabase) {
      setVenues([])
      setLoading(false)
      return
    }
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      setUserId(null)
      setVenues([])
      setActiveVenueIdState(null)
      setLoading(false)
      // No session = not signed in; don't treat as an error (avoid "Auth session missing!").
      const isSessionMissing = !user || authError?.message?.toLowerCase().includes("session")
      if (authError && !isSessionMissing) setError(authError as Error)
      else setError(null)
      return
    }
    setUserId(user.id)
    setError(null)

    const { data: rows, error: fetchError } = await supabase
      .from("venues")
      .select("*")
      .eq("owner_id", user.id)
      .order("name")

    if (fetchError) {
      setError(fetchError as Error)
      setVenues([])
      setLoading(false)
      return
    }
    setVenues((rows as Venue[]) ?? [])
    const stored = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_VENUE_KEY) : null
    const firstId = (rows as Venue[])?.[0]?.id ?? null
    const active = stored && (rows as Venue[]).some((v) => v.id === stored) ? stored : firstId
    setActiveVenueIdState(active)
    setLoading(false)
  }, [])

  useEffect(() => {
    refetchVenues()
  }, [refetchVenues])

  const setActiveVenueId = useCallback((id: string | null) => {
    setActiveVenueIdState(id)
    if (typeof window !== "undefined") {
      if (id) localStorage.setItem(ACTIVE_VENUE_KEY, id)
      else localStorage.removeItem(ACTIVE_VENUE_KEY)
    }
  }, [])

  const activeVenue = activeVenueId && venues.length ? venues.find((v) => v.id === activeVenueId) ?? null : null

  return {
    userId,
    venues,
    activeVenue,
    activeVenueId,
    setActiveVenueId,
    loading,
    error,
    refetchVenues,
  }
}
