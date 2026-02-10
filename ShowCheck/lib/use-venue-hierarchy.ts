"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "./supabase"
import type { VenueGroup } from "./venue-types"
import { fetchVenueGroups } from "./venue-group-api"
import { fetchStagesByVenueId } from "./stage-api"
import type { Stage } from "./venue-types"
import type { VenueRole, VenueRoleType } from "./venue-types"

const ACTIVE_GROUP_KEY = "showcheck_active_group_id"
const ACTIVE_STAGE_KEY = "showcheck_active_stage_id"

export function useVenueGroups() {
  const [groups, setGroups] = useState<VenueGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!supabase) {
      setGroups([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await fetchVenueGroups()
      setGroups(data)
    } catch (e) {
      setError(e as Error)
      setGroups([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { groups, loading, error, refetch }
}

export function useStages(venueId: string | null) {
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(!!venueId)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!venueId) {
      setStages([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await fetchStagesByVenueId(venueId)
      setStages(data)
    } catch (e) {
      setError(e as Error)
      setStages([])
    }
    setLoading(false)
  }, [venueId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { stages, loading, error, refetch }
}

export function useActiveGroupId() {
  const [activeGroupId, setActiveGroupIdState] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    setActiveGroupIdState(localStorage.getItem(ACTIVE_GROUP_KEY))
  }, [])

  const setActiveGroupId = useCallback((id: string | null) => {
    setActiveGroupIdState(id)
    if (typeof window !== "undefined") {
      if (id) localStorage.setItem(ACTIVE_GROUP_KEY, id)
      else localStorage.removeItem(ACTIVE_GROUP_KEY)
    }
  }, [])

  return { activeGroupId, setActiveGroupId }
}

export function useActiveStageId(venueId: string | null) {
  const [activeStageId, setActiveStageIdState] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined" || !venueId) return
    const key = `${ACTIVE_STAGE_KEY}_${venueId}`
    setActiveStageIdState(localStorage.getItem(key))
  }, [venueId])

  const setActiveStageId = useCallback(
    (id: string | null) => {
      setActiveStageIdState(id)
      if (typeof window !== "undefined" && venueId) {
        const key = `${ACTIVE_STAGE_KEY}_${venueId}`
        if (id) localStorage.setItem(key, id)
        else localStorage.removeItem(key)
      }
    },
    [venueId]
  )

  return { activeStageId, setActiveStageId }
}

/** Fetch current user's venue roles (for permission UI) */
export function useVenueRoles() {
  const [roles, setRoles] = useState<VenueRole[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!supabase) {
      setRoles([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from("venue_roles")
      .select("*")

    if (error) {
      setRoles([])
      setLoading(false)
      return
    }
    setRoles((data as VenueRole[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  /** Check if user has at least one of the given roles for the given entity */
  const hasRole = useCallback(
    (entityType: "group" | "venue" | "stage", entityId: string, allowedRoles: VenueRoleType[]) => {
      return roles.some(
        (r) => r.entity_type === entityType && r.entity_id === entityId && allowedRoles.includes(r.role as VenueRoleType)
      )
    },
    [roles]
  )

  return { roles, loading, refetch, hasRole }
}
