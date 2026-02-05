/**
 * Fetch shows for a venue. Same Supabase client as rest of SoundPath.
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { showRowToEvent } from '../lib/showApi'

export function useShows(venueId) {
  const [shows, setShows] = useState([])
  const [loading, setLoading] = useState(!!venueId)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    if (!supabase || !venueId) {
      setShows([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('shows')
      .select('*')
      .eq('venue_id', venueId)
      .order('date', { ascending: true })

    if (fetchError) {
      setError(fetchError)
      setShows([])
      setLoading(false)
      return
    }
    setShows(((data ?? [])).map(showRowToEvent))
    setLoading(false)
  }, [venueId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { shows, loading, error, refetch }
}
