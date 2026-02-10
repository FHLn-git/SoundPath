"use client"

import { useState, useEffect, useCallback } from "react"
import { listAssets } from "./assets-api"
import type { VenueAssetRow } from "./venue-types"

export function useAssets(
  venueId: string | null,
  options?: { showId?: string | null; includeConfidential?: boolean }
) {
  const [assets, setAssets] = useState<VenueAssetRow[]>([])
  const [loading, setLoading] = useState(!!venueId)
  const [error, setError] = useState<Error | null>(null)

  const showId = options?.showId
  const includeConfidential = options?.includeConfidential !== false
  const refetch = useCallback(async () => {
    if (!venueId) {
      setAssets([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const list = await listAssets(venueId, { showId, includeConfidential })
      setAssets(list)
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
      setAssets([])
    } finally {
      setLoading(false)
    }
  }, [venueId, showId, includeConfidential])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { assets, loading, error, refetch }
}
