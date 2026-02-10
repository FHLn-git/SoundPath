"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Building2, Box, ChevronDown } from "lucide-react"
import { useVenue } from "@/lib/use-venue"
import { useVenueGroups, useStages, useActiveStageId } from "@/lib/use-venue-hierarchy"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

/** DAW #0B0E14 aesthetic: [Venue Group] > [Venue Name] > [Select Stage Dropdown] */
export function VenueBreadcrumb() {
  const pathname = usePathname()
  const { venues, activeVenueId, setActiveVenueId } = useVenue()
  const { groups } = useVenueGroups()
  const { stages } = useStages(activeVenueId)
  const { activeStageId, setActiveStageId } = useActiveStageId(activeVenueId)

  const venueId = pathname?.match(/^\/venue\/([^/]+)/)?.[1] ?? null
  const stageId = pathname?.match(/^\/venue\/[^/]+\/([^/]+)$/)?.[1] ?? null
  const isHQ = pathname === "/venue/hq" || pathname === "/venue"
  const isVenuePage = venueId && !stageId && pathname === `/venue/${venueId}`
  const isStagePage = venueId && stageId

  const venue = venues.find((v) => v.id === (venueId ?? activeVenueId))
  const group = venue?.group_id ? groups.find((g) => g.id === venue.group_id) : null
  const stage = stages.find((s) => s.id === (stageId ?? activeStageId))

  if (!pathname?.startsWith("/venue")) return null

  return (
    <nav
      className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground flex-wrap"
      aria-label="Venue breadcrumb"
    >
      <Link
        href="/venue/hq"
        className="hover:text-foreground transition-colors flex items-center gap-1"
      >
        <span className={isHQ ? "text-foreground font-medium" : ""}>HQ</span>
      </Link>

      {venue && (
        <>
          <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-70" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto py-1 px-2 font-mono text-muted-foreground hover:text-foreground gap-1"
              >
                {group ? group.group_name : "Venues"}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="font-mono bg-[#0B0E14] border-border">
              {groups.map((g) => (
                <DropdownMenuItem key={g.id} asChild>
                  <Link href="/venue/hq" className="font-mono">
                    {g.group_name}
                  </Link>
                </DropdownMenuItem>
              ))}
              {venues.filter((v) => !v.group_id).length > 0 && (
                <>
                  {venues
                    .filter((v) => !v.group_id)
                    .map((v) => (
                      <DropdownMenuItem
                        key={v.id}
                        onClick={() => setActiveVenueId(v.id)}
                        asChild
                      >
                        <Link href={`/venue/${v.id}`} className="font-mono flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5" />
                          {v.name}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-70" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto py-1 px-2 font-mono text-muted-foreground hover:text-foreground gap-1"
              >
                <Building2 className="w-3.5 h-3.5" />
                {venue.name}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="font-mono bg-[#0B0E14] border-border">
              {venues.map((v) => (
                <DropdownMenuItem
                  key={v.id}
                  onClick={() => setActiveVenueId(v.id)}
                  className={v.id === venue.id ? "bg-accent/50" : ""}
                  asChild
                >
                  <Link href={`/venue/${v.id}`} className="font-mono flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5" />
                    {v.name}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}

      {isStagePage && stages.length > 0 && (
        <>
          <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-70" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto py-1 px-2 font-mono text-muted-foreground hover:text-foreground gap-1"
              >
                <Box className="w-3.5 h-3.5" />
                {stage?.name ?? "Select stage"}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="font-mono bg-[#0B0E14] border-border">
              {stages.map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  onClick={() => setActiveStageId(s.id)}
                  className={s.id === (stageId ?? activeStageId) ? "bg-accent/50" : ""}
                  asChild
                >
                  <Link href={`/venue/${venueId}/${s.id}`} className="font-mono flex items-center gap-2">
                    <Box className="w-3.5 h-3.5" />
                    {s.name}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </nav>
  )
}
