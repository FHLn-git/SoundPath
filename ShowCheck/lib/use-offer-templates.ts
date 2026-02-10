"use client"

import { useState, useEffect, useCallback } from "react"
import type { OfferTemplateRow } from "./venue-types"
import { listOfferTemplates } from "./offer-templates-api"

export function useOfferTemplates(
  venueId: string | null,
  venueGroupId: string | null
) {
  const [templates, setTemplates] = useState<OfferTemplateRow[]>([])
  const [loading, setLoading] = useState(!!(venueId || venueGroupId))
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!venueId && !venueGroupId) {
      setTemplates([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await listOfferTemplates(venueId, venueGroupId)
      setTemplates(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [venueId, venueGroupId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { templates, loading, error, refetch }
}
