import { supabase } from "./supabase"
import type { AdvanceDataPayload } from "./venue-types"

/**
 * Fetch public advance data for a show (run-of-show, venue contact).
 * Uses get_advance_for_show(show_id) RPC; callable without auth (ID is the secret).
 */
export async function getAdvanceData(showId: string): Promise<AdvanceDataPayload | null> {
  if (!supabase || !showId) return null
  const { data, error } = await supabase.rpc("get_advance_for_show", {
    p_show_id: showId,
  })
  if (error) return null
  return data as AdvanceDataPayload
}
