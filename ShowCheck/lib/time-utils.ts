/** Time string HH:MM or HH:MM:SS → total minutes from midnight */
export function timeToMinutes(t: string): number {
  const [h, m] = t.trim().split(":").map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/** Minutes from midnight → HH:MM */
export function minutesToTime(min: number): string {
  const h = Math.floor(min / 60) % 24
  const m = min % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

/** Add minutes to a time string (HH:MM). Returns HH:MM. */
export function addMinutesToTime(timeStr: string, minutes: number): string {
  return minutesToTime(timeToMinutes(timeStr) + minutes)
}

/** Duration in minutes between start and end (end - start). */
export function durationMinutes(start: string, end: string): number {
  return timeToMinutes(end) - timeToMinutes(start)
}
