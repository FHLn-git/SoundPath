"use client"

import { useMemo } from "react"
import { format, addDays, startOfWeek, isSameDay, isToday } from "date-fns"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useEvent, type Event } from "@/components/event-context"
import type { Stage } from "@/lib/venue-types"
import type { OperatingHoursMap } from "@/lib/venue-types"
import { getWeekdayKey, isDayOpen } from "@/lib/operating-hours"
import { getStatusStyle } from "./calendar-view"

const HOURS = Array.from({ length: 24 }, (_, i) => i)

interface TimeBlockGridProps {
  stage: Stage | null
  weekStart: Date
  onWeekChange: (start: Date) => void
  onEventClick?: (event: Event) => void
  onSlotClick?: (payload: { date: string; stageId: string; doors: string; curfew: string }) => void
}

function isSlotOpen(dayKey: string, hour: number, hours: OperatingHoursMap): boolean {
  if (!hours || !isDayOpen(dayKey, hours)) return false
  const slot = hours[dayKey]
  if (!slot || !Array.isArray(slot)) return false
  const [start, end] = slot
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  const startM = sh * 60 + (sm ?? 0)
  const endM = eh * 60 + (em ?? 0)
  const slotM = hour * 60
  if (startM <= endM) return slotM >= startM && slotM < endM
  return slotM >= startM || slotM < endM
}

export function TimeBlockGrid({
  stage,
  weekStart,
  onWeekChange,
  onEventClick,
  onSlotClick,
}: TimeBlockGridProps) {
  const { events } = useEvent()

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  }, [weekStart])

  const operatingHours: OperatingHoursMap = useMemo(
    () => stage?.default_operating_hours ?? {},
    [stage?.default_operating_hours]
  )

  const eventsByDateStage = useMemo(() => {
    const map = new Map<string, Event[]>()
    events.forEach((ev) => {
      const key = `${ev.date}-${ev.stageId ?? ""}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ev)
    })
    return map
  }, [events])

  const handleCellClick = (date: Date, hour: number) => {
    const dateStr = format(date, "yyyy-MM-dd")
    const dayKey = getWeekdayKey(dateStr)
    if (!isSlotOpen(dayKey, hour, operatingHours) || !stage || !onSlotClick) return
    const doors = `${String(hour).padStart(2, "0")}:00`
    const curfew = hour < 22 ? `${String(hour + 4).padStart(2, "0")}:00` : "02:00"
    onSlotClick({ date: dateStr, stageId: stage.id, doors, curfew })
  }

  if (!stage) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-6 text-center text-muted-foreground text-sm">
          Select a stage from the dropdown to view the time-block grid.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="text-sm font-medium text-foreground">Schedule — {stage.name}</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onWeekChange(addDays(weekStart, -7))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[160px] text-center text-sm font-medium text-foreground tabular-nums">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onWeekChange(addDays(weekStart, 7))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <div className="min-w-[700px]">
          <div
            className="grid border-b border-border text-xs text-muted-foreground font-medium bg-muted/30"
            style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}
          >
            <div className="p-1.5 border-r border-border" />
            {days.map((d) => (
              <div
                key={d.toISOString()}
                className={`p-1.5 text-center border-r border-border last:border-r-0 ${isToday(d) ? "bg-primary/10 font-medium" : ""}`}
              >
                {format(d, "EEE")}
                <span className="block font-mono text-[10px] opacity-80">{format(d, "d")}</span>
              </div>
            ))}
          </div>
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="grid border-b border-border/80"
              style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}
            >
              <div className="p-1 border-r border-border font-mono text-[10px] text-muted-foreground bg-muted/20">
                {String(hour).padStart(2, "0")}:00
              </div>
              {days.map((date) => {
                const dateStr = format(date, "yyyy-MM-dd")
                const dayKey = getWeekdayKey(dateStr)
                const open = isSlotOpen(dayKey, hour, operatingHours)
                const key = `${dateStr}-${stage.id}`
                const dayEvents = eventsByDateStage.get(key) ?? []
                const hasEvent = dayEvents.some((ev) => {
                  const [dh] = (ev.doors ?? "20:00").split(":").map(Number)
                  return dh === hour
                })
                return (
                  <div
                    key={dateStr}
                    className={`min-h-[28px] border-r border-border last:border-r-0 flex flex-col ${
                      open ? "bg-background hover:bg-primary/10 cursor-pointer" : "bg-muted/50"
                    } ${!open ? "cursor-default" : ""}`}
                    onClick={() => handleCellClick(date, hour)}
                    role={open ? "button" : undefined}
                    tabIndex={open ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (open && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault()
                        handleCellClick(date, hour)
                      }
                    }}
                  >
                    {dayEvents
                      .filter((ev) => {
                        const [dh] = (ev.doors ?? "20:00").split(":").map(Number)
                        return dh === hour
                      })
                      .slice(0, 2)
                      .map((ev) => (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEventClick?.(ev)
                          }}
                          className={`text-left truncate rounded px-1 py-0.5 border text-[10px] w-full ${getStatusStyle(
                            ev.status
                          )} hover:opacity-90`}
                          title={ev.name ?? ev.bands?.[0]?.name ?? "Event"}
                        >
                          {ev.name || ev.bands?.[0]?.name || "Event"}
                        </button>
                      ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground p-2 border-t border-border">
          Light = open (click to book). Dark = closed. Click an event to open details.
        </p>
      </CardContent>
    </Card>
  )
}
