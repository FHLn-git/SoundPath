"use client"

import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  isToday,
} from "date-fns"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useEvent, type Event } from "@/components/event-context"
import type { EventStatus } from "@/components/event-context"

/** DAW #0B0E14 aesthetic: Signal Green = confirmed, Muted Amber = holds */
const STATUS_COLORS: Record<EventStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  open: "bg-slate-500/20 text-slate-300 border-slate-500/40",
  hold: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  hold_1: "bg-amber-600/25 text-amber-300 border-amber-500/50",
  hold_2: "bg-amber-700/20 text-amber-400/90 border-amber-600/40",
  challenged: "bg-orange-600/20 text-orange-300 border-orange-500/40",
  confirmed: "bg-emerald-500/25 text-emerald-400 border-emerald-500/50",
  "pending-approval": "bg-amber-500/15 text-amber-300 border-amber-500/30",
  on_sale: "bg-primary/20 text-primary border-primary/40",
  cancelled: "bg-destructive/20 text-destructive/90 border-destructive/40",
  completed: "bg-muted text-muted-foreground border-border",
}

export function getStatusStyle(status: EventStatus): string {
  return STATUS_COLORS[status] ?? STATUS_COLORS.draft
}

interface CalendarViewProps {
  onEventClick?: (event: Event) => void
  currentMonth: Date
  onMonthChange: (date: Date) => void
}

export function CalendarView({
  onEventClick,
  currentMonth,
  onMonthChange,
}: CalendarViewProps) {
  const { events } = useEvent()
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad = monthStart.getDay()
  const paddedDays = [...Array(startPad).fill(null), ...days]
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const eventsByDate = new Map<string, Event[]>()
  events.forEach((ev) => {
    const key = ev.date
    if (!eventsByDate.has(key)) eventsByDate.set(key, [])
    eventsByDate.get(key)!.push(ev)
  })

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="text-sm font-medium text-foreground">Calendar</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[140px] text-center text-sm font-medium text-foreground tabular-nums">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-7 border-b border-border text-xs text-muted-foreground font-medium">
          {weekDays.map((d) => (
            <div key={d} className="p-2 text-center border-r border-border last:border-r-0">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr" style={{ minHeight: "320px" }}>
          {paddedDays.map((day, i) => {
            if (day === null) {
              return <div key={`pad-${i}`} className="min-h-[80px] bg-muted/20 border-b border-r border-border" />
            }
            const dateKey = format(day, "yyyy-MM-dd")
            const dayEvents = eventsByDate.get(dateKey) ?? []
            const isCurrentMonth = isSameMonth(day, currentMonth)
            return (
              <div
                key={dateKey}
                className={`min-h-[80px] border-b border-r border-border p-1.5 flex flex-col ${
                  isCurrentMonth ? "bg-background" : "bg-muted/30"
                }`}
              >
                <span
                  className={`text-xs font-mono ${
                    isToday(day) ? "bg-primary text-primary-foreground rounded px-1.5 py-0.5 w-fit" : "text-muted-foreground"
                  } ${!isCurrentMonth ? "opacity-60" : ""}`}
                >
                  {format(day, "d")}
                </span>
                <div className="mt-1 space-y-1 flex-1 overflow-hidden">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => onEventClick?.(ev)}
                      className={`w-full text-left truncate rounded px-1.5 py-0.5 border text-xs ${getStatusStyle(
                        ev.status
                      )} hover:opacity-90 transition-opacity`}
                      title={`${ev.name ?? ev.bands?.[0]?.name ?? "Event"} · ${ev.status}`}
                    >
                      {ev.name || ev.bands?.[0]?.name || "Event"}
                    </button>
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-xs text-muted-foreground px-1.5">+{dayEvents.length - 3}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
