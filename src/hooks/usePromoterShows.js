/**
 * Fetch all shows the current user is invited to (promoter). RLS restricts to accepted invitations.
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { showRowToEvent } from '../lib/showApi'

export function usePromoterShows() {
  const [shows, setShows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    if (!supabase) {
      setShows([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('shows')
      .select('*')
      .order('date', { ascending: false })

    if (fetchError) {
      setError(fetchError)
      setShows([])
      setLoading(false)
      return
    }
    setShows((data ?? []).map(showRowToEvent))
    setLoading(false)
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { shows, loading, error, refetch }
}
