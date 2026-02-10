import { supabase } from "./supabase"
import { eventToShowRow } from "./show-mapping"
import type { Event } from "@/components/event-context"
import type { ShowRow, ShowStatus } from "./venue-types"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuid(id: string): boolean {
  return UUID_REGEX.test(id)
}

export type ListShowsFilters = {
  status?: ShowStatus
  stageId?: string | null
  dateFrom?: string
  dateTo?: string
}

/** List shows for multiple venues (e.g. venue group HQ); same filters as listShows. */
export async function listShowsForVenueIds(
  venueIds: string[],
  filters: ListShowsFilters = {}
): Promise<ShowRow[]> {
  if (!supabase || venueIds.length === 0) return []
  let query = supabase
    .from("shows")
    .select("*")
    .in("venue_id", venueIds)
    .order("date", { ascending: true })
  if (filters.status) query = query.eq("status", filters.status)
  if (filters.stageId) {
    query = query.or(
      `stage_id.eq.${filters.stageId},linked_stage_ids.cs.${JSON.stringify([filters.stageId])}`
    )
  }
  if (filters.dateFrom) query = query.gte("date", filters.dateFrom)
  if (filters.dateTo) query = query.lte("date", filters.dateTo)
  const { data, error } = await query
  if (error) throw new Error(error.message ?? String(error))
  const rows = (data as ShowRow[]) ?? []
  if (filters.status === "hold") {
    rows.sort((a, b) => (a.hold_rank ?? 999) - (b.hold_rank ?? 999))
  }
  return rows
}

/** List shows with optional filters; for "next hold by rank" use status: 'hold' + date + stageId, then sort by hold_rank */
export async function listShows(venueId: string, filters: ListShowsFilters = {}): Promise<ShowRow[]> {
  if (!supabase) return []
  let query = supabase
    .from("shows")
    .select("*")
    .eq("venue_id", venueId)
    .order("date", { ascending: true })
  if (filters.status) query = query.eq("status", filters.status)
  if (filters.stageId) {
    query = query.or(
      `stage_id.eq.${filters.stageId},linked_stage_ids.cs.${JSON.stringify([filters.stageId])}`
    )
  }
  if (filters.dateFrom) query = query.gte("date", filters.dateFrom)
  if (filters.dateTo) query = query.lte("date", filters.dateTo)
  const { data, error } = await query
  if (error) throw new Error(error.message ?? String(error))
  const rows = (data as ShowRow[]) ?? []
  if (filters.status === "hold") {
    rows.sort((a, b) => (a.hold_rank ?? 999) - (b.hold_rank ?? 999))
  }
  return rows
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
        stage_organization_id: row.stage_organization_id ?? null,
        stage_id: row.stage_id ?? null,
        is_multi_stage: row.is_multi_stage ?? false,
        linked_stage_ids: row.linked_stage_ids ?? [],
        hold_rank: row.hold_rank ?? null,
        hold_auto_promote: row.hold_auto_promote ?? false,
        offer_id: row.offer_id ?? null,
        guarantee: row.guarantee ?? null,
        door_split_pct: row.door_split_pct ?? null,
        ticket_sales_count: row.ticket_sales_count ?? null,
        ticket_revenue: row.ticket_revenue ?? null,
        expenses: row.expenses ?? [],
        settlement_notes: row.settlement_notes ?? null,
        settlement_finalized_at: row.settlement_finalized_at ?? null,
      })
      .eq("id", event.id)
      .select()
      .single()
    if (error) throw new Error(error.message ?? error.details ?? String(error))
    return data ? { ...event, id: data.id } : null
  }
  const { data, error } = await supabase.from("shows").insert(row).select().single()
  if (error) throw new Error(error.message ?? error.details ?? String(error))
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

/** Create show invitation; returns token for invite link. Venue only. */
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
