"use client"

import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useEffect, useMemo } from "react"
import { Building2, ChevronRight, Box } from "lucide-react"
import { useVenue } from "@/lib/use-venue"
import { useStages } from "@/lib/use-venue-hierarchy"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Venue } from "@/lib/venue-types"
import type { SharedFacility } from "@/lib/venue-types"

function sharedFacilities(venue: Venue): SharedFacility[] {
  const raw = venue.shared_facilities_json
  if (Array.isArray(raw)) return raw as SharedFacility[]
  if (raw && typeof raw === "object" && "facilities" in raw && Array.isArray((raw as { facilities: unknown }).facilities)) {
    return (raw as { facilities: SharedFacility[] }).facilities
  }
  return []
}

export default function VenueViewPage() {
  const params = useParams()
  const router = useRouter()
  const venueId = typeof params.venueId === "string" ? params.venueId : null
  const { venues, activeVenueId, setActiveVenueId, loading } = useVenue()
  const { stages, loading: stagesLoading } = useStages(venueId)

  const venue = useMemo(
    () => (venueId && venues.length ? venues.find((v) => v.id === venueId) ?? null : null),
    [venueId, venues]
  )

  useEffect(() => {
    if (venueId) setActiveVenueId(venueId)
  }, [venueId, setActiveVenueId])

  if (!venueId) {
    router.replace("/venue/hq")
    return null
  }

  if (loading || !venue) {
    return (
      <div className="min-h-screen bg-[#0B0E14] p-6 flex items-center justify-center">
        <div className="font-mono text-muted-foreground text-sm">
          {loading ? "Loading..." : "Venue not found."}
        </div>
      </div>
    )
  }

  const facilities = sharedFacilities(venue)

  return (
    <div className="min-h-screen bg-[#0B0E14] text-foreground p-6">
      <div className="container max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight font-mono text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {venue.name}
          </h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            Shared resources & stages
          </p>
        </div>

        {facilities.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider font-mono">
              Shared facilities
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {facilities.map((f) => (
                <Card key={f.id} className="border-border/80 bg-card/80 font-mono">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-mono flex items-center justify-between">
                      {f.name}
                      <Badge variant={f.status === "occupied" ? "destructive" : "secondary"} className="text-xs font-mono">
                        {f.status ?? "available"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider font-mono">
            Stages
          </h2>
          {stagesLoading ? (
            <div className="font-mono text-muted-foreground text-sm">Loading stages...</div>
          ) : stages.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {stages.map((s) => (
                <Link key={s.id} href={`/venue/${venueId}/${s.id}`}>
                  <Card className="border-border/80 bg-card/80 hover:bg-card hover:border-primary/30 transition-colors cursor-pointer font-mono">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-mono flex items-center gap-2">
                          <Box className="w-4 h-4 text-primary" />
                          {s.name}
                        </CardTitle>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <CardDescription className="text-xs font-mono">
                        {s.capacity != null ? `Cap. ${s.capacity}` : "—"}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-border/60 bg-card/40">
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground font-mono">
                  No stages yet. Add stages in Venue Settings.
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        <div className="pt-4">
          <Button asChild variant="outline" size="sm" className="font-mono">
            <Link href="/venue/hq">← Back to HQ</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
