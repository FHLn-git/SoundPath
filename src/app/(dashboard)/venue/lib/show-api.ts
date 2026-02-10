import { supabase } from "./supabase"
import { eventToShowRow, showRowToEvent } from "./show-mapping"
import type { ShowRow } from "./venue-types"
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
        production_approval_status: row.production_approval_status,
        hospitality_approval_status: row.hospitality_approval_status,
        schedule_approval_status: row.schedule_approval_status,
      })
      .eq("id", event.id)
      .select()
      .single()
    if (error) throw error
    return data ? showRowToEvent(data as ShowRow) : null
  }
  const { data, error } = await supabase.from("shows").insert(row).select().single()
  if (error) throw error
  if (!data) return null
  return showRowToEvent(data as ShowRow)
}

/** Approve one section (Production, Hospitality, Schedule) for a show. Venue-only. */
export async function approveShowSection(
  showId: string,
  section: "production" | "hospitality" | "schedule"
): Promise<Event | null> {
  if (!supabase) return null
  const col =
    section === "production"
      ? "production_approval_status"
      : section === "hospitality"
        ? "hospitality_approval_status"
        : "schedule_approval_status"
  const { data, error } = await supabase
    .from("shows")
    .update({ [col]: "CONFIRMED" })
    .eq("id", showId)
    .select()
    .single()
  if (error) throw error
  return data ? showRowToEvent(data as ShowRow) : null
}

export async function createShowInvitation(
  showId: string,
  email: string
): Promise<{ id: string; token: string } | { error: string }> {
  if (!supabase) return { error: "Not configured" }
  const { data, error } = await supabase.rpc("create_show_invitation", {
    p_show_id: showId,
    p_email: email.trim().toLowerCase(),
  })
  if (error) return { error: error.message }
  const result = data as { id?: string; token?: string; error?: string } | null
  if (result?.error) return { error: result.error }
  if (result?.id && result?.token) return { id: result.id, token: result.token }
  return { error: "Invalid response" }
}

export async function acceptShowInvitation(token: string): Promise<{ show_id: string } | { error: string }> {
  if (!supabase) return { error: "Not configured" }
  const { data, error } = await supabase.rpc("accept_show_invitation", { p_token: token })
  if (error) return { error: error.message }
  const result = data as { show_id?: string; accepted?: boolean; error?: string } | null
  if (result?.error) return { error: result.error }
  if (result?.show_id) return { show_id: result.show_id }
  return { error: "Invalid response" }
}

export async function deleteShow(showId: string): Promise<void> {
  if (!supabase) return
  await supabase.from("shows").delete().eq("id", showId)
}
