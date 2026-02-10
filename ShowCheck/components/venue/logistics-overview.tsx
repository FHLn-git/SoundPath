"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useEvent, type Event } from "@/components/event-context"
import {
  LayoutDashboard,
  Truck,
  Calendar,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Music,
  Star,
  ArrowRight,
} from "lucide-react"

interface LogisticsOverviewProps {
  showLoadInOut?: boolean
  onEventClick?: (event: Event) => void
}

export function LogisticsOverview({ showLoadInOut = false, onEventClick }: LogisticsOverviewProps) {
  const { events, menuItems, getHouseMinimumTotal } = useEvent()

  const calculateEventBudget = (event: Event) => {
    let total = getHouseMinimumTotal()
    event.selectedItems.forEach((itemId) => {
      const item = menuItems.find((m) => m.id === itemId && !m.isHouseMinimum)
      if (item) {
        total += item.basePrice
        if (item.mandatoryLabor) {
          total += item.mandatoryLabor.cost
        }
      }
    })
    event.greenRoomItems.forEach((greenItem) => {
      const item = menuItems.find((m) => m.id === greenItem.id)
      if (item) {
        total += item.basePrice * greenItem.quantity
      }
    })
    return total
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":")
    const hour = parseInt(hours, 10)
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  if (showLoadInOut) {
    return (
      <div className="space-y-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <Truck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Load-In / Load-Out Schedule</CardTitle>
                <CardDescription>Upcoming logistics for all events</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                onClick={() => onEventClick?.(event)}
                className="p-3 bg-secondary/30 rounded-lg border border-border/50 cursor-pointer hover:border-border transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-foreground text-sm">{event.name}</h4>
                    {event.stageName && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        {event.stageName}
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        event.status === "hold"
                          ? "border-amber-500/50 text-amber-400"
                          : event.status === "confirmed"
                            ? "bg-primary/20 text-primary border-primary/40"
                            : event.status === "on_sale"
                              ? "border-primary/50 text-primary"
                              : "border-border text-muted-foreground"
                      }`}
                    >
                      {event.status === "hold"
                        ? "Hold"
                        : event.status === "confirmed"
                          ? "Confirmed"
                          : event.status === "on_sale"
                            ? "On sale"
                            : event.status === "completed"
                              ? "Completed"
                              : event.status}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>

                <div className="grid grid-cols-6 gap-1 text-xs mb-2">
                  <div className="px-2 py-1 bg-warning/10 rounded text-center">
                    <span className="text-muted-foreground block">Load-In</span>
                    <span className="font-medium text-foreground">{formatTime(event.loadIn)}</span>
                  </div>
                  <div className="px-2 py-1 bg-secondary/50 rounded text-center">
                    <span className="text-muted-foreground block">Check</span>
                    <span className="font-medium text-foreground">{formatTime(event.soundcheck)}</span>
                  </div>
                  <div className="px-2 py-1 bg-primary/10 rounded text-center">
                    <span className="text-muted-foreground block">Doors</span>
                    <span className="font-medium text-foreground">{formatTime(event.doors)}</span>
                  </div>
                  <div className="col-span-2 px-2 py-1 bg-secondary/30 rounded text-center">
                    <span className="text-muted-foreground block">Show</span>
                    <span className="font-medium text-foreground">
                      {event.bands.length > 0 
                        ? `${formatTime(event.bands[0].setStart)} - ${formatTime(event.bands[event.bands.length - 1].setEnd)}`
                        : "TBD"}
                    </span>
                  </div>
                  <div className="px-2 py-1 bg-warning/10 rounded text-center">
                    <span className="text-muted-foreground block">Out</span>
                    <span className="font-medium text-foreground">{formatTime(event.loadOut)}</span>
                  </div>
                </div>

                {event.bands.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {event.bands.map((band) => (
                      <div
                        key={band.id}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
                          band.isHeadliner
                            ? "bg-primary/15 border border-primary/30"
                            : "bg-secondary/50"
                        }`}
                      >
                        {band.isHeadliner ? (
                          <Star className="w-3 h-3 text-primary" />
                        ) : (
                          <Music className="w-3 h-3 text-muted-foreground" />
                        )}
                        <span className={band.isHeadliner ? "font-medium text-foreground" : "text-muted-foreground"}>
                          {band.name}
                        </span>
                        <span className="text-muted-foreground">
                          {formatTime(band.setStart)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {events.length === 0 && (
              <div className="text-center py-8 bg-secondary/20 rounded-lg">
                <Truck className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No events scheduled</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-3">
        <div className="flex items-center gap-2.5 px-3 py-2 bg-secondary/30 rounded-lg border border-border/50">
          <div className="flex items-center justify-center w-7 h-7 rounded bg-primary/10">
            <Calendar className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground leading-none">{events.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Active Events</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-3 py-2 bg-secondary/30 rounded-lg border border-border/50">
          <div className="flex items-center justify-center w-7 h-7 rounded bg-primary/10">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground leading-none">
              {events.filter((e) => e.status === "confirmed").length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Confirmed</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-3 py-2 bg-secondary/30 rounded-lg border border-border/50">
          <div className="flex items-center justify-center w-7 h-7 rounded bg-amber-500/10">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground leading-none">
              {events.filter((e) => e.status === "hold").length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Holds</p>
          </div>
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary">
              <LayoutDashboard className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <CardTitle>All Events</CardTitle>
              <CardDescription>View and manage all scheduled events</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                onClick={() => onEventClick?.(event)}
                className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg border border-border/50 hover:border-border transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-background">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-foreground">{event.name}</h4>
                      {event.stageName && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          {event.stageName}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(event.date).toLocaleDateString()} • Doors: {formatTime(event.doors)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Budget</p>
                    <p className="font-medium text-foreground">
                      ${calculateEventBudget(event).toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      event.status === "hold"
                        ? "border-amber-500/50 text-amber-400"
                        : event.status === "confirmed"
                          ? "bg-primary/20 text-primary border-primary/40"
                          : "border-border text-muted-foreground"
                    }
                  >
                    {event.status === "hold"
                      ? "Hold"
                      : event.status === "confirmed"
                        ? "Confirmed"
                        : event.status === "on_sale"
                          ? "On sale"
                          : event.status}
                  </Badge>
                </div>
              </div>
            ))}

            {events.length === 0 && (
              <div className="text-center py-12 bg-secondary/20 rounded-lg">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No events yet</p>
                <p className="text-sm text-muted-foreground">
                  Create your first event to get started
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(":")
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}
