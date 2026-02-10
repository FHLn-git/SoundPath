"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { useStages } from "@/lib/use-venue-hierarchy"
import { createStage, updateStage, deleteStage } from "@/lib/stage-api"
import type { Stage, OperatingHoursMap, DefaultShowCosts } from "@/lib/venue-types"
import { Box, Plus, MoreHorizontal, Pencil, Trash2, Star, Clock, DollarSign } from "lucide-react"

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const
const WEEKDAY_LABELS: Record<string, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" }

interface StageManagementCardProps {
  venueId: string | null
}

export function StageManagementCard({ venueId }: StageManagementCardProps) {
  const { stages, loading, error, refetch } = useStages(venueId)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Stage | null>(null)
  const [name, setName] = useState("")
  const [legalCapacity, setLegalCapacity] = useState<string>("")
  const [comfortCapacity, setComfortCapacity] = useState<string>("")
  const [soundConsole, setSoundConsole] = useState("")
  const [paSpecs, setPaSpecs] = useState("")
  const [lightingRig, setLightingRig] = useState("")
  const [barCount, setBarCount] = useState<string>("0")
  const [securityNodes, setSecurityNodes] = useState("")
  const [greenRoomLinks, setGreenRoomLinks] = useState("")
  const [isDefault, setIsDefault] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [operatingHours, setOperatingHours] = useState<Record<string, { open: boolean; start: string; end: string }>>(
    () => Object.fromEntries(WEEKDAYS.map((d) => [d, { open: false, start: "19:00", end: "01:00" }]))
  )
  const [defaultStaffing, setDefaultStaffing] = useState("")
  const [defaultTech, setDefaultTech] = useState("")
  const [defaultCleaning, setDefaultCleaning] = useState("")

  const resetForm = () => {
    setEditing(null)
    setName("")
    setLegalCapacity("")
    setComfortCapacity("")
    setSoundConsole("")
    setPaSpecs("")
    setLightingRig("")
    setBarCount("0")
    setSecurityNodes("")
    setGreenRoomLinks("")
    setIsDefault(false)
    setFormError(null)
    setOperatingHours(() => Object.fromEntries(WEEKDAYS.map((d) => [d, { open: false, start: "19:00", end: "01:00" }])))
    setDefaultStaffing("")
    setDefaultTech("")
    setDefaultCleaning("")
  }

  const openAdd = () => {
    resetForm()
    setIsDefault(stages.length === 0)
    setDialogOpen(true)
  }

  const openEdit = (s: Stage) => {
    setEditing(s)
    setName(s.name)
    setLegalCapacity(s.legal_capacity != null ? String(s.legal_capacity) : "")
    setComfortCapacity(s.comfort_capacity != null ? String(s.comfort_capacity) : "")
    setSoundConsole((s.audio_specs as Record<string, string>)?.sound_console ?? "")
    setPaSpecs((s.audio_specs as Record<string, string>)?.pa_specs ?? "")
    setLightingRig((s.lighting_specs as Record<string, string>)?.rig ?? "")
    setBarCount(s.bar_count != null ? String(s.bar_count) : "0")
    const tech = (s.technical_specs_json ?? {}) as Record<string, string>
    setSecurityNodes(tech.security_nodes ?? "")
    setGreenRoomLinks(tech.green_room_links ?? "")
    setIsDefault(s.is_default ?? false)
    setFormError(null)
    const hours = s.default_operating_hours ?? {}
    setOperatingHours(
      Object.fromEntries(
        WEEKDAYS.map((d) => {
          const slot = hours[d]
          const open = Boolean(slot && Array.isArray(slot))
          return [d, { open, start: open && slot ? slot[0] : "19:00", end: open && slot ? slot[1] : "01:00" }]
        })
      )
    )
    setDefaultStaffing(s.default_show_costs?.staffing != null ? String(s.default_show_costs.staffing) : "")
    setDefaultTech(s.default_show_costs?.tech != null ? String(s.default_show_costs.tech) : "")
    setDefaultCleaning(s.default_show_costs?.cleaning != null ? String(s.default_show_costs.cleaning) : "")
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setFormError("Stage name is required.")
      return
    }
    if (!venueId) {
      setFormError("Venue is required.")
      return
    }
    setFormError(null)
    setSaving(true)
    try {
      const legal = legalCapacity.trim() ? parseInt(legalCapacity, 10) : null
      const comfort = comfortCapacity.trim() ? parseInt(comfortCapacity, 10) : null
      const bars = barCount.trim() ? parseInt(barCount, 10) : 0
      const audio_specs =
        soundConsole.trim() || paSpecs.trim()
          ? { sound_console: soundConsole.trim() || undefined, pa_specs: paSpecs.trim() || undefined }
          : {}
      const lighting_specs = lightingRig.trim() ? { rig: lightingRig.trim() } : {}
      const technical_specs_json: Record<string, string> = {}
      if (securityNodes.trim()) technical_specs_json.security_nodes = securityNodes.trim()
      if (greenRoomLinks.trim()) technical_specs_json.green_room_links = greenRoomLinks.trim()

      const default_operating_hours: OperatingHoursMap = {}
      WEEKDAYS.forEach((d) => {
        const row = operatingHours[d]
        default_operating_hours[d] = row?.open ? [row.start, row.end] : null
      })
      const default_show_costs: DefaultShowCosts = {}
      const ds = defaultStaffing.trim() ? parseFloat(defaultStaffing) : undefined
      const dt = defaultTech.trim() ? parseFloat(defaultTech) : undefined
      const dc = defaultCleaning.trim() ? parseFloat(defaultCleaning) : undefined
      if (ds != null && !Number.isNaN(ds)) default_show_costs.staffing = ds
      if (dt != null && !Number.isNaN(dt)) default_show_costs.tech = dt
      if (dc != null && !Number.isNaN(dc)) default_show_costs.cleaning = dc

      if (editing) {
        await updateStage(editing.id, {
          name: name.trim(),
          legal_capacity: legal,
          comfort_capacity: comfort,
          audio_specs: Object.keys(audio_specs).length ? audio_specs : undefined,
          lighting_specs: Object.keys(lighting_specs).length ? lighting_specs : undefined,
          bar_count: bars,
          technical_specs_json: Object.keys(technical_specs_json).length ? technical_specs_json : undefined,
          is_default: isDefault,
          default_operating_hours,
          default_show_costs: Object.keys(default_show_costs).length ? default_show_costs : undefined,
        })
      } else {
        await createStage({
          venue_id: venueId,
          name: name.trim(),
          capacity: comfort ?? legal,
          legal_capacity: legal,
          comfort_capacity: comfort,
          audio_specs,
          lighting_specs,
          bar_count: bars,
          technical_specs_json: Object.keys(technical_specs_json).length ? technical_specs_json : {},
          is_default: isDefault,
          default_operating_hours,
          default_show_costs: Object.keys(default_show_costs).length ? default_show_costs : undefined,
        })
      }
      refetch()
      setDialogOpen(false)
      resetForm()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setFormError(message || "Failed to save stage")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (s: Stage) => {
    if (!confirm(`Delete stage "${s.name}"? This cannot be undone.`)) return
    try {
      await deleteStage(s.id)
      refetch()
    } catch {
      // ignore
    }
  }

  if (loading && stages.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Loading stages…
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Box className="w-4 h-4 text-primary" />
                Stages
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Manage stages, capacity, technical rider (sound, lighting), and operations.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={openAdd} className="gap-1.5" disabled={!venueId}>
              <Plus className="w-4 h-4" />
              Add stage
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-destructive mb-3">{error.message}</p>}
          {stages.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No stages yet. Add one to get started (e.g. Main Stage).
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Name</TableHead>
                  <TableHead className="text-muted-foreground">Capacity</TableHead>
                  <TableHead className="text-muted-foreground">Bars</TableHead>
                  <TableHead className="text-muted-foreground w-[80px]">Default</TableHead>
                  <TableHead className="text-muted-foreground w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stages.map((s) => (
                  <TableRow key={s.id} className="border-border">
                    <TableCell className="font-medium text-foreground">{s.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.legal_capacity != null || s.comfort_capacity != null || s.capacity != null
                        ? [s.legal_capacity, s.comfort_capacity, s.capacity]
                            .filter((n) => n != null)
                            .join(" / ")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.bar_count ?? 0}</TableCell>
                    <TableCell>{s.is_default ? <Star className="w-4 h-4 text-primary fill-primary" /> : "—"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(s)} className="gap-2">
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(s)}
                            className="gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-background border-border sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit stage" : "Add stage"}</DialogTitle>
            <DialogDescription>
              Stage name, capacity, technical rider (sound/lighting), and operations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="stage-name">Stage name</Label>
              <Input
                id="stage-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Main Stage"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stage-legal">Legal capacity</Label>
                <Input
                  id="stage-legal"
                  type="number"
                  min={0}
                  value={legalCapacity}
                  onChange={(e) => setLegalCapacity(e.target.value)}
                  placeholder="—"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stage-comfort">Comfort capacity</Label>
                <Input
                  id="stage-comfort"
                  type="number"
                  min={0}
                  value={comfortCapacity}
                  onChange={(e) => setComfortCapacity(e.target.value)}
                  placeholder="—"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Technical rider — Sound</Label>
              <Input
                value={soundConsole}
                onChange={(e) => setSoundConsole(e.target.value)}
                placeholder="Sound console"
              />
              <Textarea
                value={paSpecs}
                onChange={(e) => setPaSpecs(e.target.value)}
                placeholder="PA specs"
                rows={2}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Technical rider — Lighting</Label>
              <Textarea
                value={lightingRig}
                onChange={(e) => setLightingRig(e.target.value)}
                placeholder="Lighting rig"
                rows={2}
                className="resize-none"
              />
            </div>
            <div className="space-y-4">
              <Label className="text-muted-foreground">Operations</Label>
              <div className="space-y-2">
                <Label htmlFor="stage-bars">Number of bars</Label>
                <Input
                  id="stage-bars"
                  type="number"
                  min={0}
                  value={barCount}
                  onChange={(e) => setBarCount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stage-security">Security nodes</Label>
                <Input
                  id="stage-security"
                  value={securityNodes}
                  onChange={(e) => setSecurityNodes(e.target.value)}
                  placeholder="e.g. count or notes"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stage-greenroom">Green room links</Label>
                <Input
                  id="stage-greenroom"
                  value={greenRoomLinks}
                  onChange={(e) => setGreenRoomLinks(e.target.value)}
                  placeholder="e.g. room names or URLs"
                />
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Default operating hours (weekly schedule)
              </Label>
              <div className="space-y-2 rounded-md border border-border p-3 bg-muted/20">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="flex flex-wrap items-center gap-2">
                    <Checkbox
                      id={`oh-${d}`}
                      checked={operatingHours[d]?.open ?? false}
                      onCheckedChange={(v) =>
                        setOperatingHours((prev) => ({
                          ...prev,
                          [d]: { ...prev[d], open: !!v, start: prev[d]?.start ?? "19:00", end: prev[d]?.end ?? "01:00" },
                        }))
                      }
                    />
                    <Label htmlFor={`oh-${d}`} className="w-10 cursor-pointer text-sm">
                      {WEEKDAY_LABELS[d]}
                    </Label>
                    {operatingHours[d]?.open && (
                      <>
                        <Input
                          type="time"
                          className="w-24 h-8 text-sm"
                          value={operatingHours[d]?.start ?? "19:00"}
                          onChange={(e) =>
                            setOperatingHours((prev) => ({ ...prev, [d]: { ...prev[d], start: e.target.value.slice(0, 5), end: prev[d]?.end ?? "01:00" } }))
                          }
                        />
                        <span className="text-muted-foreground text-sm">–</span>
                        <Input
                          type="time"
                          className="w-24 h-8 text-sm"
                          value={operatingHours[d]?.end ?? "01:00"}
                          onChange={(e) =>
                            setOperatingHours((prev) => ({ ...prev, [d]: { ...prev[d], end: e.target.value.slice(0, 5), start: prev[d]?.start ?? "19:00" } }))
                          }
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                Default show costs (Staffing, Tech, Cleaning)
              </Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="stage-staffing" className="text-xs">Staffing ($)</Label>
                  <Input
                    id="stage-staffing"
                    type="number"
                    min={0}
                    value={defaultStaffing}
                    onChange={(e) => setDefaultStaffing(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="stage-tech" className="text-xs">Tech ($)</Label>
                  <Input
                    id="stage-tech"
                    type="number"
                    min={0}
                    value={defaultTech}
                    onChange={(e) => setDefaultTech(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="stage-cleaning" className="text-xs">Cleaning ($)</Label>
                  <Input
                    id="stage-cleaning"
                    type="number"
                    min={0}
                    value={defaultCleaning}
                    onChange={(e) => setDefaultCleaning(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="stage-default"
                checked={isDefault}
                onCheckedChange={(v) => setIsDefault(!!v)}
              />
              <Label htmlFor="stage-default" className="cursor-pointer">Default stage for this venue</Label>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save" : "Add stage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
