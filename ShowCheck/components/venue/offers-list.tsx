"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useOffers } from "@/lib/use-offers"
import { getOffer } from "@/lib/offer-api"
import { useStages } from "@/lib/use-venue-hierarchy"
import type { OfferRow, OfferStatus } from "@/lib/venue-types"
import { FileSignature, Plus, Calendar } from "lucide-react"
import { format } from "date-fns"
import { OfferDetail } from "./offer-detail"

const STATUS_LABELS: Record<OfferStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
}

type StatusFilter = "all" | OfferStatus

interface OffersListProps {
  venueId: string | null
  /** When set, open create-offer modal with this template (and clear after open). */
  selectedTemplateForOffer?: import("@/lib/venue-types").OfferTemplateRow | null
  onClearTemplate?: () => void
  onNewOffer: () => void
  onEditOffer?: (offer: OfferRow) => void
  /** When set (e.g. from event detail "Linked offer"), open offer detail for this id and then clear. */
  offerIdToOpen?: string | null
  onClearedOfferIdToOpen?: () => void
  onRefetchEvents?: () => void
}

export function OffersList({
  venueId,
  selectedTemplateForOffer,
  onClearTemplate,
  onNewOffer,
  onEditOffer,
  offerIdToOpen,
  onClearedOfferIdToOpen,
  onRefetchEvents,
}: OffersListProps) {
  const PAGE_SIZE = 20
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [selectedOffer, setSelectedOffer] = useState<OfferRow | null>(null)
  const { offers, loading, error, refetch } = useOffers(venueId, {
    status: statusFilter === "all" ? undefined : statusFilter,
  })
  const { stages } = useStages(venueId)
  const stageNameMap = useMemo(() => {
    const m: Record<string, string> = {}
    stages.forEach((s) => {
      m[s.id] = s.name
    })
    return m
  }, [stages])

  useEffect(() => {
    if (!offerIdToOpen || !onClearedOfferIdToOpen) return
    let cancelled = false
    getOffer(offerIdToOpen).then((offer) => {
      if (!cancelled && offer) {
        setSelectedOffer(offer)
      }
      onClearedOfferIdToOpen()
    })
    return () => {
      cancelled = true
    }
  }, [offerIdToOpen, onClearedOfferIdToOpen])

  useEffect(() => setVisibleCount(PAGE_SIZE), [statusFilter])

  const filtered = statusFilter === "all" ? offers : offers
  const visible = filtered.slice(0, visibleCount)
  const hasMore = filtered.length > visibleCount
  const showLoadMore = hasMore && filtered.length > PAGE_SIZE

  if (loading && offers.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-12 text-center text-muted-foreground text-sm">
          Loading offers…
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-12 text-center text-destructive text-sm">
          {error.message}
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2">
          <div className="flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-sm font-medium text-foreground">Offers & deals</h3>
          </div>
          <Button size="sm" onClick={onNewOffer} className="gap-1.5">
            <Plus className="w-4 h-4" />
            New offer
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            className="w-full"
          >
            <div className="px-4 pb-2">
              <TabsList className="bg-secondary/50 p-1 h-auto flex-wrap">
                <TabsTrigger value="all" className="text-xs data-[state=active]:bg-card">
                  All
                </TabsTrigger>
                <TabsTrigger value="draft" className="text-xs data-[state=active]:bg-card">
                  Draft
                </TabsTrigger>
                <TabsTrigger value="sent" className="text-xs data-[state=active]:bg-card">
                  Sent
                </TabsTrigger>
                <TabsTrigger value="accepted" className="text-xs data-[state=active]:bg-card">
                  Accepted
                </TabsTrigger>
                <TabsTrigger value="declined" className="text-xs data-[state=active]:bg-card">
                  Declined
                </TabsTrigger>
                <TabsTrigger value="expired" className="text-xs data-[state=active]:bg-card">
                  Expired
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Artist</TableHead>
                    <TableHead className="font-mono text-muted-foreground">Proposed date</TableHead>
                    <TableHead className="text-muted-foreground">Stage</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Sent</TableHead>
                    <TableHead className="text-muted-foreground">Linked show</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((offer) => (
                    <TableRow
                      key={offer.id}
                      className="border-border cursor-pointer hover:bg-muted/30"
                      onClick={() => setSelectedOffer(offer)}
                    >
                      <TableCell className="font-medium text-foreground">
                        {offer.artist_name}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-foreground">
                        {format(new Date(offer.proposed_date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {offer.stage_id ? stageNameMap[offer.stage_id] ?? "—" : "—"}
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {offer.sent_at
                          ? format(new Date(offer.sent_at), "MMM d")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {offer.show_id ? (
                          <span className="inline-flex items-center gap-1 text-primary">
                            <FileSignature className="w-3.5 h-3.5" />
                            Linked
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="w-10 h-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {statusFilter === "all" ? "No offers yet" : `No ${statusFilter} offers`}
                </p>
              </div>
            )}
            {showLoadMore && (
              <div className="px-4 py-3 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                >
                  Load more ({filtered.length - visibleCount} remaining)
                </Button>
              </div>
            )}
          </Tabs>
        </CardContent>
      </Card>

      <OfferDetail
        offer={selectedOffer}
        open={!!selectedOffer}
        onOpenChange={(open) => !open && setSelectedOffer(null)}
        venueId={venueId}
        stageName={selectedOffer?.stage_id ? stageNameMap[selectedOffer.stage_id] ?? null : null}
        onUpdated={() => {
          refetch()
          onRefetchEvents?.()
        }}
        onDeleted={() => {
          setSelectedOffer(null)
          refetch()
          onRefetchEvents?.()
        }}
        onEdit={onEditOffer}
      />
    </>
  )
}
