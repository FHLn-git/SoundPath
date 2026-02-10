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
import { Checkbox } from "@/components/ui/checkbox"
import { useEvent } from "@/components/event-context"
import { useStages } from "@/lib/use-venue-hierarchy"
import { Anchor } from "lucide-react"

interface AddHoldModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate?: string
  defaultStageId?: string | null
  defaultArtistName?: string
}

export function AddHoldModal({
  open,
  onOpenChange,
  defaultDate = "",
  defaultStageId = null,
  defaultArtistName = "",
}: AddHoldModalProps) {
  const { saveEvent, venueId } = useEvent()
  const { stages } = useStages(venueId)
  const [artistName, setArtistName] = useState(defaultArtistName)
  const [date, setDate] = useState(defaultDate)
  const [stageId, setStageId] = useState<string | null>(defaultStageId)
  const [holdRank, setHoldRank] = useState<number | "">("")
  const [holdAutoPromote, setHoldAutoPromote] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setArtistName(defaultArtistName)
      setDate(defaultDate)
      setStageId(defaultStageId)
    }
  }, [open, defaultArtistName, defaultDate, defaultStageId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!artistName.trim() || !date) {
      setError("Artist name and date are required.")
      return
    }
    setSaving(true)
    try {
      const newEvent = {
        id: `hold-${Date.now()}`,
        name: artistName.trim(),
        date,
        loadIn: "14:00",
        soundcheck: "16:00",
        doors: "19:00",
        curfew: "23:00",
        loadOut: "00:00",
        status: "hold" as const,
        selectedItems: [],
        greenRoomItems: [],
        bands: [{ id: `b-${Date.now()}`, name: artistName.trim(), setStart: "20:00", setEnd: "22:00", isHeadliner: true }],
        wizardCompleted: false,
        specialRequests: "",
        holdRank: holdRank === "" ? undefined : holdRank,
        holdAutoPromote,
        linkedStageIds: stageId ? [stageId] : [],
        stageId: stageId ?? undefined,
      }
      const persisted = venueId && saveEvent ? await saveEvent(newEvent) : null
      if (persisted) {
        setArtistName("")
        setDate("")
        setStageId(defaultStageId)
        setHoldRank("")
        setHoldAutoPromote(false)
        onOpenChange(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add hold")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Anchor className="w-5 h-5 text-amber-400" />
            Add hold
          </DialogTitle>
          <DialogDescription>
            Create a date hold for an artist. Convert to confirmed when the deal is set.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="hold-artist">Artist name</Label>
            <Input
              id="hold-artist"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              placeholder="Artist or act name"
              className="bg-background border-border"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="hold-date">Date</Label>
            <Input
              id="hold-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-background border-border font-mono"
            />
          </div>
          {stages.length > 0 && (
            <div className="grid gap-2">
              <Label>Stage (optional)</Label>
              <select
                value={stageId ?? ""}
                onChange={(e) => setStageId(e.target.value || null)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">—</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="hold-rank">Hold rank (optional)</Label>
            <Input
              id="hold-rank"
              type="number"
              min={1}
              value={holdRank}
              onChange={(e) => setHoldRank(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
              placeholder="1 = highest priority"
              className="bg-background border-border font-mono"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hold-auto-promote"
              checked={holdAutoPromote}
              onCheckedChange={(c) => setHoldAutoPromote(!!c)}
            />
            <Label htmlFor="hold-auto-promote" className="text-sm font-normal cursor-pointer">
              Auto-promote next hold when this one is removed
            </Label>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Adding…" : "Add hold"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
