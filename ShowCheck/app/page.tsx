"use client"

import Link from "next/link"
import { Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { VenueAdminDashboard } from "@/components/venue-admin-dashboard"
import { PromoterPortal } from "@/components/promoter-portal"
import { AppHeader } from "@/components/app-header"
import { VenueDataProvider, useVenueData } from "@/components/venue-data-provider"
import { useVenue } from "@/lib/use-venue"
import { CreateVenueModal } from "@/components/create-venue-modal"
import { VenueDashboardSkeleton } from "@/components/venue-dashboard-skeleton"
import { Button } from "@/components/ui/button"
import { Building2, Plus, LayoutDashboard } from "lucide-react"

function VenueContent({
  currentView,
  createVenueOpen,
  setCreateVenueOpen,
  handleVenueCreated,
  openTab,
  onClearedOpenTab,
}: {
  currentView: "venue" | "promoter"
  createVenueOpen: boolean
  setCreateVenueOpen: (v: boolean) => void
  handleVenueCreated: (venueId: string) => void | Promise<void>
  openTab: string | null
  onClearedOpenTab: () => void
}) {
  const { loading } = useVenueData()
  const { venues, activeVenueId } = useVenue()

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-6">
        <VenueDashboardSkeleton />
      </main>
    )
  }

  if (venues.length === 0 && activeVenueId) {
    return (
      <main className="container mx-auto px-4 py-6">
        <VenueDashboardSkeleton />
      </main>
    )
  }

  if (venues.length === 0 && !activeVenueId) {
    return (
      <main className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">No venue yet</h2>
          <p className="text-muted-foreground mb-6">
            Create your first performance space to start managing shows, calendar, and payouts.
          </p>
          <Button onClick={() => setCreateVenueOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create New Venue
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        <Button asChild variant="outline" size="sm" className="font-mono gap-1.5">
          <Link href="/venue/hq">
            <LayoutDashboard className="w-4 h-4" />
            HQ Roll-Up
          </Link>
        </Button>
      </div>
      {currentView === "venue" ? (
        <VenueAdminDashboard openTab={openTab} onClearedOpenTab={onClearedOpenTab} />
      ) : (
        <PromoterPortal />
      )}
    </main>
  )
}

function PageWithHeader() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [currentView, setCurrentView] = useState<"venue" | "promoter">("venue")
  const [createVenueOpen, setCreateVenueOpen] = useState(false)
  const [openTab, setOpenTab] = useState<string | null>(null)
  const { venues, activeVenue, setActiveVenueId, refetchVenues } = useVenue()
  const { multiStageView, setMultiStageView } = useVenueData()

  // Sync venue from HQ: /?venue=id sets active venue (venue selector lives on HQ only)
  useEffect(() => {
    const venueId = searchParams.get("venue")
    if (venueId && venues.some((v) => v.id === venueId)) {
      setActiveVenueId(venueId)
    }
  }, [searchParams, venues, setActiveVenueId])

  // Open create-venue modal from HQ link: /?createVenue=1 (then clear query so URL is clean)
  useEffect(() => {
    if (searchParams.get("createVenue") === "1") {
      setCreateVenueOpen(true)
      router.replace("/", { scroll: false })
    }
  }, [searchParams, router])

  const handleVenueCreated = async (venueId: string) => {
    setActiveVenueId(venueId)
    await refetchVenues()
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        currentView={currentView}
        onViewChange={setCurrentView}
        activeVenue={activeVenue}
        multiStageView={multiStageView}
        onMultiStageViewChange={setMultiStageView}
        onOpenVenueSettings={() => setOpenTab("venue-settings")}
      />
      <VenueContent
        currentView={currentView}
        createVenueOpen={createVenueOpen}
        setCreateVenueOpen={setCreateVenueOpen}
        handleVenueCreated={handleVenueCreated}
        openTab={openTab}
        onClearedOpenTab={() => setOpenTab(null)}
      />
      <CreateVenueModal
        open={createVenueOpen}
        onOpenChange={setCreateVenueOpen}
        onCreated={handleVenueCreated}
      />
    </div>
  )
}

export default function Home() {
  return (
    <VenueDataProvider>
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <PageWithHeader />
      </Suspense>
    </VenueDataProvider>
  )
}
