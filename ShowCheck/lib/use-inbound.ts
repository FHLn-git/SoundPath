"use client"

import { useState, useEffect, useCallback } from "react"
import type { InboundSubmissionRow } from "./venue-types"
import { listInbound } from "./inbound-api"

export type UseInboundOptions = {
  status?: InboundSubmissionRow["status"]
}

export function useInbound(
  venueId: string | null,
  groupId: string | null,
  options: UseInboundOptions = {}
) {
  const { status } = options
  const [submissions, setSubmissions] = useState<InboundSubmissionRow[]>([])
  const [loading, setLoading] = useState(!!(venueId || groupId))
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!venueId && !groupId) {
      setSubmissions([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await listInbound(venueId, groupId, { status })
      setSubmissions(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      setSubmissions([])
    } finally {
      setLoading(false)
    }
  }, [venueId, groupId, status])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { submissions, loading, error, refetch }
}
