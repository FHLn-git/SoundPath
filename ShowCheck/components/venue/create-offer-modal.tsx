"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createOffer, updateOffer } from "@/lib/offer-api"
import { updateInbound } from "@/lib/inbound-api"
import { useOfferTemplates } from "@/lib/use-offer-templates"
import { useStages } from "@/lib/use-venue-hierarchy"
import type { InboundSubmissionRow, OfferTemplateRow, OfferRow } from "@/lib/venue-types"
import { FileSignature } from "lucide-react"

export type CreateOfferMode = "minimal" | "full"

interface CreateOfferModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  venueId: string
  createdBy: string | null
  /** When "minimal", only artist + date (e.g. from Inbound). When "full", show stage, deal, line items, template, Send. */
  mode?: CreateOfferMode
  prefilled?: { artist_name?: string; proposed_date?: string }
  /** Prefill deal_structure and line_items from this template (full mode). */
  template?: OfferTemplateRow | null
  /** When set, we're editing an existing offer. */
  existingOffer?: OfferRow | null
  inboundSubmissionId?: string
  onCreated?: () => void
}

function parseLineItemsJson(value: string): unknown[] {
  try {
    const parsed = JSON.parse(value || "[]")
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function CreateOfferModal({
  open,
  onOpenChange,
  venueId,
  createdBy,
  mode = "minimal",
  prefilled = {},
  template = null,
  existingOffer = null,
  inboundSubmissionId,
  onCreated,
}: CreateOfferModalProps) {
  const { templates } = useOfferTemplates(venueId, null)
  const { stages } = useStages(venueId)
  const [artistName, setArtistName] = useState(prefilled.artist_name ?? "")
  const [proposedDate, setProposedDate] = useState(prefilled.proposed_date ?? "")
  const [stageId, setStageId] = useState<string | null>(null)
  const [dealStructure, setDealStructure] = useState("")
  const [lineItemsJson, setLineItemsJson] = useState("[]")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isFull = mode === "full"
  const isEdit = !!existingOffer

  useEffect(() => {
    if (!open) return
    setArtistName(existingOffer?.artist_name ?? prefilled.artist_name ?? "")
    setProposedDate(existingOffer?.proposed_date ?? prefilled.proposed_date ?? "")
    setStageId(existingOffer?.stage_id ?? null)
    setDealStructure(existingOffer?.deal_structure ?? template?.deal_structure ?? "")
    setLineItemsJson(
      Array.isArray(existingOffer?.line_items)
        ? JSON.stringify(existingOffer.line_items, null, 2)
        : Array.isArray(template?.line_items_template)
          ? JSON.stringify(template.line_items_template, null, 2)
          : "[]"
    )
    setSelectedTemplateId(template?.id ?? null)
  }, [open, existingOffer?.id, template?.id, prefilled.artist_name, prefilled.proposed_date, existingOffer?.artist_name, existingOffer?.proposed_date, existingOffer?.stage_id, existingOffer?.deal_structure, existingOffer?.line_items, template?.deal_structure, template?.line_items_template])

  const applyTemplate = (t: OfferTemplateRow) => {
    setDealStructure(t.deal_structure ?? "")
    setLineItemsJson(
      Array.isArray(t.line_items_template)
        ? JSON.stringify(t.line_items_template, null, 2)
        : "[]"
    )
    setSelectedTemplateId(t.id)
  }

  const saveOffer = async (sendNow: boolean): Promise<string | null> => {
    if (!artistName.trim() || !proposedDate) {
      setError("Artist name and proposed date are required.")
      return null
    }
    const lineItems = parseLineItemsJson(lineItemsJson)
    setError(null)
    setSaving(true)
    try {
      if (isEdit && existingOffer) {
        await updateOffer(existingOffer.id, {
          artist_name: artistName.trim(),
          proposed_date: proposedDate,
          stage_id: stageId,
          deal_structure: dealStructure.trim() || null,
          line_items: lineItems,
          ...(sendNow
            ? { status: "sent" as const, sent_at: new Date().toISOString() }
            : {}),
        })
        onCreated?.()
        onOpenChange(false)
        return existingOffer.id
      }
      const row = await createOffer({
        venue_id: venueId,
        stage_id: stageId,
        created_by: createdBy,
        artist_name: artistName.trim(),
        proposed_date: proposedDate,
        deal_structure: dealStructure.trim() || null,
        line_items: lineItems,
        status: sendNow ? "sent" : "draft",
        show_id: null,
        sent_at: sendNow ? new Date().toISOString() : null,
        expires_at: null,
      })
      if (inboundSubmissionId && row) {
        await updateInbound(inboundSubmissionId, { status: "reviewed" })
      }
      onCreated?.()
      onOpenChange(false)
      setArtistName("")
      setProposedDate("")
      setStageId(null)
      setDealStructure("")
      setLineItemsJson("[]")
      setSelectedTemplateId(null)
      return row?.id ?? null
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save offer")
      return null
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await saveOffer(false)
  }

  const handleSend = async () => {
    await saveOffer(true)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-primary" />
            {isEdit ? "Edit offer" : "Create offer"}
          </DialogTitle>
          <DialogDescription>
            {isFull
              ? "Artist, date, stage, and deal terms. Save as draft or send."
              : "Create a booking offer from this inbound request. You can send and track it in the Offers flow."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="offer-artist">Artist name</Label>
            <Input
              id="offer-artist"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              placeholder="Artist or act name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="offer-date">Proposed date</Label>
            <Input
              id="offer-date"
              type="date"
              value={proposedDate}
              onChange={(e) => setProposedDate(e.target.value)}
              className="font-mono"
            />
          </div>
          {isFull && (
            <>
              {stages.length > 0 && (
                <div className="space-y-2">
                  <Label>Stage (optional)</Label>
                  <Select
                    value={stageId ?? "none"}
                    onValueChange={(v) => setStageId(v === "none" ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {stages.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {templates.length > 0 && (
                <div className="space-y-2">
                  <Label>Use template (optional)</Label>
                  <Select
                    value={selectedTemplateId ?? "none"}
                    onValueChange={(v) => {
                      const t = templates.find((x) => x.id === v)
                      if (t) applyTemplate(t)
                      else setSelectedTemplateId(null)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="offer-deal">Deal structure (optional)</Label>
                <Textarea
                  id="offer-deal"
                  value={dealStructure}
                  onChange={(e) => setDealStructure(e.target.value)}
                  placeholder="e.g. $X guarantee vs 85% door"
                  rows={2}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offer-line-items">Line items (JSON array, optional)</Label>
                <Textarea
                  id="offer-line-items"
                  value={lineItemsJson}
                  onChange={(e) => setLineItemsJson(e.target.value)}
                  placeholder='[{"description":"Guarantee","amount":500}]'
                  rows={3}
                  className="font-mono text-sm resize-none"
                />
              </div>
            </>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {isFull && !isEdit && (
              <Button
                type="button"
                onClick={handleSend}
                disabled={saving}
              >
                {saving ? "Sending…" : "Send offer"}
              </Button>
            )}
            {isFull && isEdit && (existingOffer?.status === "draft" || existingOffer?.status === "sent") && (
              <Button
                type="button"
                onClick={handleSend}
                disabled={saving || existingOffer?.status === "sent"}
              >
                {saving ? "Sending…" : "Send offer"}
              </Button>
            )}
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save" : "Save as draft"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
