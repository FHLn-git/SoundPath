import { supabase } from "./supabase"
import type { VenueGroup } from "./venue-types"

export async function fetchVenueGroups(): Promise<VenueGroup[]> {
  if (!supabase) return []
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return []

  const { data, error } = await supabase
    .from("venue_groups")
    .select("*")
    .order("group_name")

  if (error) throw error
  return (data as VenueGroup[]) ?? []
}

export async function createVenueGroup(groupName: string): Promise<VenueGroup | null> {
  if (!supabase) return null
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return null

  const { data, error } = await supabase
    .from("venue_groups")
    .insert({ owner_id: user.id, group_name: groupName })
    .select()
    .single()

  if (error) throw error
  return data as VenueGroup
}
