"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useVenue } from "@/lib/use-venue"
import { updateVenue } from "@/lib/venue-api"
import { Building2, Loader2 } from "lucide-react"

export function VenueDetailsSettings() {
  const { activeVenue, activeVenueId, refetchVenues } = useVenue()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [form, setForm] = useState({
    name: "",
    capacity: "" as string | number,
    address_street_1: "",
    address_street_2: "",
    address_city: "",
    address_state_region: "",
    address_postal_code: "",
    address_country: "",
    timezone: "",
  })

  useEffect(() => {
    if (!activeVenue) return
    setForm({
      name: activeVenue.name ?? "",
      capacity: activeVenue.capacity ?? "",
      address_street_1: (activeVenue as { address_street_1?: string }).address_street_1 ?? "",
      address_street_2: (activeVenue as { address_street_2?: string }).address_street_2 ?? "",
      address_city: (activeVenue as { address_city?: string }).address_city ?? "",
      address_state_region: (activeVenue as { address_state_region?: string }).address_state_region ?? "",
      address_postal_code: (activeVenue as { address_postal_code?: string }).address_postal_code ?? "",
      address_country: (activeVenue as { address_country?: string }).address_country ?? "",
      timezone: (activeVenue as { timezone?: string }).timezone ?? "",
    })
  }, [activeVenue])

  const handleSave = async () => {
    if (!activeVenueId) return
    setSaving(true)
    setMessage(null)
    try {
      await updateVenue(activeVenueId, {
        name: form.name.trim() || undefined,
        capacity: form.capacity === "" ? null : Number(form.capacity) || null,
        address_street_1: form.address_street_1.trim() || null,
        address_street_2: form.address_street_2.trim() || null,
        address_city: form.address_city.trim() || null,
        address_state_region: form.address_state_region.trim() || null,
        address_postal_code: form.address_postal_code.trim() || null,
        address_country: form.address_country.trim() || null,
        timezone: form.timezone.trim() || null,
      })
      await refetchVenues()
      setMessage({ type: "success", text: "Venue updated." })
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to save." })
    } finally {
      setSaving(false)
    }
  }

  if (!activeVenue) return null

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>Venue details</CardTitle>
            <CardDescription>Name, address, capacity, and timezone</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="venue-name">Venue name</Label>
            <Input
              id="venue-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. The Roxy"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="venue-capacity">Capacity</Label>
            <Input
              id="venue-capacity"
              type="number"
              min={0}
              value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
              placeholder="e.g. 500"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="venue-street1">Street address</Label>
          <Input
            id="venue-street1"
            value={form.address_street_1}
            onChange={(e) => setForm((f) => ({ ...f, address_street_1: e.target.value }))}
            placeholder="Street address line 1"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="venue-street2">Address line 2 (optional)</Label>
          <Input
            id="venue-street2"
            value={form.address_street_2}
            onChange={(e) => setForm((f) => ({ ...f, address_street_2: e.target.value }))}
            placeholder="Suite, floor, etc."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="venue-city">City</Label>
            <Input
              id="venue-city"
              value={form.address_city}
              onChange={(e) => setForm((f) => ({ ...f, address_city: e.target.value }))}
              placeholder="City"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="venue-state">State / Region</Label>
            <Input
              id="venue-state"
              value={form.address_state_region}
              onChange={(e) => setForm((f) => ({ ...f, address_state_region: e.target.value }))}
              placeholder="State or region"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="venue-postal">Postal code</Label>
            <Input
              id="venue-postal"
              value={form.address_postal_code}
              onChange={(e) => setForm((f) => ({ ...f, address_postal_code: e.target.value }))}
              placeholder="ZIP / postal code"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="venue-country">Country</Label>
          <Input
            id="venue-country"
            value={form.address_country}
            onChange={(e) => setForm((f) => ({ ...f, address_country: e.target.value }))}
            placeholder="Country"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="venue-timezone">Timezone</Label>
          <Input
            id="venue-timezone"
            value={form.timezone}
            onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
            placeholder="e.g. America/New_York"
          />
        </div>
        {message && (
          <p className={message.type === "error" ? "text-sm text-destructive" : "text-sm text-primary"}>
            {message.text}
          </p>
        )}
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save venue details
        </Button>
      </CardContent>
    </Card>
  )
}
