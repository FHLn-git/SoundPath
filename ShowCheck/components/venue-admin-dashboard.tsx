"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CalendarPlus, LayoutDashboard, Truck, ChevronDown, Box, Anchor, CalendarDays, List, Inbox, FileSignature, DollarSign, CalendarCheck, Grid3X3 } from "lucide-react"
import { VenueDetailsSettings } from "@/components/venue/venue-details-settings"
import { DeleteVenueCard } from "@/components/venue/delete-venue-card"
import { BaseConfiguration } from "@/components/venue/base-configuration"
import { CatalogManager } from "@/components/venue/catalog-manager"
import { EventCreator } from "@/components/venue/event-creator"
import { LogisticsOverview } from "@/components/venue/logistics-overview"
import { MasterEventView } from "@/components/venue/master-event-view"
import { GreenRoomCatalog } from "@/components/venue/green-room-catalog"
import { CalendarView } from "@/components/venue/calendar-view"
import { ListView } from "@/components/venue/list-view"
import { AddHoldModal } from "@/components/venue/add-hold-modal"
import { RemoveHoldDialog } from "@/components/venue/remove-hold-dialog"
import { CalendarImportCard } from "@/components/venue/calendar-import-card"
import { InboundQueue } from "@/components/venue/inbound-queue"
import { CreateOfferModal } from "@/components/venue/create-offer-modal"
import { OfferTemplatesCard } from "@/components/venue/offer-templates-card"
import { AdvanceTemplatesCard } from "@/components/venue/advance-templates-card"
import { VenueAssetsCard } from "@/components/venue/venue-assets-card"
import { VenueIntegrationsCard } from "@/components/venue/venue-integrations-card"
import { StageManagementCard } from "@/components/venue/stage-management-card"
import { OffersList } from "@/components/venue/offers-list"
import { GlobalTimelineView } from "@/components/venue/global-timeline-view"
import { TimeBlockGrid } from "@/components/venue/time-block-grid"
import { ShowAdvanceWizard } from "@/components/venue/show-advance-wizard"
import { VenueLogisticsSummary } from "@/components/venue/venue-logistics-summary"
import { StageDeepDiveCard } from "@/components/venue/stage-deep-dive-card"
import { PaymentTrackerView } from "@/components/venue/payment-tracker-view"
import { SettlementReportsCard } from "@/components/venue/settlement-reports-card"
import { VenueRollupReportCard } from "@/components/venue/venue-rollup-report-card"
import { CheckAvailsModal } from "@/components/venue/check-avails-modal"
import { VenueSettingsPage } from "@/components/venue/venue-settings-page"
import { VenueDashboardSkeleton } from "@/components/venue-dashboard-skeleton"
import { useEvent, type Event } from "@/components/event-context"
import { useVenueData } from "@/components/venue-data-provider"
import { useVenue } from "@/lib/use-venue"
import { useStages } from "@/lib/use-venue-hierarchy"
import { listShows } from "@/lib/show-api"
import { showRowToEvent } from "@/lib/show-mapping"
import { format, startOfMonth, endOfMonth } from "date-fns"
import type { OfferTemplateRow, OfferRow } from "@/lib/venue-types"
import type { Stage } from "@/lib/venue-types"

const COMMAND_GLOBAL = "global"

interface VenueAdminDashboardProps {
  /** When set, switch to this tab (e.g. "venue-settings" from header gear) and then clear */
  openTab?: string | null
  onClearedOpenTab?: () => void
}

export function VenueAdminDashboard({ openTab = null, onClearedOpenTab }: VenueAdminDashboardProps = {}) {
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [addHoldOpen, setAddHoldOpen] = useState(false)
  const [addHoldPrefill, setAddHoldPrefill] = useState<{ artistName: string; date: string } | null>(null)
  const [createOfferSubmission, setCreateOfferSubmission] = useState<import("@/lib/venue-types").InboundSubmissionRow | null>(null)
  const [removeHoldTarget, setRemoveHoldTarget] = useState<Event | null>(null)
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null)
  const [selectedTemplateForOffer, setSelectedTemplateForOffer] = useState<OfferTemplateRow | null>(null)
  const [createOfferOpenFromOffers, setCreateOfferOpenFromOffers] = useState(false)
  const [editingOffer, setEditingOffer] = useState<OfferRow | null>(null)
  const [offerIdToOpen, setOfferIdToOpen] = useState<string | null>(null)
  const [calendarViewMode, setCalendarViewMode] = useState<"calendar" | "list" | "grid">("calendar")
  const [gridWeekStart, setGridWeekStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay())
    return d
  })
  const [showAdvanceWizardOpen, setShowAdvanceWizardOpen] = useState(false)
  const [showAdvanceWizardPrefill, setShowAdvanceWizardPrefill] = useState<import("@/components/venue/show-advance-wizard").ShowAdvanceWizardPrefill | null>(null)
  const [dealsSubTab, setDealsSubTab] = useState<"inbound" | "offers">("inbound")
  /** "global" = Venue View timeline; otherwise stage id for stage deep-dive */
  const [commandCenterView, setCommandCenterView] = useState<string>(COMMAND_GLOBAL)
  const [globalViewDate, setGlobalViewDate] = useState(() => new Date())
  const [inboundFormBaseUrl, setInboundFormBaseUrl] = useState("")
  const [checkAvailsOpen, setCheckAvailsOpen] = useState(false)
  const { events, setCurrentEvent, saveEvent, deleteEvent } = useEvent()
  const { loading, stageNames, refetchEvents } = useVenueData()
  const { activeVenueId, activeVenue, venues, userId } = useVenue()
  const { stages } = useStages(activeVenueId)

  useEffect(() => {
    if (typeof window !== "undefined") setInboundFormBaseUrl(window.location.origin)
  }, [])

  useEffect(() => {
    if (openTab) {
      setActiveTab(openTab)
      onClearedOpenTab?.()
    }
  }, [openTab, onClearedOpenTab])

  const handleConvertHoldToConfirmed = useCallback(
    async (event: Event) => {
      if (!saveEvent) return
      await saveEvent({ ...event, status: "confirmed" })
    },
    [saveEvent]
  )

  const handleRemoveHold = useCallback(
    async (hold: Event, autoPromote: boolean) => {
      await deleteEvent(hold.id)
      if (autoPromote && activeVenueId) {
        const rows = await listShows(activeVenueId, {
          status: "hold",
          dateFrom: hold.date,
          dateTo: hold.date,
          stageId: hold.stageId ?? undefined,
        })
        const nextRow = rows.filter((r) => r.id !== hold.id)[0]
        if (nextRow) {
          const nextEvent = showRowToEvent(nextRow, stageNames)
          if (saveEvent) await saveEvent({ ...nextEvent, status: "confirmed" })
        }
      }
    },
    [activeVenueId, deleteEvent, saveEvent, stageNames]
  )

  const currentStage = useMemo(
    () => (commandCenterView !== COMMAND_GLOBAL ? stages.find((s) => s.id === commandCenterView) : null),
    [commandCenterView, stages]
  )
  const commandCenterLabel =
    commandCenterView === COMMAND_GLOBAL ? "Venue View" : (currentStage?.name ?? "Stage")

  const venueStats = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd")
    const upcoming = events.filter((e) => e.date >= today && e.status !== "cancelled").length
    const holds = events.filter((e) =>
      ["hold", "hold_1", "hold_2"].includes(e.status)
    ).length
    const confirmed = events.filter((e) =>
      ["confirmed", "on_sale", "completed"].includes(e.status)
    ).length
    const thisMonthStart = format(startOfMonth(new Date()), "yyyy-MM-dd")
    const thisMonthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd")
    const thisMonth = events.filter(
      (e) => e.date >= thisMonthStart && e.date <= thisMonthEnd && e.status !== "cancelled"
    ).length
    return { upcoming, holds, confirmed, thisMonth }
  }, [events])

  useEffect(() => {
    setCommandCenterView(COMMAND_GLOBAL)
  }, [activeVenueId])

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
      setEventToEdit(selectedEvent)
      setCurrentEvent(selectedEvent)
      setActiveTab("create-event")
      setSelectedEvent(null)
    }
  }

  // Venue Settings takes priority so the header gear always opens settings
  if (activeTab === "venue-settings") {
    return (
      <div className="space-y-6">
        <VenueSettingsPage
          onBack={() => setActiveTab("overview")}
          venueId={activeVenueId}
          venue={activeVenue}
          onUseOfferTemplate={(template) => {
            setSelectedTemplateForOffer(template)
            setCreateOfferOpenFromOffers(true)
            setEditingOffer(null)
            setDealsSubTab("offers")
            setActiveTab("deals")
          }}
        />
      </div>
    )
  }

  // If an event is selected, show the master event view
  if (selectedEvent) {
    return (
      <div className="space-y-6">
        <MasterEventView
          event={selectedEvent}
          onBack={handleBack}
          onEdit={handleEdit}
          onViewLinkedOffer={(offerId) => {
            setOfferIdToOpen(offerId)
            setDealsSubTab("offers")
            setActiveTab("deals")
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-2xl font-bold text-foreground tracking-tight">
            {activeVenue?.name ?? "Venue"}
          </h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 font-normal">
                {commandCenterLabel}
                <ChevronDown className="w-4 h-4 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[200px]">
              <DropdownMenuItem
                onClick={() => setCommandCenterView(COMMAND_GLOBAL)}
                className={commandCenterView === COMMAND_GLOBAL ? "bg-accent/50" : ""}
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Venue View
              </DropdownMenuItem>
              {stages.map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  onClick={() => setCommandCenterView(s.id)}
                  className={commandCenterView === s.id ? "bg-accent/50" : ""}
                >
                  <Box className="w-4 h-4 mr-2" />
                  {s.name}
                  {(s.capacity != null || s.legal_capacity != null) && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      Cap. {s.legal_capacity ?? s.capacity}
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {commandCenterView === COMMAND_GLOBAL && stages.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="global-date" className="text-sm text-muted-foreground">Date</label>
              <input
                id="global-date"
                type="date"
                value={format(globalViewDate, "yyyy-MM-dd")}
                onChange={(e) => setGlobalViewDate(new Date(e.target.value))}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono"
              />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm font-mono border-l border-border pl-4">
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">{venueStats.upcoming}</span> upcoming
              </span>
              <span className="text-amber-400/90">
                <span className="font-medium">{venueStats.holds}</span> holds
              </span>
              <span className="text-emerald-400/90">
                <span className="font-medium">{venueStats.confirmed}</span> confirmed
              </span>
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">{venueStats.thisMonth}</span> this month
              </span>
            </div>
          </div>
          <GlobalTimelineView
            venueId={activeVenueId}
            date={globalViewDate}
            onEventClick={handleEventClick}
          />
        </div>
      )}

      {(commandCenterView !== COMMAND_GLOBAL || stages.length === 0) && (
      <>
        {currentStage && <StageDeepDiveCard stage={currentStage} />}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" aria-label="Venue dashboard sections">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList className="bg-secondary/50 p-1 h-auto flex-wrap" role="tablist" aria-label="Main sections">
            <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-card" role="tab" aria-selected={activeTab === "overview"}>
              <LayoutDashboard className="w-4 h-4" aria-hidden />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2 data-[state=active]:bg-card" role="tab" aria-selected={activeTab === "calendar"}>
              <CalendarDays className="w-4 h-4" aria-hidden />
              <span className="hidden sm:inline">Calendar</span>
            </TabsTrigger>
            <TabsTrigger value="deals" className="gap-2 data-[state=active]:bg-card" role="tab" aria-selected={activeTab === "deals"}>
              <Inbox className="w-4 h-4" aria-hidden />
              <span className="hidden sm:inline">Deals</span>
            </TabsTrigger>
            <TabsTrigger value="logistics" className="gap-2 data-[state=active]:bg-card" role="tab" aria-selected={activeTab === "logistics"}>
              <Truck className="w-4 h-4" aria-hidden />
              <span className="hidden sm:inline">Logistics</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2 data-[state=active]:bg-card" role="tab" aria-selected={activeTab === "payments"}>
              <DollarSign className="w-4 h-4" aria-hidden />
              <span className="hidden sm:inline">Payments</span>
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCheckAvailsOpen(true)} className="gap-2" aria-label="Check available dates">
              <CalendarCheck className="w-4 h-4" />
              <span>Check avails</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAddHoldOpen(true)} className="gap-2">
              <Anchor className="w-4 h-4" />
              <span>Add hold</span>
            </Button>
            <Button
              onClick={() => {
                setEventToEdit(null)
                setActiveTab("create-event")
              }}
              className="gap-2"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>New Event</span>
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <LogisticsOverview showLoadInOut={false} onEventClick={handleEventClick} />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <Tabs
            value={calendarViewMode}
            onValueChange={(v) => setCalendarViewMode(v as "calendar" | "list" | "grid")}
            className="space-y-4"
          >
            <TabsList className="bg-secondary/50 p-1 h-auto w-fit">
              <TabsTrigger value="calendar" className="gap-1.5 data-[state=active]:bg-card">
                <CalendarDays className="w-4 h-4" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="grid" className="gap-1.5 data-[state=active]:bg-card">
                <Grid3X3 className="w-4 h-4" />
                Grid
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-1.5 data-[state=active]:bg-card">
                <List className="w-4 h-4" />
                List
              </TabsTrigger>
            </TabsList>
            {calendarViewMode === "calendar" && (
              <>
                <CalendarView
                  currentMonth={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  onEventClick={handleEventClick}
                />
                <CalendarImportCard />
              </>
            )}
            {calendarViewMode === "grid" && (
              <TimeBlockGrid
                stage={commandCenterView !== COMMAND_GLOBAL ? currentStage : stages[0] ?? null}
                weekStart={gridWeekStart}
                onWeekChange={setGridWeekStart}
                onEventClick={handleEventClick}
                onSlotClick={(payload) => {
                  setShowAdvanceWizardPrefill(payload)
                  setShowAdvanceWizardOpen(true)
                }}
              />
            )}
            {calendarViewMode === "list" && (
              <ListView
                onEventClick={handleEventClick}
                onConvertHold={handleConvertHoldToConfirmed}
                onRemoveHold={(ev) => setRemoveHoldTarget(ev)}
              />
            )}
          </Tabs>
        </TabsContent>

        <TabsContent value="deals" className="space-y-6">
          <Tabs
            value={dealsSubTab}
            onValueChange={(v) => setDealsSubTab(v as "inbound" | "offers")}
            className="space-y-4"
          >
            <TabsList className="bg-secondary/50 p-1 h-auto w-fit">
              <TabsTrigger value="inbound" className="gap-1.5 data-[state=active]:bg-card">
                <Inbox className="w-4 h-4" />
                Inbound
              </TabsTrigger>
              <TabsTrigger value="offers" className="gap-1.5 data-[state=active]:bg-card">
                <FileSignature className="w-4 h-4" />
                Offers
              </TabsTrigger>
            </TabsList>
            <TabsContent value="inbound" className="mt-0 space-y-6">
              <InboundQueue
                venueId={activeVenueId}
                groupId={null}
                inboundFormBaseUrl={inboundFormBaseUrl}
                onCreateHold={(submission) => {
                  const firstDate =
                    Array.isArray(submission.requested_dates) &&
                    submission.requested_dates[0] &&
                    typeof submission.requested_dates[0] === "string"
                      ? submission.requested_dates[0]
                      : ""
                  setAddHoldPrefill({
                    artistName: submission.artist_name ?? "",
                    date: firstDate,
                  })
                  setAddHoldOpen(true)
                }}
                onCreateOffer={(submission) => setCreateOfferSubmission(submission)}
              />
            </TabsContent>
            <TabsContent value="offers" className="mt-0 space-y-6">
              <OffersList
                venueId={activeVenueId}
                selectedTemplateForOffer={selectedTemplateForOffer}
                onClearTemplate={() => setSelectedTemplateForOffer(null)}
                onNewOffer={() => {
                  setCreateOfferOpenFromOffers(true)
                  setEditingOffer(null)
                }}
                onEditOffer={(offer) => {
                  setEditingOffer(offer)
                  setCreateOfferOpenFromOffers(false)
                }}
                offerIdToOpen={offerIdToOpen}
                onClearedOfferIdToOpen={() => setOfferIdToOpen(null)}
                onRefetchEvents={refetchEvents}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="create-event" className="space-y-6">
          <EventCreator
            initialEvent={eventToEdit}
            onSaved={() => setEventToEdit(null)}
          />
        </TabsContent>

        <TabsContent value="logistics" className="space-y-6">
          <VenueLogisticsSummary venueId={activeVenueId} onEventClick={handleEventClick} />
          <LogisticsOverview showLoadInOut onEventClick={handleEventClick} />
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <SettlementReportsCard onEventClick={handleEventClick} />
          <PaymentTrackerView onEventClick={handleEventClick} />
          <VenueRollupReportCard />
        </TabsContent>
      </Tabs>
      </>
      )}
      <AddHoldModal
        open={addHoldOpen}
        onOpenChange={(open) => {
          setAddHoldOpen(open)
          if (!open) setAddHoldPrefill(null)
        }}
        defaultArtistName={addHoldPrefill?.artistName ?? ""}
        defaultDate={addHoldPrefill?.date ?? ""}
      />
      <CreateOfferModal
        key={
          createOfferSubmission?.id ??
          editingOffer?.id ??
          (createOfferOpenFromOffers ? "new" : "closed")
        }
        open={
          !!createOfferSubmission || createOfferOpenFromOffers || !!editingOffer
        }
        onOpenChange={(open) => {
          if (!open) {
            setCreateOfferSubmission(null)
            setCreateOfferOpenFromOffers(false)
            setEditingOffer(null)
            setSelectedTemplateForOffer(null)
          }
        }}
        venueId={activeVenueId ?? ""}
        createdBy={userId}
        mode={editingOffer || createOfferOpenFromOffers ? "full" : "minimal"}
        prefilled={
          createOfferSubmission
            ? {
                artist_name: createOfferSubmission.artist_name ?? undefined,
                proposed_date:
                  Array.isArray(createOfferSubmission.requested_dates) &&
                  createOfferSubmission.requested_dates[0] &&
                  typeof createOfferSubmission.requested_dates[0] === "string"
                    ? createOfferSubmission.requested_dates[0]
                    : undefined,
              }
            : undefined
        }
        template={createOfferOpenFromOffers ? selectedTemplateForOffer : null}
        existingOffer={editingOffer}
        inboundSubmissionId={createOfferSubmission?.id}
        onCreated={() => {
          setCreateOfferOpenFromOffers(false)
          setEditingOffer(null)
          setSelectedTemplateForOffer(null)
        }}
      />
      <RemoveHoldDialog
        open={!!removeHoldTarget}
        onOpenChange={(open) => !open && setRemoveHoldTarget(null)}
        hold={removeHoldTarget}
        onConfirm={handleRemoveHold}
      />
      <CheckAvailsModal
        open={checkAvailsOpen}
        onOpenChange={setCheckAvailsOpen}
        venueId={activeVenueId}
        stages={stages}
      />
      <ShowAdvanceWizard
        open={showAdvanceWizardOpen}
        onClose={() => {
          setShowAdvanceWizardOpen(false)
          setShowAdvanceWizardPrefill(null)
        }}
        stage={showAdvanceWizardPrefill ? (stages.find((s) => s.id === showAdvanceWizardPrefill.stageId) ?? null) : null}
        prefill={showAdvanceWizardPrefill}
        venueId={activeVenueId}
        stageNames={stageNames}
      />
    </div>
  )
}
