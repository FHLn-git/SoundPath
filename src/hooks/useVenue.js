/**
 * Fetch current user's venues and active venue. Uses same Supabase client as rest of SoundPath.
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const ACTIVE_VENUE_KEY = 'soundpath_active_venue_id'

export function useVenue() {
  const [userId, setUserId] = useState(null)
  const [venues, setVenues] = useState([])
  const [activeVenueId, setActiveVenueIdState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
      const isSessionMissing =
        !user || (authError?.message?.toLowerCase?.() || '').includes('session')
      if (authError && !isSessionMissing) setError(authError)
      else setError(null)
      return
    }
    setUserId(user.id)
    setError(null)

    const { data: rows, error: fetchError } = await supabase
      .from('venues')
      .select('*')
      .eq('owner_id', user.id)
      .order('name')

    if (fetchError) {
      setError(fetchError)
      setVenues([])
      setLoading(false)
      return
    }
    const list = rows ?? []
    setVenues(list)
    const stored =
      typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_VENUE_KEY) : null
    const firstId = list[0]?.id ?? null
    const active =
      stored && list.some((v) => v.id === stored) ? stored : firstId
    setActiveVenueIdState(active)
    setLoading(false)
  }, [])

  useEffect(() => {
    refetchVenues()
  }, [refetchVenues])

  const setActiveVenueId = useCallback((id) => {
    setActiveVenueIdState(id)
    if (typeof window !== 'undefined') {
      if (id) localStorage.setItem(ACTIVE_VENUE_KEY, id)
      else localStorage.removeItem(ACTIVE_VENUE_KEY)
    }
  }, [])

  const activeVenue =
    activeVenueId && venues.length
      ? venues.find((v) => v.id === activeVenueId) ?? null
      : null

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
