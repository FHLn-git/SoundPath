"use client"

import { useState, useEffect, useCallback } from "react"
import type { OfferRow } from "./venue-types"
import { listOffers } from "./offer-api"

export type UseOffersOptions = {
  status?: OfferRow["status"]
  stageId?: string | null
}

export function useOffers(venueId: string | null, options: UseOffersOptions = {}) {
  const { status, stageId } = options
  const [offers, setOffers] = useState<OfferRow[]>([])
  const [loading, setLoading] = useState(!!venueId)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!venueId) {
      setOffers([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await listOffers(venueId, { status, stageId })
      setOffers(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      setOffers([])
    } finally {
      setLoading(false)
    }
  }, [venueId, status, stageId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { offers, loading, error, refetch }
}
