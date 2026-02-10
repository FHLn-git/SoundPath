"use client"

import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useEffect, useMemo } from "react"
import { useVenue } from "@/lib/use-venue"
import { useStages } from "@/lib/use-venue-hierarchy"
import { useShows } from "@/lib/use-shows"
import { VenueDashboardSkeleton } from "@/components/venue-dashboard-skeleton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Box, ChevronLeft } from "lucide-react"

export default function StageViewPage() {
  const params = useParams()
  const router = useRouter()
  const venueId = typeof params.venueId === "string" ? params.venueId : null
  const stageId = typeof params.stageId === "string" ? params.stageId : null
  const { venues, setActiveVenueId, loading: venueLoading } = useVenue()
  const { stages, loading: stagesLoading } = useStages(venueId)
  const stage = useMemo(
    () => (stageId && stages.length ? stages.find((s) => s.id === stageId) ?? null : null),
    [stageId, stages]
  )
  const stageNamesFromStages = useMemo(
    () => stages.reduce<Record<string, string>>((acc, s) => ({ ...acc, [s.id]: s.name }), []),
    [stages]
  )
  const { shows, loading: showsLoading } = useShows(venueId, {
    stageId: stageId ?? undefined,
    stageNamesFromStages,
  })

  useEffect(() => {
    if (venueId) setActiveVenueId(venueId)
  }, [venueId, setActiveVenueId])

  if (!venueId || !stageId) {
    router.replace(venueId ? `/venue/${venueId}` : "/venue/hq")
    return null
  }

  if (venueLoading || stagesLoading) {
    return (
      <div className="min-h-screen bg-[#0B0E14] p-6">
        <VenueDashboardSkeleton />
      </div>
    )
  }

  if (!stage) {
    return (
      <div className="min-h-screen bg-[#0B0E14] p-6 flex flex-col items-center justify-center gap-4">
        <p className="font-mono text-muted-foreground">Stage not found.</p>
        <Button asChild variant="outline" size="sm" className="font-mono">
          <Link href={`/venue/${venueId}`}>Back to venue</Link>
        </Button>
      </div>
    )
  }

  const venue = venues.find((v) => v.id === venueId)

  return (
    <div className="min-h-screen bg-[#0B0E14] text-foreground">
      <div className="border-b border-border/60 bg-card/30 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-mono">
            <Button asChild variant="ghost" size="sm" className="font-mono text-muted-foreground">
              <Link href={`/venue/${venueId}`} className="gap-1">
                <ChevronLeft className="w-4 h-4" />
                Back
              </Link>
            </Button>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground font-medium flex items-center gap-1.5">
              <Box className="w-4 h-4 text-primary" />
              {stage.name}
            </span>
            {venue && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{venue.name}</span>
              </>
            )}
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            {stage.capacity != null ? `Cap. ${stage.capacity}` : "—"}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Technical rider (tech specs) for this stage */}
        {stage.technical_specs_json && Object.keys(stage.technical_specs_json as Record<string, unknown>).length > 0 && (
          <Card className="border-border/80 bg-card/80 font-mono">
            <CardHeader>
              <CardTitle className="text-base font-mono">Technical rider</CardTitle>
              <CardDescription className="text-xs font-mono">
                House specs for {stage.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-xs text-muted-foreground overflow-x-auto p-4 rounded bg-background/50 font-mono whitespace-pre-wrap">
                {JSON.stringify(stage.technical_specs_json, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Stage calendar / event list */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider font-mono mb-3">
            Calendar · {stage.name}
          </h2>
          {showsLoading ? (
            <div className="font-mono text-muted-foreground text-sm">Loading events...</div>
          ) : shows.length > 0 ? (
            <Card className="border-border/80 bg-card/80 font-mono">
              <CardContent className="p-0">
                <ul className="divide-y divide-border/60">
                  {shows.map((ev) => (
                    <li key={ev.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="font-mono text-sm text-foreground">{ev.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {new Date(ev.date).toLocaleDateString()} · {ev.doors ?? "—"} doors
                        </p>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">{ev.status}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-border/60 bg-card/40">
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground font-mono">
                  No events on this stage yet.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <Button asChild variant="outline" size="sm" className="font-mono">
          <Link href={`/venue/${venueId}`}>← Back to venue</Link>
        </Button>
      </div>
    </div>
  )
}
