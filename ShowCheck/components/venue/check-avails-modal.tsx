"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { listShows } from "@/lib/show-api"
import {
  getBusyDates,
  getAvailableDates,
  formatAvailsForClipboard,
  type AvailsOptions,
} from "@/lib/avails"
import type { ShowRow } from "@/lib/venue-types"
import type { Stage } from "@/lib/venue-types"
import { Calendar, Copy, Loader2 } from "lucide-react"
import { format, subMonths, addMonths } from "date-fns"

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

interface CheckAvailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  venueId: string | null
  stages: Stage[]
}

export function CheckAvailsModal({
  open,
  onOpenChange,
  venueId,
  stages,
}: CheckAvailsModalProps) {
  const defaultStart = format(subMonths(new Date(), 1), "yyyy-MM-dd")
  const defaultEnd = format(addMonths(new Date(), 3), "yyyy-MM-dd")
  const [dateFrom, setDateFrom] = useState(defaultStart)
  const [dateTo, setDateTo] = useState(defaultEnd)
  const [stageIds, setStageIds] = useState<string[]>([])
  const [includeHolds, setIncludeHolds] = useState(true)
  const [includeConfirms, setIncludeConfirms] = useState(true)
  const [onlyDays, setOnlyDays] = useState<number[]>([])
  const [shows, setShows] = useState<ShowRow[]>([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const options: AvailsOptions = {
    stageIds,
    includeHolds,
    includeConfirms,
    onlyDays,
  }
  const busyDates = getBusyDates(shows, options)
  const availableDates = getAvailableDates(dateFrom, dateTo, busyDates, onlyDays)

  const fetchShows = useCallback(async () => {
    if (!venueId || !open) return
    setLoading(true)
    try {
      const rows = await listShows(venueId, { dateFrom, dateTo })
      setShows(rows)
    } catch {
      setShows([])
    } finally {
      setLoading(false)
    }
  }, [venueId, open, dateFrom, dateTo])

  useEffect(() => {
    if (open && venueId && dateFrom && dateTo) fetchShows()
  }, [open, venueId, dateFrom, dateTo, fetchShows])

  const toggleStage = (id: string) => {
    setStageIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }
  const toggleDay = (day: number) => {
    setOnlyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    )
  }

  const handleCopy = async () => {
    const text = formatAvailsForClipboard(availableDates, "long")
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-background border-border sm:max-w-lg"
        aria-describedby="check-avails-desc"
        onKeyDown={(e) => e.key === "Escape" && onOpenChange(false)}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Check avails
          </DialogTitle>
          <DialogDescription id="check-avails-desc">
            See which dates are free for the selected stage(s). Copy the list to send to artist or agent.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">From</Label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>
          {stages.length > 0 && (
            <div>
              <Label className="text-xs">Stages (empty = all)</Label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {stages.map((s) => (
                  <label key={s.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <Checkbox
                      checked={stageIds.includes(s.id)}
                      onCheckedChange={() => toggleStage(s.id)}
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={includeHolds}
                onCheckedChange={(c) => setIncludeHolds(!!c)}
              />
              Include holds (as busy)
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={includeConfirms}
                onCheckedChange={(c) => setIncludeConfirms(!!c)}
              />
              Include confirms (as busy)
            </label>
          </div>
          <div>
            <Label className="text-xs">Only show these days (optional)</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {DAY_LABELS.map((label, i) => (
                <label key={i} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox
                    checked={onlyDays.includes(i)}
                    onCheckedChange={() => toggleDay(i)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Available: {availableDates.length} date{availableDates.length !== 1 ? "s" : ""}
                </p>
                <div className="max-h-40 overflow-y-auto rounded border border-border bg-muted/20 p-3 font-mono text-sm">
                  {availableDates.length === 0 ? (
                    <span className="text-muted-foreground">None in range.</span>
                  ) : (
                    availableDates.map((d) => (
                      <div key={d}>{format(new Date(d + "T12:00:00"), "EEE, MMM d, yyyy")}</div>
                    ))
                  )}
                </div>
              </div>
              <Button
                onClick={handleCopy}
                disabled={availableDates.length === 0}
                className="gap-2 w-full sm:w-auto"
              >
                <Copy className="w-4 h-4" />
                {copied ? "Copied!" : "Copy to clipboard"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
