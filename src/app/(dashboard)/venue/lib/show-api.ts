import { supabase } from "./supabase"
import { eventToShowRow } from "./show-mapping"
import type { Event } from "@/components/event-context"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuid(id: string): boolean {
  return UUID_REGEX.test(id)
}

export async function upsertShow(venueId: string, event: Event): Promise<Event | null> {
  if (!supabase) return null
  const row = eventToShowRow(event, venueId)
  if (isUuid(event.id)) {
    const { data, error } = await supabase
      .from("shows")
      .update({
        name: row.name,
        artist_name: row.artist_name,
        date: row.date,
        status: row.status,
        contract_status: row.contract_status,
        payout_status: row.payout_status,
        load_in: row.load_in,
        soundcheck: row.soundcheck,
        doors: row.doors,
        curfew: row.curfew,
        load_out: row.load_out,
        selected_items: row.selected_items,
        green_room_items: row.green_room_items,
        bands: row.bands,
        special_requests: row.special_requests,
      })
      .eq("id", event.id)
      .select()
      .single()
    if (error) throw error
    return data ? { ...event, id: data.id } : null
  }
  const { data, error } = await supabase.from("shows").insert(row).select().single()
  if (error) throw error
  if (!data) return null
  return {
    ...event,
    id: data.id,
  }
}

export async function deleteShow(showId: string): Promise<void> {
  if (!supabase) return
  await supabase.from("shows").delete().eq("id", showId)
}
