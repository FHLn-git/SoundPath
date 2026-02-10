import type { OperatingHoursMap } from "./venue-types"

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const

/** Get weekday key (sun..sat) from a YYYY-MM-DD date string */
export function getWeekdayKey(date: string): string {
  const d = new Date(date + "T12:00:00")
  const day = d.getDay()
  return WEEKDAY_KEYS[day] ?? "sun"
}

/** Parse "HH:MM" or "HH:MM:SS" to minutes since midnight */
function timeToMinutes(t: string): number {
  const part = t.slice(0, 5)
  const [h, m] = part.split(":").map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/** Check if a given time (HH:MM) falls within the day's operating window. Handles overnight (e.g. 18:00-02:00). */
export function isTimeWithinOperatingHours(
  dayKey: string,
  timeHHMM: string,
  hours: OperatingHoursMap
): boolean {
  const slot = hours[dayKey]
  if (!slot || !Array.isArray(slot)) return false
  const [start, end] = slot
  const t = timeToMinutes(timeHHMM)
  const s = timeToMinutes(start)
  const e = timeToMinutes(end)
  if (s <= e) return t >= s && t <= e
  return t >= s || t <= e
}

function inOperatingWindow(t: number, s: number, e: number): boolean {
  if (s <= e) return t >= s && t <= e
  return t >= s || t <= e
}

/** Returns true if show times (doors–curfew) fall outside stage operating hours (schedule conflict). */
export function isOutsideOperatingHours(
  dayKey: string,
  doorsHHMM: string,
  curfewHHMM: string,
  hours: OperatingHoursMap
): boolean {
  const slot = hours[dayKey]
  if (!slot || !Array.isArray(slot)) return true
  const [start, end] = slot
  const doors = timeToMinutes(doorsHHMM)
  const curfew = timeToMinutes(curfewHHMM)
  const s = timeToMinutes(start)
  const e = timeToMinutes(end)
  const doorsOk = inOperatingWindow(doors, s, e)
  const curfewOk = inOperatingWindow(curfew, s, e)
  return !(doorsOk && curfewOk)
}

/** Whether the day has any operating hours */
export function isDayOpen(dayKey: string, hours: OperatingHoursMap): boolean {
  const slot = hours[dayKey]
  return Boolean(slot && Array.isArray(slot))
}
