"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useEvent, type MenuItem } from "@/components/event-context"
import {
  Clock,
  DollarSign,
  Coffee,
  FileCheck,
  MessageSquare,
  Edit3,
  Send,
  X,
  Star,
  Music,
  Truck,
  AlertTriangle,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"

export function EventDetailsWidget() {
  const { currentEvent, menuItems, getHouseMinimumTotal, getTotalBudget, resetWizard } = useEvent()
  const [changeRequest, setChangeRequest] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (!currentEvent) return null

  const houseMinTotal = getHouseMinimumTotal()
  const currentTotal = getTotalBudget()

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":")
    const h = Number.parseInt(hours, 10)
    const ampm = h >= 12 ? "PM" : "AM"
    const h12 = h % 12 || 12
    return `${h12}:${minutes} ${ampm}`
  }

  const greenRoomItems = menuItems.filter(
    (item) => item.category === "hospitality" && currentEvent.greenRoomItems.some((g) => g.id === item.id && g.quantity > 0)
  )

  const handleSubmitRequest = () => {
    if (!changeRequest.trim()) return
    setIsSubmitting(true)
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false)
      setSubmitted(true)
      setTimeout(() => {
        setSubmitted(false)
        setChangeRequest("")
      }, 2000)
    }, 1000)
  }

  return (
    <Card className="relative overflow-hidden border-border bg-gradient-to-br from-card via-card to-primary/5">
      {/* Glassmorphism overlay effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      
      <CardHeader className="relative pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/20 border border-warning/30">
              <FileCheck className="w-5 h-5 text-warning" />
            </div>
            <div>
              <CardTitle className="text-lg">Event Details</CardTitle>
              <p className="text-sm text-muted-foreground">{currentEvent.name}</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="bg-warning/10 text-warning border-warning/30 px-3 py-1"
          >
            Pending Venue Approval
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-6">
        {/* Total Cost - Premium Display */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Estimated Cost</p>
                <p className="text-2xl font-bold text-foreground">${currentTotal.toLocaleString()}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">House Min: ${houseMinTotal.toLocaleString()}</p>
              <p className="text-xs text-primary">+${(currentTotal - houseMinTotal).toLocaleString()} add-ons</p>
            </div>
          </div>
        </div>

        {/* Run of Show - Compact */}
        <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h4 className="font-medium text-foreground text-sm">Run of Show</h4>
          </div>
          <div className="grid grid-cols-5 gap-2 text-xs mb-3">
            <div className="text-center">
              <span className="text-muted-foreground block">Load-In</span>
              <span className="font-medium text-foreground">{formatTime(currentEvent.loadIn)}</span>
            </div>
            <div className="text-center">
              <span className="text-muted-foreground block">Check</span>
              <span className="font-medium text-foreground">{formatTime(currentEvent.soundcheck)}</span>
            </div>
            <div className="text-center">
              <span className="text-muted-foreground block">Doors</span>
              <span className="font-medium text-foreground">{formatTime(currentEvent.doors)}</span>
            </div>
            <div className="text-center">
              <span className="text-muted-foreground block">Curfew</span>
              <span className="font-medium text-foreground">{formatTime(currentEvent.curfew)}</span>
            </div>
            <div className="text-center">
              <span className="text-muted-foreground block">Out</span>
              <span className="font-medium text-foreground">{formatTime(currentEvent.loadOut)}</span>
            </div>
          </div>
          
          {/* Band Set Times */}
          {currentEvent.bands.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/50">
              {currentEvent.bands.map((band) => (
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
                  <span className="text-muted-foreground">{formatTime(band.setStart)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Green Room Highlights */}
        {greenRoomItems.length > 0 && (
          <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <Coffee className="w-4 h-4 text-muted-foreground" />
              <h4 className="font-medium text-foreground text-sm">Green Room</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {greenRoomItems.map((item) => {
                const qty = currentEvent.greenRoomItems.find((g) => g.id === item.id)?.quantity || 0
                return (
                  <Badge key={item.id} variant="secondary" className="text-xs">
                    {item.name} x{qty}
                  </Badge>
                )
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="flex-1 gap-2 bg-transparent">
                <MessageSquare className="w-4 h-4" />
                Request Changes
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-card border-border">
              <SheetHeader>
                <SheetTitle>Request Changes</SheetTitle>
                <SheetDescription>
                  Send a message to the venue admin about specific changes you need for this event.
                </SheetDescription>
              </SheetHeader>
              <div className="py-6">
                <Textarea
                  placeholder="Describe the changes you need... (e.g., 'We need to add an additional bartender' or 'Please change the load-in time to 2pm')"
                  value={changeRequest}
                  onChange={(e) => setChangeRequest(e.target.value)}
                  className="min-h-[150px] bg-background"
                />
              </div>
              <SheetFooter>
                <SheetClose asChild>
                  <Button variant="outline" className="bg-transparent">Cancel</Button>
                </SheetClose>
                <Button 
                  onClick={handleSubmitRequest} 
                  disabled={!changeRequest.trim() || isSubmitting}
                  className="gap-2"
                >
                  {isSubmitting ? (
                    "Sending..."
                  ) : submitted ? (
                    <>
                      <FileCheck className="w-4 h-4" />
                      Sent!
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Request
                    </>
                  )}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <Button
            variant="ghost"
            size="icon"
            onClick={resetWizard}
            className="shrink-0"
            title="Edit Selection"
          >
            <Edit3 className="w-4 h-4" />
          </Button>
        </div>

        {/* Status Note */}
        <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg text-xs">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-muted-foreground">
            Your selection is awaiting venue approval. You will be notified once the venue confirms or requests modifications.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
