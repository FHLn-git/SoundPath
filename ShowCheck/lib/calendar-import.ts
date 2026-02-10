/**
 * Parse CSV for calendar import. Expects header row; columns mapped by name (case-insensitive).
 * Supported: date (YYYY-MM-DD or MM/DD/YYYY), name or artist, stage (optional).
 */

export type ImportRow = {
  date: string
  name: string
  stage?: string
}

function normalizeDate(d: string): string | null {
  const trimmed = d.trim()
  if (!trimmed) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const mdy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdy) {
    const [, month, day, year] = mdy
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }
  return null
}

export function parseCSV(csvText: string): ImportRow[] {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim())
  if (lines.length < 2) return []
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase())
  const dateIdx = header.findIndex((h) => h === "date" || h === "date ")
  const nameIdx = header.findIndex((h) => h === "name" || h === "artist" || h === "event")
  const stageIdx = header.findIndex((h) => h === "stage" || h === "venue" || h === "room")
  if (dateIdx === -1 || nameIdx === -1) return []

  const rows: ImportRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",").map((c) => c.trim())
    const date = dateIdx < cells.length ? normalizeDate(cells[dateIdx]) : null
    const name = nameIdx < cells.length ? cells[nameIdx].trim() : ""
    if (!date || !name) continue
    const stage = stageIdx >= 0 && stageIdx < cells.length ? cells[stageIdx].trim() : undefined
    rows.push({ date, name, stage })
  }
  return rows
}

/** Check which import rows conflict with existing events (same date; optional same stage name) */
export function findConflicts(
  rows: ImportRow[],
  existingDates: Set<string>,
  existingByDateStage?: Map<string, Set<string>>
): number[] {
  const conflictIndices: number[] = []
  rows.forEach((row, i) => {
    const key = row.date
    if (existingDates.has(key)) {
      if (!existingByDateStage) {
        conflictIndices.push(i)
        return
      }
      const stages = existingByDateStage.get(key)
      if (stages && row.stage && stages.has(row.stage)) conflictIndices.push(i)
      else if (!row.stage || !stages) conflictIndices.push(i)
    }
  })
  return conflictIndices
}
