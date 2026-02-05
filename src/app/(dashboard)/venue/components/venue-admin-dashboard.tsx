"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Settings, CalendarPlus, LayoutDashboard, Truck } from "lucide-react"
import { BaseConfiguration } from "@/components/venue/base-configuration"
import { CatalogManager } from "@/components/venue/catalog-manager"
import { EventCreator } from "@/components/venue/event-creator"
import { LogisticsOverview } from "@/components/venue/logistics-overview"
import { MasterEventView } from "@/components/venue/master-event-view"
import { GreenRoomCatalog } from "@/components/venue/green-room-catalog"
import { VenueDashboardSkeleton } from "@/components/venue-dashboard-skeleton"
import { useEvent, type Event } from "@/components/event-context"
import { useVenueData } from "@/components/venue-data-provider"

export function VenueAdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const { setCurrentEvent } = useEvent()
  const { loading } = useVenueData()

  if (loading) return <VenueDashboardSkeleton />

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event)
    setCurrentEvent(event)
  }

  const handleBack = () => {
    setSelectedEvent(null)
  }

  const handleEdit = () => {
    if (selectedEvent) {
      setCurrentEvent(selectedEvent)
      setActiveTab("create-event")
      setSelectedEvent(null)
    }
  }

  // If an event is selected, show the master event view
  if (selectedEvent) {
    return (
      <div className="space-y-6">
        <MasterEventView event={selectedEvent} onBack={handleBack} onEdit={handleEdit} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Control Room</h2>
        <p className="text-muted-foreground">Manage your venue, catalog, and events</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <TabsList className="bg-secondary/50 p-1 h-auto flex-wrap">
            <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-card">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="venue-settings" className="gap-2 data-[state=active]:bg-card">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Venue Settings</span>
            </TabsTrigger>
            <TabsTrigger value="logistics" className="gap-2 data-[state=active]:bg-card">
              <Truck className="w-4 h-4" />
              <span className="hidden sm:inline">Logistics</span>
            </TabsTrigger>
          </TabsList>
          <Button onClick={() => setActiveTab("create-event")} className="gap-2">
            <CalendarPlus className="w-4 h-4" />
            <span>New Event</span>
          </Button>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <LogisticsOverview showLoadInOut={false} onEventClick={handleEventClick} />
        </TabsContent>

        <TabsContent value="venue-settings" className="space-y-6">
          <BaseConfiguration />
          <CatalogManager />
          <GreenRoomCatalog />
        </TabsContent>

        <TabsContent value="create-event" className="space-y-6">
          <EventCreator />
        </TabsContent>

        <TabsContent value="logistics" className="space-y-6">
          <LogisticsOverview showLoadInOut onEventClick={handleEventClick} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
