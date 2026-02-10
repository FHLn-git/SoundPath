"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getAdvanceData } from "@/lib/advance-api"
import type { AdvanceDataPayload } from "@/lib/venue-types"
import { Clock, MapPin, Calendar, Music } from "lucide-react"
import { format } from "date-fns"

function formatTime(time: string | null): string {
  if (!time) return "—"
  const part = time.slice(0, 5)
  const [h, m] = part.split(":")
  const hour = parseInt(h ?? "0", 10)
  const ampm = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 || 12
  return `${displayHour}:${m ?? "00"} ${ampm}`
}

function formatAddress(v: AdvanceDataPayload["venue"]): string {
  const parts = [
    v.address_street_1,
    v.address_street_2,
    [v.address_city, v.address_state_region].filter(Boolean).join(", "),
    v.address_postal_code,
    v.address_country,
  ].filter(Boolean)
  return parts.join(", ") || "Address not set"
}

export default function AdvancePage() {
  const params = useParams()
  const showId = params?.showId as string
  const [data, setData] = useState<AdvanceDataPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!showId) {
      setLoading(false)
      setError("Missing show")
      return
    }
    getAdvanceData(showId)
      .then((d) => {
        setData(d)
        setError(d ? null : "Show not found")
      })
      .catch(() => setError("Failed to load advance"))
      .finally(() => setLoading(false))
  }, [showId])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-foreground p-6 flex items-center justify-center">
        <p className="text-muted-foreground">Loading advance…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-foreground p-6 flex items-center justify-center">
        <p className="text-destructive">{error ?? "Not found"}</p>
      </div>
    )
  }

  const { show, venue } = data
  const bands = Array.isArray(show.bands) ? show.bands : []

  return (
    <div className="min-h-screen bg-[#0B0E14] text-foreground p-6 max-w-2xl mx-auto">
      <header className="border-b border-border pb-4 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {show.name || show.artist_name || "Advance"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          {format(new Date(show.date), "EEEE, MMMM d, yyyy")}
        </p>
        <p className="text-muted-foreground text-sm font-mono mt-1">{venue.name}</p>
      </header>

      <section className="space-y-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Run of show
            </CardTitle>
            <CardDescription>Load-in, doors, curfew</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Load-in</p>
                <p className="font-mono font-medium">{formatTime(show.load_in)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Soundcheck</p>
                <p className="font-mono font-medium">{formatTime(show.soundcheck)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Doors</p>
                <p className="font-mono font-medium">{formatTime(show.doors)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Curfew</p>
                <p className="font-mono font-medium">{formatTime(show.curfew)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Load-out</p>
                <p className="font-mono font-medium">{formatTime(show.load_out)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {bands.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Music className="w-4 h-4 text-primary" />
                Bands
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {bands.map((b: { id?: string; name?: string; setStart?: string; setEnd?: string }, i: number) => (
                  <li key={(b as { id?: string }).id ?? i} className="flex justify-between text-sm">
                    <span className="font-medium">{b.name ?? "—"}</span>
                    {(b.setStart || b.setEnd) && (
                      <span className="font-mono text-muted-foreground">
                        {formatTime(b.setStart ?? null)} – {formatTime(b.setEnd ?? null)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {show.special_requests && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base">Special requests</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{show.special_requests}</p>
            </CardContent>
          </Card>
        )}

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Venue
            </CardTitle>
            <CardDescription>Address & contact</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">{venue.name}</p>
            <p className="text-muted-foreground">{formatAddress(venue)}</p>
            {venue.timezone && (
              <p className="font-mono text-muted-foreground text-xs">Timezone: {venue.timezone}</p>
            )}
            {venue.contact_info && typeof venue.contact_info === "object" && Object.keys(venue.contact_info).length > 0 && (
              <div className="pt-2 border-t border-border">
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Contact</p>
                <pre className="text-xs text-foreground whitespace-pre-wrap font-sans">
                  {JSON.stringify(venue.contact_info, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <footer className="mt-8 pt-4 border-t border-border text-center text-xs text-muted-foreground">
        SoundPath Venue · Advance sheet
      </footer>
    </div>
  )
}
