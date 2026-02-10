"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEvent } from "@/components/event-context"
import { Clock, Truck, Music, DoorOpen, AlertTriangle, LogOut, Star } from "lucide-react"

export function RunOfShow() {
  const { currentEvent } = useEvent()

  if (!currentEvent) return null

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":")
    const hour = parseInt(hours, 10)
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  // Build timeline with band sets inserted in order
  const bandItems = (currentEvent.bands || []).map((band) => ({
    id: band.id,
    time: band.setStart,
    endTime: band.setEnd,
    label: band.name,
    icon: band.isHeadliner ? Star : Music,
    color: band.isHeadliner
      ? "bg-primary/20 text-primary border-primary/30"
      : "bg-secondary/50 text-muted-foreground border-border",
    iconColor: band.isHeadliner ? "text-primary" : "text-muted-foreground",
    isBand: true,
    isHeadliner: band.isHeadliner,
  }))

  const baseItems = [
    {
      id: "load-in",
      time: currentEvent.loadIn,
      label: "Load-In",
      icon: Truck,
      color: "bg-warning/20 text-warning border-warning/30",
      iconColor: "text-warning",
      isBand: false,
    },
    {
      id: "soundcheck",
      time: currentEvent.soundcheck,
      label: "Soundcheck",
      icon: Music,
      color: "bg-secondary/50 text-muted-foreground border-border",
      iconColor: "text-muted-foreground",
      isBand: false,
    },
    {
      id: "doors",
      time: currentEvent.doors,
      label: "Doors Open",
      icon: DoorOpen,
      color: "bg-primary/20 text-primary border-primary/30",
      iconColor: "text-primary",
      isBand: false,
    },
    ...bandItems,
    {
      id: "curfew",
      time: currentEvent.curfew,
      label: "Curfew",
      icon: AlertTriangle,
      color: "bg-destructive/20 text-destructive border-destructive/30",
      iconColor: "text-destructive",
      isBand: false,
    },
    {
      id: "load-out",
      time: currentEvent.loadOut,
      label: "Load-Out",
      icon: LogOut,
      color: "bg-warning/20 text-warning border-warning/30",
      iconColor: "text-warning",
      isBand: false,
    },
  ]

  // Sort by time
  const timelineItems = baseItems.sort((a, b) => {
    const [aH, aM] = a.time.split(":").map(Number)
    const [bH, bM] = b.time.split(":").map(Number)
    return aH * 60 + aM - (bH * 60 + bM)
  })

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-base">Run of Show</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-border" />

          <div className="space-y-1">
            {timelineItems.map((item, index) => {
              const Icon = item.icon
              const isBandItem = "isBand" in item && item.isBand
              const endTime = "endTime" in item ? item.endTime : null

              return (
                <div key={item.id} className="relative flex items-center gap-3">
                  {/* Timeline dot */}
                  <div
                    className={`relative z-10 flex items-center justify-center w-6 h-6 rounded-full border ${item.color}`}
                  >
                    <Icon className={`w-3 h-3 ${item.iconColor}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-foreground w-16">
                        {formatTime(item.time)}
                      </span>
                      <span
                        className={`text-sm ${
                          isBandItem && "isHeadliner" in item && item.isHeadliner
                            ? "font-semibold text-foreground"
                            : isBandItem
                              ? "text-foreground"
                              : "text-muted-foreground"
                        }`}
                      >
                        {item.label}
                      </span>
                      {isBandItem && endTime && (
                        <span className="text-xs text-muted-foreground">
                          ({calculateTimeDiff(item.time, endTime)} set)
                        </span>
                      )}
                    </div>
                    {index < timelineItems.length - 1 && !isBandItem && (
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        +{calculateTimeDiff(item.time, timelineItems[index + 1].time)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function calculateTimeDiff(start: string, end: string): string {
  const [startHours, startMinutes] = start.split(":").map(Number)
  let [endHours, endMinutes] = end.split(":").map(Number)

  // Handle next day (e.g., 23:00 to 00:00)
  if (endHours < startHours) {
    endHours += 24
  }

  const startTotal = startHours * 60 + startMinutes
  const endTotal = endHours * 60 + endMinutes
  const diff = endTotal - startTotal

  const hours = Math.floor(diff / 60)
  const minutes = diff % 60

  if (hours === 0) return `${minutes}min`
  if (minutes === 0) return `${hours}hr`
  return `${hours}hr ${minutes}min`
}
