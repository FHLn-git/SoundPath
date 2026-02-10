"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { updateOffer, acceptOffer, deleteOffer } from "@/lib/offer-api"
import { upsertShow } from "@/lib/show-api"
import type { OfferRow } from "@/lib/venue-types"
import type { Event } from "@/components/event-context"
import { FileSignature, Send, Pencil, Trash2, Check, X, Calendar, FileText, GitBranch } from "lucide-react"
import { format } from "date-fns"

interface OfferDetailProps {
  offer: OfferRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  venueId: string | null
  stageName: string | null
  onUpdated: () => void
  onDeleted: () => void
  onEdit?: (offer: OfferRow) => void
}

const STATUS_LABELS: Record<OfferRow["status"], string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
}

export function OfferDetail({
  offer,
  open,
  onOpenChange,
  venueId,
  stageName,
  onUpdated,
  onDeleted,
  onEdit,
}: OfferDetailProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!offer) return null

  const handleSend = async () => {
    setError(null)
    setBusy(true)
    try {
      await updateOffer(offer.id, {
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send offer")
    } finally {
      setBusy(false)
    }
  }

  const handleDecline = async () => {
    if (!confirm("Mark this offer as declined?")) return
    setError(null)
    setBusy(true)
    try {
      await updateOffer(offer.id, { status: "declined" })
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update")
    } finally {
      setBusy(false)
    }
  }

  const handleAccept = async () => {
    if (!venueId) {
      setError("Venue is required to create a show.")
      return
    }
    setError(null)
    setBusy(true)
    try {
      const eventFromOffer: Event = {
        id: `event-${Date.now()}`,
        name: offer.artist_name,
        date: offer.proposed_date,
        loadIn: "14:00",
        soundcheck: "16:00",
        doors: "19:00",
        curfew: "23:00",
        loadOut: "00:00",
        status: "confirmed",
        selectedItems: [],
        greenRoomItems: [],
        bands: [
          {
            id: "band-1",
            name: offer.artist_name,
            setStart: "19:00",
            setEnd: "19:45",
            isHeadliner: true,
          },
        ],
        wizardCompleted: true,
        stageId: offer.stage_id ?? undefined,
        linkedStageIds: offer.stage_id ? [offer.stage_id] : [],
      }
      const persisted = await upsertShow(venueId, eventFromOffer)
      if (!persisted?.id) {
        setError("Failed to create show.")
        setBusy(false)
        return
      }
      await acceptOffer(offer.id, persisted.id)
      const eventWithOffer: Event = {
        ...eventFromOffer,
        id: persisted.id,
        offerId: offer.id,
      }
      await upsertShow(venueId, eventWithOffer)
      onUpdated()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept offer and create show")
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete offer for ${offer.artist_name}?`)) return
    setError(null)
    setBusy(true)
    try {
      await deleteOffer(offer.id)
      onDeleted()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete")
    } finally {
      setBusy(false)
    }
  }

  const canSend = offer.status === "draft"
  const canAccept = offer.status === "sent"
  const canDecline = offer.status === "sent"
  const canEdit = offer.status === "draft" || offer.status === "sent"
  const canDelete = offer.status === "draft"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-primary" />
            {offer.artist_name}
          </DialogTitle>
          <DialogDescription>
            Proposed {format(new Date(offer.proposed_date), "MMM d, yyyy")}
            {stageName ? ` · ${stageName}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge
              variant="outline"
              className={
                offer.status === "accepted"
                  ? "border-emerald-500/50 text-emerald-400"
                  : offer.status === "sent"
                    ? "border-primary/50 text-primary"
                    : "border-border text-muted-foreground"
              }
            >
              {STATUS_LABELS[offer.status]}
            </Badge>
          </div>
          {offer.sent_at && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sent</span>
              <span className="font-mono">{format(new Date(offer.sent_at), "MMM d, yyyy")}</span>
            </div>
          )}
          {offer.deal_structure && (
            <>
              <Separator className="my-2" />
              <div>
                <span className="text-muted-foreground block mb-1">Deal structure</span>
                <p className="text-foreground whitespace-pre-wrap">{offer.deal_structure}</p>
              </div>
            </>
          )}
          {Array.isArray(offer.line_items) && offer.line_items.length > 0 && (
            <div>
              <span className="text-muted-foreground block mb-1">Line items</span>
              <pre className="text-xs font-mono bg-muted/30 p-2 rounded overflow-x-auto">
                {JSON.stringify(offer.line_items, null, 2)}
              </pre>
            </div>
          )}
          {offer.show_id && (
            <>
              <Separator className="my-2" />
              <div className="flex items-center gap-2 text-primary">
                <Calendar className="w-4 h-4" />
                <span>Linked show</span>
              </div>
            </>
          )}
          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          {canSend && (
            <Button size="sm" onClick={handleSend} disabled={busy} className="gap-1.5">
              <Send className="w-3.5 h-3.5" />
              Send offer
            </Button>
          )}
          {canAccept && (
            <Button size="sm" onClick={handleAccept} disabled={busy} className="gap-1.5">
              <Check className="w-3.5 h-3.5" />
              Accept & create show
            </Button>
          )}
          {canDecline && (
            <Button size="sm" variant="outline" onClick={handleDecline} disabled={busy} className="gap-1.5">
              <X className="w-3.5 h-3.5" />
              Mark declined
            </Button>
          )}
          {canEdit && onEdit && (
            <Button size="sm" variant="outline" onClick={() => { onEdit(offer); onOpenChange(false) }} className="gap-1.5">
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Button>
          )}
          {canDelete && (
            <Button size="sm" variant="outline" onClick={handleDelete} disabled={busy} className="gap-1.5 text-destructive hover:text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </Button>
          )}
          <Button size="sm" variant="outline" asChild className="gap-1.5">
            <a
              href={`/products/sign?context=venue&offer_id=${offer.id}${offer.show_id ? `&show_id=${offer.show_id}` : ""}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileText className="w-3.5 h-3.5" />
              Generate contract (Sign)
            </a>
          </Button>
          <Button size="sm" variant="outline" asChild className="gap-1.5">
            <a
              href={`/products/splits?context=venue&offer_id=${offer.id}${offer.show_id ? `&show_id=${offer.show_id}` : ""}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <GitBranch className="w-3.5 h-3.5" />
              View splits
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
