"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useEvent } from "@/components/event-context"
import { useStages } from "@/lib/use-venue-hierarchy"
import { parseCSV, findConflicts, type ImportRow } from "@/lib/calendar-import"
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react"

export function CalendarImportCard() {
  const { events, saveEvent, venueId } = useEvent()
  const { stages } = useStages(venueId)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [conflicts, setConflicts] = useState<number[]>([])
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const existingDates = new Set(events.map((e) => e.date))
  const stageNameToId = new Map(stages.map((s) => [s.name.toLowerCase(), s.id]))

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result)
      const parsed = parseCSV(text)
      setRows(parsed)
      setConflicts(findConflicts(parsed, existingDates))
      setDone(0)
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  const handleCreateHolds = async () => {
    if (!saveEvent || rows.length === 0) return
    setImporting(true)
    let count = 0
    for (let i = 0; i < rows.length; i++) {
      if (conflicts.includes(i)) continue
      const r = rows[i]
      const stageId = r.stage ? stageNameToId.get(r.stage.toLowerCase()) : undefined
      const newEvent = {
        id: `import-${Date.now()}-${i}`,
        name: r.name,
        date: r.date,
        loadIn: "14:00",
        soundcheck: "16:00",
        doors: "19:00",
        curfew: "23:00",
        loadOut: "00:00",
        status: "hold" as const,
        selectedItems: [],
        greenRoomItems: [],
        bands: [
          {
            id: `b-${Date.now()}-${i}`,
            name: r.name,
            setStart: "20:00",
            setEnd: "22:00",
            isHeadliner: true,
          },
        ],
        wizardCompleted: false,
        specialRequests: "",
        linkedStageIds: stageId ? [stageId] : [],
        stageId,
      }
      try {
        await saveEvent(newEvent)
        count++
      } catch {
        // skip
      }
    }
    setDone(count)
    setRows([])
    setConflicts([])
    setImporting(false)
  }

  const canImport = rows.length > 0 && !importing
  const toCreate = rows.length - conflicts.length

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
          Import from CSV
        </CardTitle>
        <CardDescription>
          Upload a CSV with columns: date, name (or artist), and optional stage. Rows are created as holds.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
        >
          <Upload className="w-4 h-4" />
          Choose CSV
        </Button>
        {rows.length > 0 && (
          <>
            <div className="text-xs text-muted-foreground">
              {rows.length} row(s) parsed. {conflicts.length > 0 && (
                <span className="text-amber-400 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {conflicts.length} conflict(s) (same date) — skipped
                </span>
              )}
            </div>
            <Button
              size="sm"
              disabled={!canImport || toCreate <= 0}
              onClick={handleCreateHolds}
            >
              {importing ? "Importing…" : `Create ${toCreate} hold(s)`}
            </Button>
          </>
        )}
        {done > 0 && (
          <p className="text-xs text-primary">{done} hold(s) created.</p>
        )}
      </CardContent>
    </Card>
  )
}
