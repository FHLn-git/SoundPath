"use client"

import { useState, useEffect, useCallback } from "react"
import { listShows } from "./show-api"
import { listOffers } from "./offer-api"

/** Unique artist names from shows (artist_name or first band name) and offers for this venue */
export function useOurArtists(venueId: string | null): string[] {
  const [artists, setArtists] = useState<string[]>([])

  const refetch = useCallback(async () => {
    if (!venueId) {
      setArtists([])
      return
    }
    const [showRows, offerRows] = await Promise.all([
      listShows(venueId, {}),
      listOffers(venueId),
    ])
    const names = new Set<string>()
    showRows.forEach((s) => {
      if (s.artist_name?.trim()) names.add(s.artist_name.trim())
      const bands = Array.isArray(s.bands) ? s.bands : []
      bands.forEach((b: { name?: string }) => {
        if (b?.name?.trim()) names.add(b.name.trim())
      })
    })
    offerRows.forEach((o) => {
      if (o.artist_name?.trim()) names.add(o.artist_name.trim())
    })
    setArtists(Array.from(names).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })))
  }, [venueId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return artists
}
