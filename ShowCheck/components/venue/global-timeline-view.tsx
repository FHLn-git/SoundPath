"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useEvent, type Event } from "@/components/event-context"
import { useStages } from "@/lib/use-venue-hierarchy"
import { format, parseISO, isToday } from "date-fns"
import { CalendarDays, Box } from "lucide-react"

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const LANE_HEIGHT = 64

interface GlobalTimelineViewProps {
  venueId: string | null
  date: Date
  onEventClick?: (event: Event) => void
}

function getEventPosition(event: Event): { left: number; width: number } {
  const loadIn = event.loadIn ?? "14:00"
  const [h = 14, m = 0] = loadIn.split(":").map(Number)
  const loadOut = event.loadOut ?? "00:00"
  const [oh = 0, om = 0] = loadOut.split(":").map(Number)
  const startMinutes = h * 60 + m
  const endMinutes = oh * 60 + om + (oh < 12 ? 24 * 60 : 0)
  const dayStartMinutes = 0
  const dayEndMinutes = 24 * 60
  const left = Math.max(0, ((startMinutes - dayStartMinutes) / dayEndMinutes) * 100)
  const span = ((endMinutes - startMinutes) / dayEndMinutes) * 100
  const width = Math.min(span, 100 - left)
  return { left, width }
}

export function GlobalTimelineView({ venueId, date, onEventClick }: GlobalTimelineViewProps) {
  const { events } = useEvent()
  const { stages } = useStages(venueId)

  const dayStr = format(date, "yyyy-MM-dd")
  const eventsForDay = useMemo(
    () => events.filter((e) => e.date === dayStr),
    [events, dayStr]
  )

  const stageIds = useMemo(() => stages.map((s) => s.id), [stages])
  const eventsByStage = useMemo(() => {
    const map: Record<string, Event[]> = {}
    stageIds.forEach((id) => (map[id] = []))
    map["_none"] = []
    eventsForDay.forEach((ev) => {
      const sid = ev.stageId ?? (ev.linkedStageIds?.[0] ?? "_none")
      if (map[sid]) map[sid].push(ev)
      else map["_none"].push(ev)
    })
    if (stages.length === 0) map["_main"] = eventsForDay
    return map
  }, [eventsForDay, stageIds, stages.length])

  const displayStages =
    stages.length > 0 ? stages : ([{ id: "_main", name: "All", capacity: null }] as { id: string; name: string; capacity: number | null }[])

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          Venue view — {format(date, "EEE, MMM d, yyyy")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          All stages side-by-side. Click an event to open details.
        </p>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid border-b border-border" style={{ gridTemplateColumns: "120px 1fr" }}>
            <div className="bg-muted/30 border-r border-border p-2 text-xs font-mono text-muted-foreground">
              Stage
            </div>
            <div className="relative flex">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="border-r border-border/60 py-1 text-center text-[10px] text-muted-foreground font-mono flex-1 min-w-[32px]"
                >
                  {h}
                </div>
              ))}
            </div>
          </div>
          {displayStages.map((stage) => (
            <div
              key={stage.id}
              className="grid border-b border-border/60 hover:bg-muted/20"
              style={{ gridTemplateColumns: "120px 1fr", minHeight: LANE_HEIGHT }}
            >
              <div className="border-r border-border p-2 flex items-center gap-2">
                <Box className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="font-medium text-sm truncate">{stage.name}</span>
                {stage.capacity != null && (
                  <span className="text-xs text-muted-foreground">Cap. {stage.capacity}</span>
                )}
              </div>
              <div className="relative flex min-h-[56px]">
                {HOURS.map((h) => (
                  <div key={h} className="flex-1 min-w-[32px] border-r border-border/40" />
                ))}
                <div className="absolute inset-0 flex pointer-events-none">
                  {HOURS.map((h) => (
                    <div key={h} className="flex-1 min-w-[32px]" />
                  ))}
                </div>
                <div className="absolute inset-0 flex pointer-events-auto">
                  {(eventsByStage[stage.id] ?? []).map((ev) => {
                    const { left, width } = getEventPosition(ev)
                    return (
                      <div
                        key={ev.id}
                        onClick={() => onEventClick?.(ev)}
                        className="absolute top-1 bottom-1 rounded border cursor-pointer overflow-hidden"
                        style={{
                          left: `${left}%`,
                          width: `${Math.max(width, 2)}%`,
                          minWidth: 24,
                          background: ev.status === "hold" ? "rgba(245, 158, 11, 0.2)" : "rgba(34, 197, 94, 0.2)",
                          borderColor: ev.status === "hold" ? "rgba(245, 158, 11, 0.5)" : "rgba(34, 197, 94, 0.5)",
                        }}
                      >
                        <span className="text-[10px] font-medium px-1 truncate block mt-0.5">
                          {ev.name || ev.bands?.[0]?.name || "Event"}
                        </span>
                        <span className="text-[9px] text-muted-foreground px-1">
                          {ev.loadIn ?? "—"} – {ev.loadOut ?? "—"}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
        {eventsForDay.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No events on this day. Use Calendar or List to add events.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
