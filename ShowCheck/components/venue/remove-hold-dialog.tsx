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
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import type { Event } from "@/components/event-context"
import { AlertCircle } from "lucide-react"

interface RemoveHoldDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  hold: Event | null
  onConfirm: (hold: Event, autoPromote: boolean) => Promise<void>
}

export function RemoveHoldDialog({
  open,
  onOpenChange,
  hold,
  onConfirm,
}: RemoveHoldDialogProps) {
  const [autoPromote, setAutoPromote] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!hold) return
    setLoading(true)
    try {
      await onConfirm(hold, autoPromote)
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  if (!hold) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-400">
            <AlertCircle className="w-5 h-5" />
            Remove hold
          </DialogTitle>
          <DialogDescription>
            Remove the hold for <strong>{hold.bands?.[0]?.name ?? hold.name}</strong> on{" "}
            {new Date(hold.date).toLocaleDateString()}.
            {hold.stageName && ` (${hold.stageName})`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2 py-2">
          <Checkbox
            id="remove-auto-promote"
            checked={autoPromote}
            onCheckedChange={(c) => setAutoPromote(!!c)}
          />
          <Label htmlFor="remove-auto-promote" className="text-sm font-normal cursor-pointer">
            Auto-promote next ranked hold to confirmed
          </Label>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading ? "Removing…" : "Remove hold"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
