"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useEvent, type Event, type Band } from "@/components/event-context"
import { useStages } from "@/lib/use-venue-hierarchy"
import { addMinutesToTime, durationMinutes } from "@/lib/time-utils"
import { createShowInvitation } from "@/lib/show-api"
import { sendShowInvitationEmail } from "@/lib/send-email"
import { useVenue } from "@/lib/use-venue"
import {
  CalendarPlus,
  Clock,
  Calendar,
  CheckCircle2,
  Layers,
  Box,
  ChevronRight,
  ChevronLeft,
  Music,
  Plus,
  Star,
  UserPlus,
  Copy,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

const DEFAULT_CHANGEOVER_MINS = 15
const DEFAULT_SET_LENGTH_MINS = 45

interface EventCreatorProps {
  /** When set, form is in edit mode: prefilled and save updates this event */
  initialEvent?: Event | null
  /** Called after a successful save in edit mode (so parent can clear edit state) */
  onSaved?: () => void
}

export function EventCreator({ initialEvent = null, onSaved }: EventCreatorProps) {
  const { events, setEvents, setCurrentEvent, getHouseMinimumTotal, saveEvent, venueId } = useEvent()
  const { activeVenue } = useVenue()
  const { stages } = useStages(venueId)
  const isEditMode = !!initialEvent
  const [step, setStep] = useState<1 | 2>(1)
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    loadIn: "14:00",
    soundcheck: "16:00",
    doors: "19:00",
    curfew: "23:00",
    loadOut: "00:00",
  })
  const [bands, setBands] = useState<Band[]>([])
  const [changeoverMins, setChangeoverMins] = useState(DEFAULT_CHANGEOVER_MINS)
  const [isMultiStage, setIsMultiStage] = useState(false)
  const [selectedStageIds, setSelectedStageIds] = useState<string[]>([])
  const [isCreated, setIsCreated] = useState(false)
  const [createdEvent, setCreatedEvent] = useState<Event | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [inviteEmailSent, setInviteEmailSent] = useState(false)

  useEffect(() => {
    if (!initialEvent) {
      setSaveError(null)
      setFormData({
        name: "",
        date: "",
        loadIn: "14:00",
        soundcheck: "16:00",
        doors: "19:00",
        curfew: "23:00",
        loadOut: "00:00",
      })
      setBands([])
      setChangeoverMins(DEFAULT_CHANGEOVER_MINS)
      setIsMultiStage(false)
      setSelectedStageIds([])
      setIsCreated(false)
      setCreatedEvent(null)
      setStep(1)
      return
    }
    setFormData({
      name: initialEvent.name,
      date: initialEvent.date,
      loadIn: initialEvent.loadIn ?? "14:00",
      soundcheck: initialEvent.soundcheck ?? "16:00",
      doors: initialEvent.doors ?? "19:00",
      curfew: initialEvent.curfew ?? "23:00",
      loadOut: initialEvent.loadOut ?? "00:00",
    })
    setBands(
      initialEvent.bands?.length
        ? initialEvent.bands.map((b) => ({
            id: b.id,
            name: b.name,
            setStart: b.setStart,
            setEnd: b.setEnd,
            isHeadliner: b.isHeadliner ?? false,
          }))
        : []
    )
    const multi = initialEvent.isMultiStage ?? false
    setIsMultiStage(multi)
    setSelectedStageIds(
      multi
        ? initialEvent.linkedStageIds ?? []
        : initialEvent.stageId
          ? [initialEvent.stageId]
          : []
    )
    setStep(1)
    setIsCreated(false)
    setCreatedEvent(null)
  }, [initialEvent?.id])

  const combinedCapacity = stages
    .filter((s) => selectedStageIds.includes(s.id) && s.capacity != null)
    .reduce((sum, s) => sum + (s.capacity ?? 0), 0)
  const hasStages = stages.length > 0

  const applyChangeoverToBands = (newChangeover: number) => {
    if (bands.length <= 1) return
    const next: Band[] = []
    for (let i = 0; i < bands.length; i++) {
      if (i === 0) {
        next.push(bands[0])
        continue
      }
      const prev = next[i - 1]
      const start = addMinutesToTime(prev.setEnd, newChangeover)
      const duration = durationMinutes(bands[i].setStart, bands[i].setEnd)
      const end = addMinutesToTime(start, Math.max(15, duration))
      next.push({ ...bands[i], setStart: start, setEnd: end })
    }
    setBands(next)
  }

  const addArtist = () => {
    const last = bands[bands.length - 1]
    const setStart = last
      ? addMinutesToTime(last.setEnd, changeoverMins)
      : formData.doors
    const setEnd = addMinutesToTime(setStart, DEFAULT_SET_LENGTH_MINS)
    setBands((prev) => [
      ...prev,
      {
        id: `band-${Date.now()}-${prev.length}`,
        name: "",
        setStart,
        setEnd,
        isHeadliner: prev.length === 0,
      },
    ])
  }

  const updateBand = (id: string, updates: Partial<Band>) => {
    setBands((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    )
  }

  const removeBand = (id: string) => {
    setBands((prev) => prev.filter((b) => b.id !== id))
  }

  const handleCreate = async () => {
    setSaveError(null)
    const baseEvent: Event = {
      id: isEditMode && initialEvent ? initialEvent.id : `event-${Date.now()}`,
      ...formData,
      status: (isEditMode && initialEvent ? initialEvent.status : "draft") as Event["status"],
      selectedItems: (isEditMode && initialEvent ? initialEvent.selectedItems : []) as string[],
      greenRoomItems: (isEditMode && initialEvent ? initialEvent.greenRoomItems : []) as { id: string; quantity: number }[],
      bands: bands.filter((b) => b.name.trim() !== ""),
      wizardCompleted: true,
      specialRequests: (isEditMode && initialEvent ? initialEvent.specialRequests : "") ?? "",
      isMultiStage: isMultiStage && selectedStageIds.length > 1,
      linkedStageIds: selectedStageIds.length > 0 ? selectedStageIds : [],
      stageId: !isMultiStage && selectedStageIds.length === 1 ? selectedStageIds[0] : undefined,
    }
    const eventToSave: Event = isEditMode && initialEvent
      ? { ...initialEvent, ...baseEvent }
      : baseEvent

    try {
      if (venueId) {
        const maybePromise = saveEvent(eventToSave)
        const persisted =
          maybePromise && typeof (maybePromise as Promise<Event | null>).then === "function"
            ? await (maybePromise as Promise<Event | null>)
            : null
        setCreatedEvent(persisted ?? eventToSave)
      } else {
        setEvents([...events, eventToSave])
        setCurrentEvent(eventToSave)
        setCreatedEvent(eventToSave)
      }
      setIsCreated(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err))
    }
  }

  const resetForm = () => {
    setSaveError(null)
    setStep(1)
    setFormData({
      name: "",
      date: "",
      loadIn: "14:00",
      soundcheck: "16:00",
      doors: "19:00",
      curfew: "23:00",
      loadOut: "00:00",
    })
    setBands([])
    setChangeoverMins(DEFAULT_CHANGEOVER_MINS)
    setIsMultiStage(false)
    setSelectedStageIds([])
    setIsCreated(false)
    setCreatedEvent(null)
  }

  if (isCreated && createdEvent) {
    return (
      <>
        <Card className="border-primary/20 bg-card">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground">
                  {isEditMode ? "Event Updated Successfully" : "Event Created Successfully"}
                </h3>
                <p className="text-muted-foreground mt-1">
                  {createdEvent.name} on {new Date(createdEvent.date).toLocaleDateString()}
                </p>
              </div>

              <div className="w-full max-w-md p-4 bg-secondary/30 rounded-lg space-y-3 text-left">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary">Draft</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">House Minimum</span>
                  <span className="font-medium text-foreground">
                    ${getHouseMinimumTotal().toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Promoter Portal</span>
                  <span className="font-medium text-primary">Ready</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm()
                    if (isEditMode) onSaved?.()
                  }}
                >
                  {isEditMode ? "Done" : "Create Another"}
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => setInviteOpen(true)}>
                  <UserPlus className="w-4 h-4" />
                  Invite promoter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open)
          if (!open) {
            setInviteEmail("")
            setInviteError(null)
            setInviteLink(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite promoter</DialogTitle>
            <DialogDescription>
              Create an invitation link for this show. Send the link to the promoter so they can set a password and
              access the advance.
            </DialogDescription>
          </DialogHeader>
          {createdEvent && !inviteLink ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!inviteEmail.trim()) return
                setInviteSending(true)
                setInviteError(null)
                setInviteEmailSent(false)
                try {
                  const result = await createShowInvitation(createdEvent.id, inviteEmail.trim())
                  if ("error" in result) throw new Error(result.error)
                  const origin = typeof window !== "undefined" ? window.location.origin : ""
                  const path = typeof window !== "undefined" && window.location.pathname.startsWith("/app/") ? "/app" : ""
                  const url = `${origin}${path}/portal/promoter/accept?token=${result.token}`
                  setInviteLink(url)
                  const emailResult = await sendShowInvitationEmail({
                    to: inviteEmail.trim(),
                    inviteUrl: url,
                    showName: createdEvent.name,
                    venueName: activeVenue?.name ?? "Venue",
                    date: new Date(createdEvent.date).toLocaleDateString("en-US"),
                  })
                  setInviteEmailSent(emailResult.success)
                  if (!emailResult.success) setInviteError((prev) => (prev ? prev : `Invite created. Email failed: ${emailResult.error}`))
                } catch (err) {
                  setInviteError(err instanceof Error ? err.message : "Failed to create invitation")
                } finally {
                  setInviteSending(false)
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="invite-email-wizard">Promoter email</Label>
                <Input
                  id="invite-email-wizard"
                  type="email"
                  placeholder="promoter@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={inviteSending}
                />
              </div>
              {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={inviteSending || !inviteEmail.trim()}>
                  {inviteSending ? "Creating…" : "Create invitation"}
                </Button>
              </DialogFooter>
            </form>
          ) : createdEvent && inviteLink ? (
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
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (inviteLink && navigator?.clipboard?.writeText) {
                      navigator.clipboard.writeText(inviteLink).then(() => alert("Invite link copied to clipboard."))
                    }
                  }}
                  title="Copy link"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={() => setInviteOpen(false)}>Done</Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setInviteLink(null)
                    setInviteEmail("")
                    setInviteEmailSent(false)
                  }}
                >
                  Invite another
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      </>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <CalendarPlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>{isEditMode ? "Edit Event" : "Create New Event"}</CardTitle>
              <CardDescription>
                {step === 1
                  ? "Basic details — name, date, stage"
                  : "Run of show & set times — promoter fills in the rest in the portal"}
              </CardDescription>
            </div>
            <Badge variant="outline" className="ml-auto font-mono">
              Step {step} of 2
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="eventName">Event Name</Label>
                    <Input
                      id="eventName"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Summer Concert Series - Night 1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="eventDate">Event Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="eventDate"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {hasStages && (
                    <div className="space-y-3 pt-2 border-t border-border/60">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="festival-mode"
                          checked={isMultiStage}
                          onCheckedChange={(v) => {
                            setIsMultiStage(!!v)
                            if (!v) setSelectedStageIds((prev) => (prev.length > 1 ? prev.slice(0, 1) : prev))
                          }}
                        />
                        <Label htmlFor="festival-mode" className="flex items-center gap-1.5 cursor-pointer font-medium">
                          <Layers className="w-4 h-4 text-primary" />
                          Multi-Stage / Festival Mode
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {isMultiStage
                          ? "Select all stages this event uses."
                          : "Optional: assign to one stage."}
                      </p>
                      <div className="flex flex-col gap-2">
                        {stages.map((s) => (
                          <div key={s.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`stage-${s.id}`}
                              checked={selectedStageIds.includes(s.id)}
                              onCheckedChange={(checked) => {
                                if (isMultiStage) {
                                  setSelectedStageIds((prev) =>
                                    checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)
                                  )
                                } else {
                                  setSelectedStageIds(checked ? [s.id] : [])
                                }
                              }}
                            />
                            <Label htmlFor={`stage-${s.id}`} className="flex items-center gap-2 cursor-pointer text-sm font-mono">
                              <Box className="w-3.5 h-3.5 text-muted-foreground" />
                              {s.name}
                              {s.capacity != null && (
                                <span className="text-muted-foreground">(Cap. {s.capacity})</span>
                              )}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {isMultiStage && selectedStageIds.length > 0 && combinedCapacity > 0 && (
                        <p className="text-sm font-mono text-foreground pt-1">
                          Combined capacity: <strong>{combinedCapacity.toLocaleString()}</strong>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-secondary/30 rounded-lg space-y-2">
                  <p className="text-sm font-medium text-foreground">Next step</p>
                  <p className="text-xs text-muted-foreground">
                    You’ll set run-of-show times (load-in, doors, curfew) and add artists with set times. Changeovers between sets will auto-fill.
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!formData.name || !formData.date}
                  className="gap-2"
                >
                  Run of show & artists
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Run of show times
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="loadIn" className="text-xs text-muted-foreground">Load-in</Label>
                      <Input
                        id="loadIn"
                        type="time"
                        value={formData.loadIn}
                        onChange={(e) => setFormData((prev) => ({ ...prev, loadIn: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="soundcheck" className="text-xs text-muted-foreground">Soundcheck</Label>
                      <Input
                        id="soundcheck"
                        type="time"
                        value={formData.soundcheck}
                        onChange={(e) => setFormData((prev) => ({ ...prev, soundcheck: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doors" className="text-xs text-muted-foreground">Doors</Label>
                      <Input
                        id="doors"
                        type="time"
                        value={formData.doors}
                        onChange={(e) => setFormData((prev) => ({ ...prev, doors: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="curfew" className="text-xs text-muted-foreground">Curfew</Label>
                      <Input
                        id="curfew"
                        type="time"
                        value={formData.curfew}
                        onChange={(e) => setFormData((prev) => ({ ...prev, curfew: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loadOut" className="text-xs text-muted-foreground">Load-out</Label>
                    <Input
                      id="loadOut"
                      type="time"
                      value={formData.loadOut}
                      onChange={(e) => setFormData((prev) => ({ ...prev, loadOut: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Music className="w-4 h-4" />
                      Artists & set times
                    </Label>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="changeover" className="text-xs text-muted-foreground whitespace-nowrap">
                        Changeover (min)
                      </Label>
                      <Input
                        id="changeover"
                        type="number"
                        min={0}
                        max={60}
                        className="w-16 font-mono"
                        value={changeoverMins}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10)
                          if (!Number.isNaN(v) && v >= 0) {
                            setChangeoverMins(v)
                            applyChangeoverToBands(v)
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {bands.map((band, i) => (
                      <div
                        key={band.id}
                        className="p-3 rounded-lg border border-border bg-secondary/20 space-y-2"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <Input
                            placeholder="Artist name"
                            value={band.name}
                            onChange={(e) => updateBand(band.id, { name: e.target.value })}
                            className="flex-1 min-w-[120px]"
                          />
                          <div className="flex items-center gap-1">
                            <Checkbox
                              id={`headliner-${band.id}`}
                              checked={!!band.isHeadliner}
                              onCheckedChange={(c) => updateBand(band.id, { isHeadliner: !!c })}
                            />
                            <Label htmlFor={`headliner-${band.id}`} className="flex items-center gap-1 cursor-pointer text-xs">
                              <Star className="w-3.5 h-3.5 text-amber-400" />
                              Headliner
                            </Label>
                          </div>
                          {bands.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 text-destructive hover:text-destructive"
                              onClick={() => removeBand(band.id)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Input
                            type="time"
                            value={band.setStart}
                            onChange={(e) => {
                              const start = e.target.value
                              const duration = durationMinutes(band.setStart, band.setEnd)
                              updateBand(band.id, {
                                setStart: start,
                                setEnd: addMinutesToTime(start, Math.max(15, duration)),
                              })
                            }}
                            className="w-28 font-mono text-sm"
                          />
                          <span className="text-muted-foreground">–</span>
                          <Input
                            type="time"
                            value={band.setEnd}
                            onChange={(e) => updateBand(band.id, { setEnd: e.target.value })}
                            className="w-28 font-mono text-sm"
                          />
                          {i > 0 && (
                            <span className="text-xs text-muted-foreground">
                              ({changeoverMins} min changeover before)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      onClick={addArtist}
                    >
                      <Plus className="w-4 h-4" />
                      Add artist
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-secondary/30 rounded-lg flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm text-muted-foreground">
                  House minimums apply. Promoter sets rider, green room, etc. in the promoter portal.
                </p>
                <Badge variant="outline" className="font-mono">
                  ${getHouseMinimumTotal().toLocaleString()}
                </Badge>
              </div>

              {saveError && (
                <p className="text-sm text-destructive rounded-md bg-destructive/10 p-3">
                  {saveError}
                </p>
              )}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!formData.name || !formData.date}
                  className="gap-2"
                >
                  <CalendarPlus className="w-4 h-4" />
                  {isEditMode ? "Save changes" : "Create event"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
