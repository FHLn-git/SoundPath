"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "./supabase"
import type { ShowRow, ShowStatus } from "./venue-types"
import { showRowToEvent } from "./show-mapping"
import type { Event } from "@/components/event-context"

/** Filter by lifecycle status; 'past' = date < today (computed client-side or via date range) */
export type ShowStatusFilter = ShowStatus | "past" | null

export type UseShowsOptions = {
  /** When true and venueOrgId set, include shows from all child stages (multi-stage view) */
  multiStage?: boolean
  /** Venue's organization_id; when set, stages are child orgs and we resolve stage names */
  venueOrgId?: string | null
  /** When set, only shows that use this stage (stage_id or linked_stage_ids) */
  stageId?: string | null
  /** Stage id -> name for display (from stages table) */
  stageNamesFromStages?: Record<string, string>
  /** Filter by status; 'past' = only shows with date < today */
  statusFilter?: ShowStatusFilter
  /** Filter by date range (inclusive); ISO date strings */
  dateRange?: { from: string; to: string } | null
}

const todayIso = () => new Date().toISOString().slice(0, 10)

/** Stable default so options object from caller doesn't cause refetch to change every render */
const EMPTY_STAGE_NAMES: Record<string, string> = {}

export function useShows(
  venueId: string | null,
  options: UseShowsOptions = {}
) {
  const {
    multiStage = false,
    venueOrgId = null,
    stageId = null,
    stageNamesFromStages = EMPTY_STAGE_NAMES,
    statusFilter = null,
    dateRange = null,
  } = options
  const [shows, setShows] = useState<Event[]>([])
  const [stageNames, setStageNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(!!venueId)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!supabase || !venueId) {
      setShows([])
      setStageNames({})
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    let stageNameMap: Record<string, string> = { ...stageNamesFromStages }
    if (venueOrgId) {
      try {
        const { data: children } = await supabase.rpc("get_org_children", {
          org_id_param: venueOrgId,
        })
        if (Array.isArray(children)) {
          ;(children as { id: string; name: string }[]).forEach((c) => {
            stageNameMap[c.id] = c.name
          })
        }
      } catch {
        // RPC may not exist
      }
      setStageNames(stageNameMap)
    } else if (Object.keys(stageNamesFromStages).length > 0) {
      setStageNames(stageNameMap)
    }

    let query = supabase
      .from("shows")
      .select("*")
      .eq("venue_id", venueId)
      .order("date", { ascending: true })

    if (stageId) {
      query = query.or(`stage_id.eq.${stageId},linked_stage_ids.cs.${JSON.stringify([stageId])}`)
    } else if (!multiStage) {
      query = query.is("stage_organization_id", null)
    }

    if (statusFilter && statusFilter !== "past") {
      query = query.eq("status", statusFilter)
    }
    if (dateRange?.from) {
      query = query.gte("date", dateRange.from)
    }
    if (dateRange?.to) {
      query = query.lte("date", dateRange.to)
    }

    const { data, error: fetchError } = await query

    if (fetchError) {
      setError(fetchError as Error)
      setShows([])
      setLoading(false)
      return
    }
    let rows = (data as ShowRow[]) ?? []
    if (statusFilter === "past") {
      const today = todayIso()
      rows = rows.filter((r) => r.date < today)
    }
    setShows(rows.map((row) => showRowToEvent(row, stageNameMap)))
    setLoading(false)
  }, [venueId, multiStage, venueOrgId, stageId, stageNamesFromStages, statusFilter, dateRange?.from, dateRange?.to])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { shows, loading, error, refetch, stageNames }
}
