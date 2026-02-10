import { eachDayOfInterval, format, parseISO, getDay } from "date-fns"
import type { ShowRow } from "./venue-types"

export type AvailsOptions = {
  /** Stage IDs to check; empty = all stages (venue-level) */
  stageIds: string[]
  /** Include holds as busy */
  includeHolds: boolean
  /** Include confirmed/on_sale/completed as busy */
  includeConfirms: boolean
  /** Only include these weekdays in available output (0=Sun, 6=Sat). Empty = all days */
  onlyDays: number[]
}

const CONFIRM_STATUSES = ["confirmed", "on_sale", "completed"]

/** Returns true if this show blocks any of the given stage IDs. */
export function showBlocksStages(show: ShowRow, stageIds: string[]): boolean {
  if (stageIds.length === 0) return true
  if (show.stage_id && stageIds.includes(show.stage_id)) return true
  const linked = show.linked_stage_ids ?? []
  if (linked.some((id) => stageIds.includes(id))) return true
  return false
}

/** Returns true if show should count as "busy" given options. */
export function showCountsAsBusy(show: ShowRow, options: AvailsOptions): boolean {
  if (!showBlocksStages(show, options.stageIds)) return false
  if (show.status === "hold" && options.includeHolds) return true
  if (CONFIRM_STATUSES.includes(show.status) && options.includeConfirms) return true
  return false
}

/**
 * Compute busy dates (set of date strings YYYY-MM-DD) from shows in range.
 */
export function getBusyDates(shows: ShowRow[], options: AvailsOptions): Set<string> {
  const busy = new Set<string>()
  shows.forEach((s) => {
    if (showCountsAsBusy(s, options)) busy.add(s.date)
  })
  return busy
}

/**
 * Compute available dates in [dateFrom, dateTo] that are not busy.
 * If onlyDays is set, filter to those weekdays.
 */
export function getAvailableDates(
  dateFrom: string,
  dateTo: string,
  busyDates: Set<string>,
  onlyDays: number[]
): string[] {
  const start = parseISO(dateFrom)
  const end = parseISO(dateTo)
  const all = eachDayOfInterval({ start, end })
  const available = all.filter((d) => {
    const key = format(d, "yyyy-MM-dd")
    if (busyDates.has(key)) return false
    if (onlyDays.length > 0 && !onlyDays.includes(getDay(d))) return false
    return true
  })
  return available.map((d) => format(d, "yyyy-MM-dd"))
}

/** Format available dates for clipboard: one per line or comma-separated, readable for artist/agent. */
export function formatAvailsForClipboard(
  dates: string[],
  style: "short" | "long" | "csv" = "short"
): string {
  if (dates.length === 0) return "No available dates in range."
  if (style === "csv") return dates.join("\n")
  if (style === "long") {
    return dates.map((d) => format(parseISO(d), "EEEE, MMMM d, yyyy")).join("\n")
  }
  return dates.map((d) => format(parseISO(d), "MMM d")).join(", ")
}
