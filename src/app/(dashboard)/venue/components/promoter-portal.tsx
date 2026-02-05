"use client"

import { useEvent } from "@/components/event-context"
import { RunOfShow } from "@/components/promoter/run-of-show"
import { ShowBuilderWizard } from "@/components/promoter/show-builder-wizard"
import { EventDetailsWidget } from "@/components/promoter/event-details-widget"
import { SettlementSidebar } from "@/components/promoter/settlement-sidebar"
import { TicketTracking } from "@/components/promoter/ticket-tracking"
import { Calendar, AlertCircle, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function PromoterPortal() {
  const { currentEvent } = useEvent()

  if (!currentEvent) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-secondary mb-4">
          <Calendar className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">No Event Selected</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Switch to Venue Admin view to create an event, or select an existing event to build your show.
        </p>
      </div>
    )
  }

  const getStatusBadge = () => {
    switch (currentEvent.status) {
      case "confirmed":
        return <Badge className="bg-primary text-primary-foreground">Confirmed</Badge>
      case "pending-approval":
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">Pending Approval</Badge>
      default:
        return <Badge variant="secondary">Draft</Badge>
    }
  }

  const getStatusMessage = () => {
    switch (currentEvent.status) {
      case "pending-approval":
        return (
          <div className="flex items-center gap-2 px-3 py-2 bg-warning/10 border border-warning/20 rounded-lg">
            <Clock className="w-4 h-4 text-warning" />
            <span className="text-sm text-warning">Awaiting venue approval</span>
          </div>
        )
      case "draft":
        return (
          <div className="flex items-center gap-2 px-3 py-2 bg-warning/10 border border-warning/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-warning" />
            <span className="text-sm text-warning">Build your show to finalize</span>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                {currentEvent.name}
              </h2>
              {getStatusBadge()}
            </div>
            <p className="text-muted-foreground">
              {new Date(currentEvent.date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          {getStatusMessage()}
        </div>

        {/* Conditionally show Wizard or Event Details based on wizardCompleted state */}
        {currentEvent.wizardCompleted ? (
          <>
            <EventDetailsWidget />
            <RunOfShow />
          </>
        ) : (
          <>
            <RunOfShow />
            <ShowBuilderWizard />
          </>
        )}
        
        <TicketTracking />
      </div>

      <SettlementSidebar />
    </div>
  )
}
