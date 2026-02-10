/**
 * Fetch venue notifications (in-app bell). Venue owners only (RLS).
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useVenueNotifications(venueId) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(!!venueId)

  const refetch = useCallback(async () => {
    if (!supabase || !venueId) {
      setNotifications([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('venue_notifications')
      .select('*')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications(data ?? [])
    setLoading(false)
  }, [venueId])

  useEffect(() => {
    refetch()
  }, [refetch])

  const unreadCount = notifications.filter((n) => !n.read_at).length

  const markAsRead = useCallback(async (id) => {
    if (!supabase || !id) return
    await supabase.from('venue_notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)))
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!supabase || !venueId) return
    await supabase
      .from('venue_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('venue_id', venueId)
      .is('read_at', null)
    refetch()
  }, [venueId, refetch])

  return { notifications, loading, unreadCount, markAsRead, markAllAsRead, refetch }
}
