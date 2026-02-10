import type { ShowRow } from "./venue-types"
import type { Event } from "@/components/event-context"

/** Normalize DB time (HH:MM:SS or HH:MM) to HH:MM for UI */
export function dbTimeToUi(time: string | null): string {
  if (!time) return "00:00"
  const part = time.slice(0, 5)
  return part.length === 4 ? `0${part}` : part
}

/** UI time HH:MM to DB (store as HH:MM:00 for TIME type) */
export function uiTimeToDb(time: string): string {
  if (!time) return "00:00:00"
  return time.length === 5 ? `${time}:00` : `${time.slice(0, 5)}:00`
}

export function showRowToEvent(
  row: ShowRow,
  stageNames?: Record<string, string>
): Event {
  const linkedStageIds = Array.isArray(row.linked_stage_ids) ? row.linked_stage_ids : (row.stage_id ? [row.stage_id] : [])
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    loadIn: dbTimeToUi(row.load_in),
    soundcheck: dbTimeToUi(row.soundcheck),
    doors: dbTimeToUi(row.doors),
    curfew: dbTimeToUi(row.curfew),
    loadOut: dbTimeToUi(row.load_out),
    status: row.status ?? "draft",
    selectedItems: row.selected_items ?? [],
    greenRoomItems: Array.isArray(row.green_room_items) ? row.green_room_items : [],
    bands: Array.isArray(row.bands) ? row.bands : [],
    wizardCompleted: row.status !== "draft" && row.status !== "hold",
    specialRequests: row.special_requests ?? "",
    stageOrganizationId: row.stage_organization_id ?? undefined,
    stageName: row.stage_organization_id && stageNames
      ? stageNames[row.stage_organization_id] ?? null
      : null,
    isMultiStage: row.is_multi_stage ?? false,
    linkedStageIds,
    stageId: row.stage_id ?? undefined,
    holdRank: row.hold_rank ?? undefined,
    holdAutoPromote: row.hold_auto_promote ?? false,
    offerId: row.offer_id ?? undefined,
    guarantee: row.guarantee ?? undefined,
    doorSplitPct: row.door_split_pct ?? undefined,
    ticketSalesCount: row.ticket_sales_count ?? undefined,
    ticketRevenue: row.ticket_revenue ?? undefined,
    expenses: Array.isArray(row.expenses) ? row.expenses : [],
    settlementNotes: row.settlement_notes ?? undefined,
    settlementFinalizedAt: row.settlement_finalized_at ?? undefined,
    payoutStatus: row.payout_status ?? undefined,
  }
}

export function eventToShowRow(
  event: Event,
  venueId: string
): Omit<ShowRow, "id" | "created_at" | "updated_at"> {
  const isMultiStage = event.isMultiStage ?? false
  const linkedStageIds = event.linkedStageIds ?? (event.stageId ? [event.stageId] : [])
  const stageId = !isMultiStage && linkedStageIds.length === 1 ? linkedStageIds[0] : (event.stageId ?? null)
  return {
    venue_id: venueId,
    stage_organization_id: event.stageOrganizationId ?? null,
    stage_id: stageId,
    is_multi_stage: isMultiStage,
    linked_stage_ids: linkedStageIds,
    name: event.name,
    artist_name: event.bands?.[0]?.name ?? null,
    date: event.date,
    status: event.status ?? "draft",
    contract_status: "pending",
    payout_status: "pending",
    load_in: event.loadIn ? uiTimeToDb(event.loadIn) : null,
    soundcheck: event.soundcheck ? uiTimeToDb(event.soundcheck) : null,
    doors: event.doors ? uiTimeToDb(event.doors) : null,
    curfew: event.curfew ? uiTimeToDb(event.curfew) : null,
    load_out: event.loadOut ? uiTimeToDb(event.loadOut) : null,
    selected_items: event.selectedItems ?? [],
    green_room_items: event.greenRoomItems ?? [],
    bands: event.bands ?? [],
    special_requests: event.specialRequests ?? null,
    hold_rank: event.holdRank ?? null,
    hold_auto_promote: event.holdAutoPromote ?? false,
    offer_id: event.offerId ?? null,
    guarantee: event.guarantee ?? null,
    door_split_pct: event.doorSplitPct ?? null,
    ticket_sales_count: event.ticketSalesCount ?? null,
    ticket_revenue: event.ticketRevenue ?? null,
    expenses: Array.isArray(event.expenses) ? event.expenses : [],
    settlement_notes: event.settlementNotes ?? null,
    settlement_finalized_at: event.settlementFinalizedAt ?? null,
    payout_status: event.payoutStatus ?? "pending",
  }
}
