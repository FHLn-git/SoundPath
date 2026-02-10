"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useEvent, type Event } from "@/components/event-context"
import { useStages } from "@/lib/use-venue-hierarchy"
import { format } from "date-fns"
import { Truck, Users, BarChart3, Calendar } from "lucide-react"

interface VenueLogisticsSummaryProps {
  venueId: string | null
  onEventClick?: (event: Event) => void
}

export function VenueLogisticsSummary({ venueId, onEventClick }: VenueLogisticsSummaryProps) {
  const { events } = useEvent()
  const { stages } = useStages(venueId)
  const today = format(new Date(), "yyyy-MM-dd")

  const upcomingEvents = useMemo(
    () => events.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 20),
    [events, today]
  )

  const totalVenueCapacity = useMemo(
    () =>
      stages.reduce(
        (sum, s) => sum + (s.legal_capacity ?? s.comfort_capacity ?? s.capacity ?? 0),
        0
      ),
    [stages]
  )

  const loadInSchedule = useMemo(
    () =>
      upcomingEvents
        .map((e) => ({
          event: e,
          loadIn: e.loadIn ?? "—",
          date: e.date,
        }))
        .sort((a, b) => {
          const d = a.date.localeCompare(b.date)
          if (d !== 0) return d
          return (a.loadIn ?? "").localeCompare(b.loadIn ?? "")
        })
        .slice(0, 15),
    [upcomingEvents]
  )

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Capacity
          </CardTitle>
          <CardDescription className="text-xs">Total venue capacity across stages</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-foreground font-mono">{totalVenueCapacity.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Across {stages.length} stage(s)</p>
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Staff
          </CardTitle>
          <CardDescription className="text-xs">Total staff needed (estimate)</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-foreground font-mono">—</p>
          <p className="text-xs text-muted-foreground mt-1">Configure in event details</p>
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Upcoming
          </CardTitle>
          <CardDescription className="text-xs">Next {upcomingEvents.length} events</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-foreground font-mono">{upcomingEvents.length}</p>
        </CardContent>
      </Card>

      <Card className="border-border bg-card md:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary" />
            Load-in schedule
          </CardTitle>
          <CardDescription className="text-xs">Next load-ins by date and time</CardDescription>
        </CardHeader>
        <CardContent>
          {loadInSchedule.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No upcoming load-ins.</p>
          ) : (
            <ul className="space-y-2">
              {loadInSchedule.map(({ event, loadIn, date }) => (
                <li
                  key={event.id}
                  onClick={() => onEventClick?.(event)}
                  className="flex items-center justify-between py-2 px-3 rounded-lg border border-border bg-secondary/20 hover:bg-secondary/40 cursor-pointer text-sm"
                >
                  <span className="font-medium text-foreground truncate">{event.name || "Event"}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-muted-foreground text-xs">{format(new Date(date), "MMM d")}</span>
                    <span className="font-mono text-muted-foreground text-xs">{loadIn}</span>
                    <Badge variant="outline" className="text-xs">
                      {event.status}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
