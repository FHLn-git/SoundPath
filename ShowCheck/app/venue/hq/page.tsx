"use client"

import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { useState, useEffect, useMemo } from "react"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
  isSameDay,
} from "date-fns"
import { Building2, MapPin, Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { useVenue } from "@/lib/use-venue"
import { useVenueGroups } from "@/lib/use-venue-hierarchy"
import { listShowsForVenueIds } from "@/lib/show-api"
import { showRowToEvent } from "@/lib/show-mapping"
import type { ShowRow } from "@/lib/venue-types"
import type { Venue, VenueGroup } from "@/lib/venue-types"
import type { Event } from "@/components/event-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getStatusStyle } from "@/components/venue/calendar-view"

const ALL_GROUP_ID = "__all__"
const UNGROUPED_GROUP_ID = "__ungrouped__"

function useGroupShows(venueIds: string[], dateFrom: string, dateTo: string) {
  const [shows, setShows] = useState<ShowRow[]>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (venueIds.length === 0) {
      setShows([])
      return
    }
    setLoading(true)
    listShowsForVenueIds(venueIds, { dateFrom, dateTo })
      .then(setShows)
      .finally(() => setLoading(false))
  }, [venueIds.join(","), dateFrom, dateTo])
  return { shows, loading }
}

function VenueWidget({
  venue,
  stats,
}: {
  venue: Venue
  stats: { upcoming: number; holds: number; confirmed: number }
}) {
  const address =
    venue.address ||
    [venue.address_street_1, venue.address_city, venue.address_state_region]
      .filter(Boolean)
      .join(", ")

  return (
    <Link href={`/?venue=${venue.id}`}>
      <Card
        className="border-border/80 bg-card/80 hover:border-primary/40 hover:bg-card transition-all cursor-pointer font-mono group h-full"
      >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-mono flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            {venue.name}
          </CardTitle>
          <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
            Open dashboard →
          </span>
        </div>
        {address ? (
          <CardDescription className="text-xs font-mono flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {address}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-4 text-sm font-mono">
          <span className="text-muted-foreground">
            <span className="text-foreground font-medium">{stats.upcoming}</span> upcoming
          </span>
          <span className="text-amber-400/90">
            <span className="font-medium">{stats.holds}</span> holds
          </span>
          <span className="text-emerald-400/90">
            <span className="font-medium">{stats.confirmed}</span> confirmed
          </span>
        </div>
      </CardContent>
    </Card>
    </Link>
  )
}

export default function VenueHQPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const groupParam = searchParams.get("group")
  const { venues, loading: venuesLoading } = useVenue()
  const { groups, loading: groupsLoading } = useVenueGroups()

  const venuesByGroup = useMemo(() => {
    const map = new Map<string | null, Venue[]>()
    for (const v of venues) {
      const key = v.group_id ?? null
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(v)
    }
    return map
  }, [venues])

  const ungrouped = venuesByGroup.get(null) ?? []
  const groupedWithVenues = useMemo(
    () =>
      groups.map((g) => ({
        group: g,
        venues: venuesByGroup.get(g.id) ?? [],
      })),
    [groups, venuesByGroup]
  )

  const activeGroupId = groupParam === null || groupParam === "" ? ALL_GROUP_ID : groupParam
  const selectedVenues: Venue[] = useMemo(() => {
    if (activeGroupId === ALL_GROUP_ID) return venues
    if (activeGroupId === UNGROUPED_GROUP_ID) return ungrouped
    const found = groupedWithVenues.find((x) => x.group.id === activeGroupId)
    return found ? found.venues : venues
  }, [activeGroupId, venues, ungrouped, groupedWithVenues])

  const selectedGroup: VenueGroup | null = useMemo(() => {
    if (activeGroupId === ALL_GROUP_ID || activeGroupId === UNGROUPED_GROUP_ID) return null
    return groupedWithVenues.find((x) => x.group.id === activeGroupId)?.group ?? null
  }, [activeGroupId, groupedWithVenues])

  const hqTitle = useMemo(() => {
    if (selectedGroup) return `${selectedGroup.group_name} HQ`
    if (activeGroupId === UNGROUPED_GROUP_ID) return "Ungrouped Venues HQ"
    return "Venue HQ"
  }, [selectedGroup, activeGroupId])

  const today = format(new Date(), "yyyy-MM-dd")
  const calendarStart = format(startOfMonth(new Date()), "yyyy-MM-dd")
  const calendarEnd = format(endOfMonth(addMonths(new Date(), 1)), "yyyy-MM-dd")
  const { shows, loading: showsLoading } = useGroupShows(
    selectedVenues.map((v) => v.id),
    calendarStart,
    calendarEnd
  )

  const eventsAsEvents: (Event & { venue_id: string })[] = useMemo(
    () => shows.map((row) => ({ ...showRowToEvent(row, undefined), venue_id: row.venue_id })),
    [shows]
  )

  const statsByVenueId = useMemo(() => {
    const map: Record<string, { upcoming: number; holds: number; confirmed: number }> = {}
    selectedVenues.forEach((v) => {
      map[v.id] = { upcoming: 0, holds: 0, confirmed: 0 }
    })
    const todayStr = format(new Date(), "yyyy-MM-dd")
    shows.forEach((row) => {
      if (!map[row.venue_id]) return
      if (row.date >= todayStr) map[row.venue_id].upcoming += 1
      if (row.status === "hold" || row.status === "hold_1" || row.status === "hold_2")
        map[row.venue_id].holds += 1
      if (row.status === "confirmed" || row.status === "on_sale" || row.status === "completed")
        map[row.venue_id].confirmed += 1
    })
    return map
  }, [shows, selectedVenues])

  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const monthStart = startOfMonth(calendarMonth)
  const monthEnd = endOfMonth(calendarMonth)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad = monthStart.getDay()
  const paddedDays = [...Array(startPad).fill(null), ...monthDays]
  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>()
    eventsAsEvents.forEach((ev) => {
      if (!map.has(ev.date)) map.set(ev.date, [])
      map.get(ev.date)!.push(ev)
    })
    return map
  }, [eventsAsEvents])

  const monthStats = useMemo(() => {
    const inMonth = eventsAsEvents.filter((e) =>
      isSameMonth(new Date(e.date), calendarMonth)
    )
    const confirmed = inMonth.filter(
      (e) =>
        e.status === "confirmed" || e.status === "on_sale" || e.status === "completed"
    ).length
    const holds = inMonth.filter(
      (e) => e.status === "hold" || e.status === "hold_1" || e.status === "hold_2"
    ).length
    return { total: inMonth.length, confirmed, holds }
  }, [eventsAsEvents, calendarMonth])

  const loading = venuesLoading || groupsLoading

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0E14] p-6">
        <div className="container max-w-5xl mx-auto font-mono text-muted-foreground text-sm">
          Loading HQ...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] text-foreground p-6">
      <div className="container max-w-5xl mx-auto space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight font-mono text-foreground">
              {hqTitle}
            </h1>
            <p className="text-sm text-muted-foreground font-mono mt-1">
              Venue dashboard and group calendar
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-2 font-mono">
            <Link href="/?createVenue=1">
              <Plus className="w-4 h-4" />
              Create Venue
            </Link>
          </Button>
        </div>

        {groups.length > 0 || ungrouped.length > 0 ? (
          <Tabs
            value={activeGroupId}
            onValueChange={(id) => {
              if (id === ALL_GROUP_ID) router.replace("/venue/hq", { scroll: false })
              else router.replace(`/venue/hq?group=${encodeURIComponent(id)}`, { scroll: false })
            }}
            className="w-full"
          >
            <TabsList className="bg-muted/30 border border-border font-mono h-auto flex-wrap p-1">
              <TabsTrigger value={ALL_GROUP_ID} className="data-[state=active]:bg-card">
                All
              </TabsTrigger>
              {ungrouped.length > 0 && (
                <TabsTrigger value={UNGROUPED_GROUP_ID} className="data-[state=active]:bg-card">
                  Ungrouped
                </TabsTrigger>
              )}
              {groupedWithVenues.filter((x) => x.venues.length > 0).map(({ group }) => (
                <TabsTrigger key={group.id} value={group.id} className="data-[state=active]:bg-card">
                  {group.group_name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : null}

        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider font-mono mb-3">
            Venues
          </h2>
          {selectedVenues.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {selectedVenues.map((v) => (
                <VenueWidget
                  key={v.id}
                  venue={v}
                  stats={statsByVenueId[v.id] ?? { upcoming: 0, holds: 0, confirmed: 0 }}
                />
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-border/60 bg-card/40">
              <CardContent className="py-10 text-center">
                <p className="text-sm text-muted-foreground font-mono">
                  No venues in this group. Create one or switch group.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-4 gap-2 font-mono">
                  <Link href="/?createVenue=1">
                    <Plus className="w-4 h-4" />
                    Create New Venue
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </section>

        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider font-mono mb-3 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            Group calendar
          </h2>
          <Card className="border-border bg-card/80">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-mono">
                {format(calendarMonth, "MMMM yyyy")}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCalendarMonth((d) => subMonths(d, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCalendarMonth((d) => addMonths(d, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-7 border-b border-border text-xs text-muted-foreground font-medium font-mono">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="p-2 text-center border-r border-border last:border-r-0">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 auto-rows-fr" style={{ minHeight: "280px" }}>
                {paddedDays.map((day, i) => {
                  if (day === null) {
                    return (
                      <div
                        key={`pad-${i}`}
                        className="min-h-[56px] bg-muted/10 border-b border-r border-border"
                      />
                    )
                  }
                  const dateKey = format(day, "yyyy-MM-dd")
                  const dayEvents = eventsByDate.get(dateKey) ?? []
                  const isCurrentMonth = isSameMonth(day, calendarMonth)
                  return (
                    <div
                      key={dateKey}
                      className={`min-h-[56px] border-b border-r border-border p-1 flex flex-col ${
                        isCurrentMonth ? "bg-background" : "bg-muted/20"
                      } ${!isCurrentMonth ? "opacity-60" : ""}`}
                    >
                      <span
                        className={`text-xs font-mono ${
                          isToday(day)
                            ? "bg-primary text-primary-foreground rounded px-1.5 py-0.5 w-fit"
                            : "text-muted-foreground"
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                      <div className="mt-1 space-y-0.5 flex-1 overflow-hidden">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <Link
                            key={ev.id}
                            href={`/?venue=${ev.venue_id}`}
                            className={`block truncate rounded px-1 py-0.5 border text-[10px] ${getStatusStyle(
                              ev.status
                            )} hover:opacity-90`}
                            title={ev.name ?? ev.bands?.[0]?.name ?? "Event"}
                          >
                            {ev.name || ev.bands?.[0]?.name || "—"}
                          </Link>
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[10px] text-muted-foreground px-1">
                            +{dayEvents.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
            <div className="px-4 py-3 border-t border-border flex flex-wrap items-center gap-4 text-sm font-mono text-muted-foreground">
              {showsLoading ? (
                <span>Loading events…</span>
              ) : (
                <>
                  <span>
                    <span className="text-foreground font-medium">{monthStats.total}</span> shows
                    in {format(calendarMonth, "MMMM")}
                  </span>
                  <span className="text-emerald-400/90">
                    {monthStats.confirmed} confirmed
                  </span>
                  <span className="text-amber-400/90">{monthStats.holds} holds</span>
                </>
              )}
            </div>
          </Card>
        </section>
      </div>
    </div>
  )
}
