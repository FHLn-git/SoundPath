"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useVenue } from "@/lib/use-venue"
import { archiveVenue } from "@/lib/venue-api"
import { AlertTriangle } from "lucide-react"

export function DeleteVenueCard() {
  const { activeVenue, activeVenueId, venues, setActiveVenueId, refetchVenues } = useVenue()
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [confirmName, setConfirmName] = useState("")
  const [deleting, setDeleting] = useState(false)

  const venueName = activeVenue?.name ?? ""
  const otherVenues = venues.filter((v) => v.id !== activeVenueId)
  const canSwitchTo = otherVenues[0]?.id ?? null

  const open = step > 0
  const close = () => {
    setStep(0)
    setConfirmName("")
  }

  const handleStep1 = () => setStep(1)
  const handleStep2 = () => setStep(2)
  const nameMatches = confirmName.trim().toLowerCase() === venueName.trim().toLowerCase()

  const handleDelete = async () => {
    if (!activeVenueId || !nameMatches) return
    setDeleting(true)
    try {
      await archiveVenue(activeVenueId)
      if (canSwitchTo) setActiveVenueId(canSwitchTo)
      else setActiveVenueId(null)
      await refetchVenues()
      close()
    } finally {
      setDeleting(false)
    }
  }

  if (!activeVenue) return null

  return (
    <>
      <Card className="border-destructive/30 bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-destructive/10">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-destructive">Remove venue</CardTitle>
              <CardDescription>
                Remove this venue from your account. SoundPath retains the data; you can contact support to restore.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleStep1}>
            Remove venue
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {step === 1 ? "Remove venue from your account?" : "Confirm removal"}
            </DialogTitle>
            <DialogDescription>
              {step === 1 ? (
                <>
                  This will remove <strong>{venueName}</strong> from your venue list. Your events and data are retained
                  by SoundPath and can be restored by support. You can add the venue again later if needed.
                </>
              ) : (
                <>
                  Type <strong>{venueName}</strong> below to confirm removal.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {step === 2 && (
            <div className="space-y-2 py-2">
              <Input
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder="Venue name"
                className="font-mono"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            {step === 1 ? (
              <Button variant="destructive" onClick={handleStep2}>
                Continue
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={!nameMatches || deleting}
              >
                {deleting ? "Removing…" : "Remove venue"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
