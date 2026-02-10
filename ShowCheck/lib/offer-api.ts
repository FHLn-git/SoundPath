import { supabase } from "./supabase"
import type { OfferRow } from "./venue-types"

export type OfferInsert = Omit<OfferRow, "id" | "created_at" | "updated_at">
export type OfferUpdate = Partial<Omit<OfferRow, "id" | "venue_id" | "created_at">>

export async function listOffers(venueId: string, filters?: { status?: OfferRow["status"]; stageId?: string | null }): Promise<OfferRow[]> {
  if (!supabase) return []
  let query = supabase
    .from("offers")
    .select("*")
    .eq("venue_id", venueId)
    .order("proposed_date", { ascending: true })
  if (filters?.status) query = query.eq("status", filters.status)
  if (filters?.stageId != null) query = query.eq("stage_id", filters.stageId)
  const { data, error } = await query
  if (error) throw error
  return (data as OfferRow[]) ?? []
}

export async function getOffer(offerId: string): Promise<OfferRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from("offers").select("*").eq("id", offerId).single()
  if (error) return null
  return data as OfferRow
}

export async function createOffer(offer: OfferInsert): Promise<OfferRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from("offers").insert(offer).select().single()
  if (error) throw error
  return data as OfferRow
}

export async function updateOffer(offerId: string, updates: OfferUpdate): Promise<OfferRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from("offers").update(updates).eq("id", offerId).select().single()
  if (error) throw error
  return data as OfferRow
}

export async function deleteOffer(offerId: string): Promise<void> {
  if (!supabase) return
  await supabase.from("offers").delete().eq("id", offerId)
}

/** Accept offer: create or update show and link; caller can use show-api.upsertShow then set offer.show_id and show.offer_id */
export async function acceptOffer(offerId: string, showId: string): Promise<OfferRow | null> {
  return updateOffer(offerId, { status: "accepted", show_id: showId })
}
