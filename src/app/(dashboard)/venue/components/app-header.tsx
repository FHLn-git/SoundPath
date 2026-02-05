"use client"

import { useState, useEffect } from "react"
import { Building2, Users, Music2, Grid3X3, Music, ChevronDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Venue } from "@/lib/venue-types"
import { formatVenueAddressLine } from "@/lib/venue-api"

interface AppHeaderProps {
  currentView: "venue" | "promoter"
  onViewChange: (view: "venue" | "promoter") => void
  /** When provided, show venue switcher and active venue name */
  venues?: Venue[]
  activeVenue?: Venue | null
  onVenueSelect?: (venueId: string) => void
  onOpenCreateVenue?: () => void
}

// Resolve the top-level SoundPath origin as robustly as possible.
// 1) Try window.top.location (same-origin); 2) fall back to document.referrer; 3) finally window.location.origin.
function getTopOrigin(): string {
  if (typeof window === "undefined") return ""
  try {
    if (window.top && window.top.location && window.top.location.origin) {
      return window.top.location.origin
    }
  } catch {
    // Cross-origin: can't read top.location, fall back to referrer
  }
  if (document.referrer) {
    try {
      return new URL(document.referrer).origin
    } catch {
      // ignore
    }
  }
  return window.location.origin
}

function venueInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase().slice(0, 2)
  return name.slice(0, 2).toUpperCase()
}

export function AppHeader({
  currentView,
  onViewChange,
  venues = [],
  activeVenue,
  onVenueSelect,
  onOpenCreateVenue,
}: AppHeaderProps) {
  const [soundPathOrigin, setSoundPathOrigin] = useState<string>("")

  useEffect(() => {
    setSoundPathOrigin(getTopOrigin())
  }, [])

  const isInIframe = typeof window !== "undefined" && window.self !== window.top
  const showVenueSwitcher = venues.length > 0 || onOpenCreateVenue

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            {soundPathOrigin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0 h-10 w-10 rounded-lg border-primary/20 bg-primary/5 hover:bg-primary/10"
                    aria-label="App switcher"
                  >
                    <Grid3X3 className="w-5 h-5 text-primary" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  <DropdownMenuItem asChild>
                    <a
                      href={`${soundPathOrigin}/app/label/launchpad`}
                      {...(isInIframe ? { target: "_parent", rel: "noopener noreferrer" } : {})}
                      className="flex items-center gap-2 cursor-pointer no-underline text-inherit"
                    >
                      <Building2 className="w-4 h-4" />
                      Label
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="bg-accent/50 cursor-default">
                    <Music className="w-4 h-4" />
                    Venue
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="opacity-80">
                    <Music className="w-4 h-4" />
                    Artist
                    <span className="ml-auto text-[10px] text-amber-500 uppercase">Soon</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20">
              <Music2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground tracking-tight">
                SoundPath <span className="text-muted-foreground font-normal">| VENUE</span>
              </h1>
              <p className="text-xs text-muted-foreground">Event Management</p>
            </div>
            {showVenueSwitcher && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 min-w-[140px] justify-between">
                    <span className="truncate">
                      {activeVenue?.name ?? (venues.length === 0 ? "No venue" : "Select venue")}
                    </span>
                    <ChevronDown className="w-4 h-4 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {venues.map((v) => (
                    <DropdownMenuItem
                      key={v.id}
                      onClick={() => onVenueSelect?.(v.id)}
                      className={activeVenue?.id === v.id ? "bg-accent/50" : ""}
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      {v.name}
                    </DropdownMenuItem>
                  ))}
                  {onOpenCreateVenue && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onOpenCreateVenue}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Venue
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <nav className="flex items-center gap-1 p-1 bg-secondary/50 rounded-lg">
            <Button
              variant={currentView === "venue" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewChange("venue")}
              className="gap-2"
            >
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Venue Admin</span>
            </Button>
            <Button
              variant={currentView === "promoter" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewChange("promoter")}
              className="gap-2"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Promoter Portal</span>
            </Button>
          </nav>

          <div className="flex items-center gap-2">
            {activeVenue ? (
              <>
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-medium text-foreground">{activeVenue.name}</span>
                  {(activeVenue.address || formatVenueAddressLine(activeVenue)) && (
                    <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                      {activeVenue.address || formatVenueAddressLine(activeVenue)}
                    </span>
                  )}
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <span className="text-xs font-medium text-primary">
                    {venueInitials(activeVenue.name)}
                  </span>
                </div>
              </>
            ) : (
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <Building2 className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
