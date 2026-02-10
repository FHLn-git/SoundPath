"use client"

import { useState, useEffect, useCallback } from "react"
import { listAdvanceTemplates } from "./advance-templates-api"
import type { AdvanceTemplateRow } from "./venue-types"

export function useAdvanceTemplates(venueId: string | null) {
  const [templates, setTemplates] = useState<AdvanceTemplateRow[]>([])
  const [loading, setLoading] = useState(!!venueId)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!venueId) {
      setTemplates([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await listAdvanceTemplates(venueId)
      setTemplates(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [venueId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { templates, loading, error, refetch }
}
