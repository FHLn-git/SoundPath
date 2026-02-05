"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useEvent, type Event } from "@/components/event-context"
import { CalendarPlus, Clock, Calendar, Send, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function EventCreator() {
  const { events, setEvents, setCurrentEvent, getHouseMinimumTotal, saveEvent, venueId } = useEvent()
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    loadIn: "14:00",
    soundcheck: "16:00",
    doors: "19:00",
    curfew: "23:00",
    loadOut: "00:00",
  })
  const [isCreated, setIsCreated] = useState(false)
  const [createdEvent, setCreatedEvent] = useState<Event | null>(null)

  const handleCreate = async () => {
    const newEvent: Event = {
      id: `event-${Date.now()}`,
      ...formData,
      status: "draft",
      selectedItems: [],
      greenRoomItems: [],
      bands: [],
      wizardCompleted: false,
      specialRequests: "",
    }

    if (venueId) {
      const maybePromise = saveEvent(newEvent)
      const persisted =
        maybePromise && typeof (maybePromise as Promise<Event | null>).then === "function"
          ? await (maybePromise as Promise<Event | null>)
          : null
      setCreatedEvent(persisted ?? newEvent)
    } else {
      setEvents([...events, newEvent])
      setCurrentEvent(newEvent)
      setCreatedEvent(newEvent)
    }
    setIsCreated(true)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      date: "",
      loadIn: "14:00",
      soundcheck: "16:00",
      doors: "19:00",
      curfew: "23:00",
      loadOut: "00:00",
    })
    setIsCreated(false)
    setCreatedEvent(null)
  }

  if (isCreated && createdEvent) {
    return (
      <Card className="border-primary/20 bg-card">
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">Event Created Successfully</h3>
              <p className="text-muted-foreground mt-1">
                {createdEvent.name} on {new Date(createdEvent.date).toLocaleDateString()}
              </p>
            </div>

            <div className="w-full max-w-md p-4 bg-secondary/30 rounded-lg space-y-3 text-left">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="secondary">Draft</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">House Minimum</span>
                <span className="font-medium text-foreground">
                  ${getHouseMinimumTotal().toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Promoter Portal</span>
                <span className="font-medium text-primary">Ready</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <Button variant="outline" onClick={resetForm}>
                Create Another
              </Button>
              <Button className="gap-2">
                <Send className="w-4 h-4" />
                Generate Promoter Portal
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <CalendarPlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Create New Event</CardTitle>
              <CardDescription>Set up a new show and generate a promoter portal</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="eventName">Event Name</Label>
                <Input
                  id="eventName"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Summer Concert Series - Night 1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventDate">Event Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="eventDate"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Run of Show Times
              </Label>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="loadIn" className="text-xs text-muted-foreground">
                    Load-In
                  </Label>
                  <Input
                    id="loadIn"
                    type="time"
                    value={formData.loadIn}
                    onChange={(e) => setFormData((prev) => ({ ...prev, loadIn: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="soundcheck" className="text-xs text-muted-foreground">
                    Soundcheck
                  </Label>
                  <Input
                    id="soundcheck"
                    type="time"
                    value={formData.soundcheck}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, soundcheck: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doors" className="text-xs text-muted-foreground">
                    Doors
                  </Label>
                  <Input
                    id="doors"
                    type="time"
                    value={formData.doors}
                    onChange={(e) => setFormData((prev) => ({ ...prev, doors: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="curfew" className="text-xs text-muted-foreground">
                    Curfew
                  </Label>
                  <Input
                    id="curfew"
                    type="time"
                    value={formData.curfew}
                    onChange={(e) => setFormData((prev) => ({ ...prev, curfew: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="loadOut" className="text-xs text-muted-foreground">
                  Load-Out
                </Label>
                <Input
                  id="loadOut"
                  type="time"
                  value={formData.loadOut}
                  onChange={(e) => setFormData((prev) => ({ ...prev, loadOut: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-secondary/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Starting Budget</p>
                <p className="text-xs text-muted-foreground">House minimums will be pre-applied</p>
              </div>
              <Badge variant="outline" className="text-lg px-3 py-1">
                ${getHouseMinimumTotal().toLocaleString()}
              </Badge>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleCreate}
              disabled={!formData.name || !formData.date}
              className="gap-2"
            >
              <CalendarPlus className="w-4 h-4" />
              Create Event
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
