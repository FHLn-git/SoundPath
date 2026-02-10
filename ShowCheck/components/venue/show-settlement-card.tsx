"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { computeSettlement } from "@/lib/settlement-calc"
import type { Event } from "@/components/event-context"
import { Calculator, CheckCircle2, DollarSign } from "lucide-react"

interface ShowSettlementCardProps {
  event: Event
  onSave: (updates: Partial<Event>) => Promise<unknown>
}

function toInputValue(n: number | null): string {
  return n == null ? "" : String(n)
}

export function ShowSettlementCard({ event, onSave }: ShowSettlementCardProps) {
  const [notes, setNotes] = useState(event.settlementNotes ?? "")
  const [busy, setBusy] = useState(false)
  const [savingFields, setSavingFields] = useState(false)
  const [guaranteeInput, setGuaranteeInput] = useState(toInputValue(event.guarantee ?? null))
  const [doorSplitInput, setDoorSplitInput] = useState(toInputValue(event.doorSplitPct ?? null))
  const [ticketRevenueInput, setTicketRevenueInput] = useState(toInputValue(event.ticketRevenue ?? null))

  // Sync inputs when event data changes (e.g. after save or load)
  useEffect(() => {
    setGuaranteeInput(toInputValue(event.guarantee ?? null))
    setDoorSplitInput(toInputValue(event.doorSplitPct ?? null))
    setTicketRevenueInput(toInputValue(event.ticketRevenue ?? null))
  }, [event.guarantee, event.doorSplitPct, event.ticketRevenue])

  const guarantee = event.guarantee ?? null
  const doorSplitPct = event.doorSplitPct ?? null
  const ticketRevenue = event.ticketRevenue ?? null
  const expenses = Array.isArray(event.expenses) ? event.expenses : []

  const saveFields = async (updates: Partial<Event>) => {
    setSavingFields(true)
    try {
      await onSave(updates)
    } finally {
      setSavingFields(false)
    }
  }

  const summary = computeSettlement({
    guarantee,
    door_split_pct: doorSplitPct,
    ticket_revenue: ticketRevenue,
    expenses,
  })

  const isFinalized = !!event.settlementFinalizedAt
  const payoutStatus = event.payoutStatus ?? "pending"

  const handleFinalize = async () => {
    setBusy(true)
    try {
      await onSave({
        settlementNotes: notes.trim() || undefined,
        settlementFinalizedAt: new Date().toISOString(),
        payoutStatus: "scheduled",
      })
    } finally {
      setBusy(false)
    }
  }

  const handleMarkPaid = async () => {
    setBusy(true)
    try {
      await onSave({
        payoutStatus: "paid",
        settlementFinalizedAt: event.settlementFinalizedAt || new Date().toISOString(),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Calculator className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>Artist settlement</CardTitle>
            <CardDescription>Guarantee, door split, and amount owed</CardDescription>
          </div>
          {isFinalized && (
            <Badge variant="secondary" className="ml-auto">Finalized</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Guarantee ($)</Label>
            <Input
              type="number"
              min={0}
              step={1}
              value={guaranteeInput}
              onChange={(e) => setGuaranteeInput(e.target.value)}
              onBlur={() => {
                const v = guaranteeInput.trim()
                const n = v === "" ? null : Number(v) || 0
                if (n !== guarantee) saveFields({ guarantee: n })
              }}
              placeholder="0"
              className="font-mono"
              disabled={savingFields}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Door split (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={1}
              value={doorSplitInput}
              onChange={(e) => setDoorSplitInput(e.target.value)}
              onBlur={() => {
                const v = doorSplitInput.trim()
                const n = v === "" ? null : Number(v) || 0
                if (n !== doorSplitPct) saveFields({ doorSplitPct: n })
              }}
              placeholder="0"
              className="font-mono"
              disabled={savingFields}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Ticket revenue ($)</Label>
            <Input
              type="number"
              min={0}
              step={1}
              value={ticketRevenueInput}
              onChange={(e) => setTicketRevenueInput(e.target.value)}
              onBlur={() => {
                const v = ticketRevenueInput.trim()
                const n = v === "" ? null : Number(v) || 0
                if (n !== ticketRevenue) saveFields({ ticketRevenue: n })
              }}
              placeholder="0"
              className="font-mono"
              disabled={savingFields}
            />
          </div>
        </div>
        <div className="grid gap-3 text-sm">
          {summary.breakdown.length > 0 && (
            <div className="text-xs text-muted-foreground space-y-0.5">
              {summary.breakdown.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-sm text-muted-foreground mb-1">Amount owed to artist</p>
          <p className="text-2xl font-bold font-mono text-foreground">
            ${summary.amountOwedToArtist.toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Payment status</span>
          <Badge variant={payoutStatus === "paid" ? "default" : "secondary"}>
            {payoutStatus}
          </Badge>
        </div>

        <div className="space-y-2">
          <Label htmlFor="settlement-notes">Settlement notes</Label>
          <Textarea
            id="settlement-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes when finalizing…"
            rows={2}
            className="resize-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {!isFinalized && (
            <Button onClick={handleFinalize} disabled={busy} className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Finalize settlement
            </Button>
          )}
          {isFinalized && payoutStatus !== "paid" && (
            <Button onClick={handleMarkPaid} disabled={busy} variant="outline" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Mark as paid
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
