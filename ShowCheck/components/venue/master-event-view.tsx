"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useEvent, type Event } from "@/components/event-context"
import {
  Calendar,
  Clock,
  DollarSign,
  Music,
  Star,
  Truck,
  Coffee,
  Package,
  Edit3,
  ArrowLeft,
  AlertCircle,
  FileSignature,
  Link2,
  GitBranch,
  FileText,
  UserPlus,
  ChevronDown,
  Copy,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { ShowSettlementCard } from "@/components/venue/show-settlement-card"
import { ShowPnLCard } from "@/components/venue/show-pnl-card"
import { VenueAssetsCard } from "@/components/venue/venue-assets-card"
import { useVenue } from "@/lib/use-venue"
import { createShowInvitation } from "@/lib/show-api"
import { sendShowInvitationEmail } from "@/lib/send-email"

interface MasterEventViewProps {
  event: Event
  onBack: () => void
  onEdit: () => void
  /** When provided and event has offerId, "Linked offer" is shown and this is called when user clicks to view the offer */
  onViewLinkedOffer?: (offerId: string) => void
}

export function MasterEventView({ event, onBack, onEdit, onViewLinkedOffer }: MasterEventViewProps) {
  const { menuItems, getHouseMinimumTotal, saveEvent } = useEvent()
  const { activeVenue } = useVenue()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [inviteEmailSent, setInviteEmailSent] = useState(false)

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":")
    const hour = parseInt(hours, 10)
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const calculateEventBudget = () => {
    let total = getHouseMinimumTotal()
    event.selectedItems.forEach((itemId) => {
      const item = menuItems.find((m) => m.id === itemId && !m.isHouseMinimum)
      if (item) {
        total += item.basePrice
        if (item.mandatoryLabor) {
          total += item.mandatoryLabor.cost
        }
      }
    })
    event.greenRoomItems.forEach((greenItem) => {
      const item = menuItems.find((m) => m.id === greenItem.id)
      if (item) {
        total += item.basePrice * greenItem.quantity
      }
    })
    return total
  }

  const houseMinTotal = getHouseMinimumTotal()
  const totalBudget = calculateEventBudget()

  const selectedMenuItems = event.selectedItems
    .map((id) => menuItems.find((m) => m.id === id && !m.isHouseMinimum))
    .filter((item): item is NonNullable<typeof item> => item !== undefined)

  const greenRoomItems = event.greenRoomItems
    .map((g) => {
      const item = menuItems.find((m) => m.id === g.id)
      return item ? { ...item, quantity: g.quantity } : null
    })
    .filter((item): item is NonNullable<typeof item> => item !== undefined)

  const getStatusBadge = () => {
    switch (event.status) {
      case "confirmed":
        return <Badge className="bg-primary text-primary-foreground">Confirmed</Badge>
      case "pending-approval":
        return <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/30">Pending Approval</Badge>
      default:
        return <Badge variant="secondary">Draft</Badge>
    }
  }

  const basePortalUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname.startsWith("/app/") ? "/app" : ""}/portal/promoter/accept`
      : ""

  const handleInvitePromoter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviteSending(true)
    setInviteError(null)
    setInviteLink(null)
    setInviteEmailSent(false)
    try {
      const result = await createShowInvitation(event.id, inviteEmail.trim())
      if ("error" in result) throw new Error(result.error)
      const url = `${basePortalUrl}?token=${result.token}`
      setInviteLink(url)
      const emailResult = await sendShowInvitationEmail({
        to: inviteEmail.trim(),
        inviteUrl: url,
        showName: event.name,
        venueName: activeVenue?.name ?? "Venue",
        date: new Date(event.date).toLocaleDateString("en-US"),
      })
      setInviteEmailSent(emailResult.success)
      if (!emailResult.success) setInviteError((prev) => (prev ? prev : `Invite created. Email failed: ${emailResult.error}`))
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to create invitation")
    } finally {
      setInviteSending(false)
    }
  }

  const copyInviteLink = () => {
    if (inviteLink && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(inviteLink).then(() => alert("Invite link copied to clipboard."))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Back, Event Details dropdown, and Edit */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">{event.name}</h2>
            <p className="text-muted-foreground">
              {new Date(event.date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {getStatusBadge()}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                Event Details
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[12rem]">
              {event.offerId && onViewLinkedOffer && (
                <DropdownMenuItem onClick={() => onViewLinkedOffer(event.offerId!)}>
                  <FileSignature className="w-4 h-4" />
                  Linked offer
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <a
                  href={`/products/sign?context=venue&show_id=${event.id}${event.offerId ? `&offer_id=${event.offerId}` : ""}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileText className="w-4 h-4" />
                  Generate contract (Sign)
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href={`/products/splits?context=venue&show_id=${event.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <GitBranch className="w-4 h-4" />
                  View splits
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const url = typeof window !== "undefined" ? `${window.location.origin}/advance/${event.id}` : ""
                  if (url && navigator?.clipboard?.writeText) {
                    navigator.clipboard.writeText(url).then(() => alert("Advance link copied to clipboard."))
                  }
                }}
              >
                <Link2 className="w-4 h-4" />
                Share advance
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setInviteOpen(true)}>
                <UserPlus className="w-4 h-4" />
                Invite promoter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={onEdit} className="gap-2">
            <Edit3 className="w-4 h-4" />
            Edit Event
          </Button>
        </div>
      </div>

      {/* Invite promoter dialog */}
      <Dialog open={inviteOpen}       onOpenChange={(open) => {
        setInviteOpen(open)
        if (!open) {
          setInviteEmail("")
          setInviteError(null)
          setInviteLink(null)
          setInviteEmailSent(false)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite promoter</DialogTitle>
            <DialogDescription>
              Create an invitation link for this show. Send the link to the promoter so they can set a password and
              access the advance.
            </DialogDescription>
          </DialogHeader>
          {!inviteLink ? (
            <form onSubmit={handleInvitePromoter} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Promoter email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="promoter@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={inviteSending}
                />
              </div>
              {inviteError && (
                <p className="text-sm text-destructive">{inviteError}</p>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={inviteSending || !inviteEmail.trim()}>
                  {inviteSending ? "Creating…" : "Create invitation"}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-4">
              {inviteEmailSent ? (
                <p className="text-sm text-primary font-medium">Invitation email sent to {inviteEmail}.</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Share this link with the promoter. They can set a password and access the advance.
                </p>
              )}
              <div className="flex gap-2">
                <Input readOnly value={inviteLink} className="font-mono text-xs" />
                <Button type="button" variant="outline" size="icon" onClick={copyInviteLink} title="Copy link">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={() => setInviteOpen(false)}>Done</Button>
                <Button variant="outline" onClick={() => { setInviteLink(null); setInviteEmail("") }}>
                  Invite another
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Overview Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">${totalBudget.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Budget</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                <Music className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{event.bands.length}</p>
                <p className="text-sm text-muted-foreground">Bands</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {selectedMenuItems.length + greenRoomItems.length}
                </p>
                <p className="text-sm text-muted-foreground">Selected Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Run of Show */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Run of Show</CardTitle>
              <CardDescription>Event timeline and schedule</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-sm text-muted-foreground mb-1">Load-In</p>
              <p className="text-lg font-semibold text-foreground">{formatTime(event.loadIn)}</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
              <p className="text-sm text-muted-foreground mb-1">Soundcheck</p>
              <p className="text-lg font-semibold text-foreground">{formatTime(event.soundcheck)}</p>
            </div>
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm text-muted-foreground mb-1">Doors</p>
              <p className="text-lg font-semibold text-foreground">{formatTime(event.doors)}</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
              <p className="text-sm text-muted-foreground mb-1">Curfew</p>
              <p className="text-lg font-semibold text-foreground">{formatTime(event.curfew)}</p>
            </div>
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-sm text-muted-foreground mb-1">Load-Out</p>
              <p className="text-lg font-semibold text-foreground">{formatTime(event.loadOut)}</p>
            </div>
          </div>

          {event.bands.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium text-foreground mb-3">Band Lineup</h4>
                <div className="space-y-2">
                  {event.bands.map((band) => (
                    <div
                      key={band.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        band.isHeadliner
                          ? "bg-primary/10 border-primary/30"
                          : "bg-secondary/30 border-border/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {band.isHeadliner ? (
                          <Star className="w-5 h-5 text-primary" />
                        ) : (
                          <Music className="w-5 h-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className={`font-medium ${band.isHeadliner ? "text-foreground" : "text-muted-foreground"}`}>
                            {band.name}
                          </p>
                          {band.isHeadliner && (
                            <p className="text-xs text-primary">Headliner</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
                          {formatTime(band.setStart)} - {formatTime(band.setEnd)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Budget Breakdown */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Budget Breakdown</CardTitle>
              <CardDescription>Detailed cost analysis</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* House Minimums */}
          <div>
            <h4 className="font-medium text-foreground mb-2">House Minimums</h4>
            <div className="space-y-2">
              {menuItems
                .filter((item) => item.isHouseMinimum)
                .map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-secondary/30 rounded">
                    <span className="text-sm text-foreground">{item.name}</span>
                    <span className="text-sm font-medium text-foreground">${item.basePrice.toLocaleString()}</span>
                  </div>
                ))}
              <div className="flex items-center justify-between p-2 bg-primary/10 rounded border border-primary/20 mt-2">
                <span className="text-sm font-medium text-foreground">House Minimum Total</span>
                <span className="text-sm font-bold text-foreground">${houseMinTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Selected Items */}
          {selectedMenuItems.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium text-foreground mb-2">Additional Items</h4>
                <div className="space-y-2">
                  {selectedMenuItems.map((item) => {
                    const itemTotal = item.basePrice + (item.mandatoryLabor?.cost || 0)
                    return (
                      <div key={item.id} className="p-3 bg-secondary/30 rounded border border-border/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground">{item.name}</span>
                          <span className="text-sm font-medium text-foreground">${itemTotal.toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>Base: ${item.basePrice.toLocaleString()}</div>
                          {item.mandatoryLabor && (
                            <div>Labor: ${item.mandatoryLabor.cost.toLocaleString()}</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* Green Room Items */}
          {greenRoomItems.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium text-foreground mb-2">Green Room Items</h4>
                <div className="space-y-2">
                  {greenRoomItems.map((item) => {
                    const itemTotal = item.basePrice * item.quantity
                    return (
                      <div key={item.id} className="flex items-center justify-between p-2 bg-secondary/30 rounded">
                        <span className="text-sm text-foreground">
                          {item.name} × {item.quantity}
                        </span>
                        <span className="text-sm font-medium text-foreground">${itemTotal.toLocaleString()}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* Total */}
          <Separator />
          <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border border-primary/20">
            <span className="text-lg font-bold text-foreground">Total Budget</span>
            <span className="text-2xl font-bold text-foreground">${totalBudget.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Settlement & P&L (Phase 5) */}
      <div className="grid gap-6 md:grid-cols-2">
        {saveEvent && (
          <ShowSettlementCard
            event={event}
            onSave={async (updates) => saveEvent({ ...event, ...updates })}
          />
        )}
        <ShowPnLCard event={event} />
      </div>

      {/* Assets (Phase 6) – riders, contracts, posters for this show */}
      {activeVenueId && (
        <VenueAssetsCard venueId={activeVenueId} showId={event.id} />
      )}

      {/* Special Requests */}
      {event.specialRequests && (
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-warning/10">
                <AlertCircle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <CardTitle>Special Requests</CardTitle>
                <CardDescription>Additional notes and requirements</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground whitespace-pre-wrap">{event.specialRequests}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
