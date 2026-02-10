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

export function showRowToEvent(row: ShowRow): Event {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    loadIn: dbTimeToUi(row.load_in),
    soundcheck: dbTimeToUi(row.soundcheck),
    doors: dbTimeToUi(row.doors),
    curfew: dbTimeToUi(row.curfew),
    loadOut: dbTimeToUi(row.load_out),
    status: row.status,
    selectedItems: row.selected_items ?? [],
    greenRoomItems: Array.isArray(row.green_room_items) ? row.green_room_items : [],
    bands: Array.isArray(row.bands) ? row.bands : [],
    wizardCompleted: row.status !== "draft",
    specialRequests: row.special_requests ?? "",
    productionApprovalStatus: row.production_approval_status ?? undefined,
    hospitalityApprovalStatus: row.hospitality_approval_status ?? undefined,
    scheduleApprovalStatus: row.schedule_approval_status ?? undefined,
  }
}

export function eventToShowRow(
  event: Event,
  venueId: string
): Omit<ShowRow, "id" | "created_at" | "updated_at"> {
  return {
    venue_id: venueId,
    name: event.name,
    artist_name: event.bands?.[0]?.name ?? null,
    date: event.date,
    status: event.status,
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
    production_approval_status: event.productionApprovalStatus ?? undefined,
    hospitality_approval_status: event.hospitalityApprovalStatus ?? undefined,
    schedule_approval_status: event.scheduleApprovalStatus ?? undefined,
  }
}
