"use client"

import { useState, useMemo, useEffect } from "react"
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
import { useEvent, type Event, type Band } from "@/components/event-context"
import type { Stage } from "@/lib/venue-types"
import { getWeekdayKey } from "@/lib/operating-hours"
import { isOutsideOperatingHours } from "@/lib/operating-hours"
import { ChevronRight, ChevronLeft, Truck, Music, DollarSign, Wrench, AlertTriangle } from "lucide-react"

const STEPS = [
  { id: 1, label: "Logistics", icon: Truck },
  { id: 2, label: "Talent", icon: Music },
  { id: 3, label: "Finance", icon: DollarSign },
  { id: 4, label: "Technical", icon: Wrench },
] as const

export interface ShowAdvanceWizardPrefill {
  date: string
  stageId: string
  doors: string
  curfew: string
}

interface ShowAdvanceWizardProps {
  open: boolean
  onClose: () => void
  stage: Stage | null
  prefill: ShowAdvanceWizardPrefill | null
  venueId: string | null
  stageNames?: Record<string, string>
}

export function ShowAdvanceWizard({
  open,
  onClose,
  stage,
  prefill,
  venueId,
  stageNames,
}: ShowAdvanceWizardProps) {
  const { saveEvent } = useEvent()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [logistics, setLogistics] = useState({
    date: "",
    loadIn: "14:00",
    soundcheck: "16:00",
    doors: "19:00",
    curfew: "23:00",
    loadOut: "00:00",
  })
  const [name, setName] = useState("")
  const [artistName, setArtistName] = useState("")
  const [artistLink, setArtistLink] = useState("")
  const [staffing, setStaffing] = useState<string>("")
  const [tech, setTech] = useState<string>("")
  const [cleaning, setCleaning] = useState<string>("")
  const [ticketPrice, setTicketPrice] = useState<string>("")
  const [specialRequests, setSpecialRequests] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setStep(1)
    setError(null)
    if (prefill) {
      setLogistics((prev) => ({
        ...prev,
        date: prefill.date,
        doors: prefill.doors,
        curfew: prefill.curfew,
        loadOut: prefill.curfew,
      }))
    }
    if (stage?.default_show_costs) {
      setStaffing(String(stage.default_show_costs.staffing ?? ""))
      setTech(String(stage.default_show_costs.tech ?? ""))
      setCleaning(String(stage.default_show_costs.cleaning ?? ""))
    } else {
      setStaffing("")
      setTech("")
      setCleaning("")
    }
  }, [open, prefill, stage?.default_show_costs])

  const operatingHours = stage?.default_operating_hours ?? {}
  const dayKey = logistics.date ? getWeekdayKey(logistics.date) : ""
  const scheduleConflict = useMemo(() => {
    if (!logistics.date || !logistics.doors || !logistics.curfew) return false
    return isOutsideOperatingHours(dayKey, logistics.doors, logistics.curfew, operatingHours)
  }, [dayKey, logistics.date, logistics.doors, logistics.curfew, operatingHours])

  const canNext = useMemo(() => {
    if (step === 1) return !!logistics.date && !!logistics.doors && !!logistics.curfew
    if (step === 2) return true
    return true
  }, [step, logistics.date, logistics.doors, logistics.curfew])

  const handleFinish = async () => {
    if (!venueId || !stage || !logistics.date) {
      setError("Venue, stage, and date are required.")
      return
    }
    setError(null)
    setSaving(true)
    try {
      const expenses: { name: string; amount: number; category?: string }[] = []
      const s = parseFloat(staffing)
      const t = parseFloat(tech)
      const c = parseFloat(cleaning)
      if (!Number.isNaN(s) && s > 0) expenses.push({ name: "Staffing", amount: s, category: "staffing" })
      if (!Number.isNaN(t) && t > 0) expenses.push({ name: "Tech", amount: t, category: "tech" })
      if (!Number.isNaN(c) && c > 0) expenses.push({ name: "Cleaning", amount: c, category: "cleaning" })

      const bands: Band[] = []
      if (artistName.trim()) {
        bands.push({
          id: `band-${Date.now()}`,
          name: artistName.trim(),
          setStart: logistics.doors,
          setEnd: logistics.curfew,
          isHeadliner: true,
        })
      }

      const event: Event = {
        id: `event-${Date.now()}`,
        name: name.trim() || (artistName.trim() ? `${artistName.trim()} — ${logistics.date}` : `Show ${logistics.date}`),
        date: logistics.date,
        loadIn: logistics.loadIn,
        soundcheck: logistics.soundcheck,
        doors: logistics.doors,
        curfew: logistics.curfew,
        loadOut: logistics.loadOut,
        status: "draft",
        selectedItems: [],
        greenRoomItems: [],
        bands,
        wizardCompleted: true,
        specialRequests: specialRequests.trim() || undefined,
        stageId: stage.id,
        linkedStageIds: [stage.id],
        expenses,
      }

      const maybePromise = saveEvent(event)
      const result =
        maybePromise && typeof (maybePromise as Promise<Event | null>).then === "function"
          ? await (maybePromise as Promise<Event | null>)
          : (event as Event | null)
      if (result) {
        onClose()
      } else {
        setError("Failed to save show.")
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save show.")
    } finally {
      setSaving(false)
    }
  }

  if (!stage) return null

  const StepIcon = STEPS[step - 1].icon

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-[#0B0E14] border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StepIcon className="w-5 h-5 text-primary" />
            Show Advance — Step {step} of 4: {STEPS[step - 1].label}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Set times, load-in, soundcheck."}
            {step === 2 && "Artist info and links."}
            {step === 3 && "Stage default costs and ticket pricing."}
            {step === 4 && "Stage specs and custom notes."}
          </DialogDescription>
        </DialogHeader>

        {scheduleConflict && (
          <div className="flex items-center gap-2 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-200 px-3 py-2 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Schedule conflict: set times fall outside this stage&apos;s default operating hours.</span>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wizard-date">Date</Label>
                <Input
                  id="wizard-date"
                  type="date"
                  value={logistics.date}
                  onChange={(e) => setLogistics((p) => ({ ...p, date: e.target.value }))}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Stage</Label>
                <div className="py-2 text-sm text-muted-foreground">{stage.name}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wizard-loadIn">Load-in</Label>
                <Input
                  id="wizard-loadIn"
                  type="time"
                  value={logistics.loadIn}
                  onChange={(e) => setLogistics((p) => ({ ...p, loadIn: e.target.value.slice(0, 5) }))}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wizard-soundcheck">Soundcheck</Label>
                <Input
                  id="wizard-soundcheck"
                  type="time"
                  value={logistics.soundcheck}
                  onChange={(e) => setLogistics((p) => ({ ...p, soundcheck: e.target.value.slice(0, 5) }))}
                  className="bg-background border-border"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wizard-doors">Doors</Label>
                <Input
                  id="wizard-doors"
                  type="time"
                  value={logistics.doors}
                  onChange={(e) => setLogistics((p) => ({ ...p, doors: e.target.value.slice(0, 5) }))}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wizard-curfew">Curfew</Label>
                <Input
                  id="wizard-curfew"
                  type="time"
                  value={logistics.curfew}
                  onChange={(e) => setLogistics((p) => ({ ...p, curfew: e.target.value.slice(0, 5), loadOut: e.target.value.slice(0, 5) }))}
                  className="bg-background border-border"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-loadOut">Load-out</Label>
              <Input
                id="wizard-loadOut"
                type="time"
                value={logistics.loadOut}
                onChange={(e) => setLogistics((p) => ({ ...p, loadOut: e.target.value.slice(0, 5) }))}
                className="bg-background border-border"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wizard-name">Event name</Label>
              <Input
                id="wizard-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Summer Series Night 1"
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-artist">Artist / act name</Label>
              <Input
                id="wizard-artist"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                placeholder="Artist or act name"
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-link">Artist link (optional)</Label>
              <Input
                id="wizard-link"
                type="url"
                value={artistLink}
                onChange={(e) => setArtistLink(e.target.value)}
                placeholder="https://…"
                className="bg-background border-border"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Auto-filled from stage defaults. Edit as needed.</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wizard-staffing">Staffing ($)</Label>
                <Input
                  id="wizard-staffing"
                  type="number"
                  min={0}
                  step={1}
                  value={staffing}
                  onChange={(e) => setStaffing(e.target.value)}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wizard-tech">Tech ($)</Label>
                <Input
                  id="wizard-tech"
                  type="number"
                  min={0}
                  step={1}
                  value={tech}
                  onChange={(e) => setTech(e.target.value)}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wizard-cleaning">Cleaning ($)</Label>
                <Input
                  id="wizard-cleaning"
                  type="number"
                  min={0}
                  step={1}
                  value={cleaning}
                  onChange={(e) => setCleaning(e.target.value)}
                  className="bg-background border-border"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-ticket">Ticket price (optional)</Label>
              <Input
                id="wizard-ticket"
                type="number"
                min={0}
                step={0.01}
                value={ticketPrice}
                onChange={(e) => setTicketPrice(e.target.value)}
                placeholder="e.g. 25"
                className="bg-background border-border"
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="rounded-md bg-muted/30 border border-border p-3 text-sm">
              <p className="font-medium text-foreground mb-2">Stage: {stage.name}</p>
              {stage.legal_capacity != null && <p>Legal capacity: {stage.legal_capacity}</p>}
              {stage.audio_specs && Object.keys(stage.audio_specs).length > 0 && (
                <p className="text-muted-foreground mt-1">Audio: {JSON.stringify(stage.audio_specs)}</p>
              )}
              {stage.lighting_specs && Object.keys(stage.lighting_specs).length > 0 && (
                <p className="text-muted-foreground">Lighting: {JSON.stringify(stage.lighting_specs)}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-notes">Custom notes</Label>
              <Textarea
                id="wizard-notes"
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="Technical notes, rider notes…"
                className="bg-background border-border min-h-[80px]"
              />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter className="gap-2 flex-wrap">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          )}
          {step < 4 ? (
            <Button type="button" onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3 | 4)} disabled={!canNext}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button type="button" onClick={handleFinish} disabled={saving}>
              {saving ? "Saving…" : "Create show"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
