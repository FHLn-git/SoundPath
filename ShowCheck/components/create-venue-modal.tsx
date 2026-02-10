"use client"

import { useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createVenue } from "@/lib/venue-api"
import { COUNTRIES } from "@/lib/countries"
import { formatOperationError } from "@/lib/format-error"
import { Loader2, MapPin, AlertCircle } from "lucide-react"

interface CreateVenueModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (venueId: string) => void
}

export function CreateVenueModal({ open, onOpenChange, onCreated }: CreateVenueModalProps) {
  const [name, setName] = useState("")
  const [capacity, setCapacity] = useState("")
  const [street1, setStreet1] = useState("")
  const [street2, setStreet2] = useState("")
  const [city, setCity] = useState("")
  const [stateRegion, setStateRegion] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [country, setCountry] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setName("")
    setCapacity("")
    setStreet1("")
    setStreet2("")
    setCity("")
    setStateRegion("")
    setPostalCode("")
    setCountry("")
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !street1.trim() || !city.trim() || !postalCode.trim() || !country.trim() || !capacity.trim()) {
      setError("Please fill in all required fields.")
      return
    }
    const capacityNum = parseInt(capacity, 10)
    if (isNaN(capacityNum) || capacityNum < 1) {
      setError("Please enter a valid capacity (1 or more).")
      return
    }
    setSaving(true)
    try {
      const venue = await createVenue({
        name: name.trim(),
        capacity: capacityNum,
        address_street_1: street1.trim(),
        address_street_2: street2.trim() || null,
        address_city: city.trim(),
        address_state_region: stateRegion.trim() || null,
        address_postal_code: postalCode.trim(),
        address_country: country.trim(),
      })
      if (venue) {
        resetForm()
        await Promise.resolve(onCreated(venue.id))
        onOpenChange(false)
      } else {
        setError(
          formatOperationError(null, {
            operation: "Create venue",
            fallbackReason: "The server didn’t return the new venue. It may still have been created—check your venue list.",
          })
        )
      }
    } catch (err) {
      setError(
        formatOperationError(err, {
          operation: "Create venue",
          fallbackReason: "Check your connection and try again, or run the database migration if you added new address fields.",
        })
      )
    } finally {
      setSaving(false)
    }
  }

  const canSubmit =
    name.trim() &&
    street1.trim() &&
    city.trim() &&
    postalCode.trim() &&
    country.trim() &&
    capacity.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Venue</DialogTitle>
          <DialogDescription>
            Add a performance space. All address data is stored for reporting and Global Pulse.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="venue-name">Venue name</Label>
            <Input
              id="venue-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. The Roxy Theatre"
              required
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Address
            </div>
            <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="space-y-2">
                <Label htmlFor="venue-street1">Street address</Label>
                <Input
                  id="venue-street1"
                  value={street1}
                  onChange={(e) => setStreet1(e.target.value)}
                  placeholder="123 Main St"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="venue-street2">Apartment, suite, etc. (optional)</Label>
                <Input
                  id="venue-street2"
                  value={street2}
                  onChange={(e) => setStreet2(e.target.value)}
                  placeholder="Suite 100"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="venue-city">City</Label>
                  <Input
                    id="venue-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Los Angeles"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="venue-state">State / Region</Label>
                  <Input
                    id="venue-state"
                    value={stateRegion}
                    onChange={(e) => setStateRegion(e.target.value)}
                    placeholder="CA"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="venue-postal">ZIP / Postal code</Label>
                  <Input
                    id="venue-postal"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="90028"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="venue-country">Country</Label>
                  <Select value={country || undefined} onValueChange={setCountry} required>
                    <SelectTrigger id="venue-country">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[280px]">
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="venue-capacity">Capacity</Label>
            <Input
              id="venue-capacity"
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="e.g. 500"
              required
            />
          </div>

          {error && (
            <div className="flex gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-left">
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-destructive">Couldn’t create venue</p>
                <p className="text-sm text-destructive/90">{error}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !canSubmit}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating…
                </>
              ) : (
                "Create Venue"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
