"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { computeSettlement } from "@/lib/settlement-calc"
import type { Event } from "@/components/event-context"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface ShowPnLCardProps {
  event: Event
}

/**
 * P&L: Forecast (from guarantee/offer), Estimate (current calc), Actuals (post-show).
 * Simplified: Forecast = guarantee or door estimate; Actual = ticket revenue - amount owed.
 */
export function ShowPnLCard({ event }: ShowPnLCardProps) {
  const guarantee = event.guarantee ?? 0
  const doorSplitPct = event.doorSplitPct ?? null
  const ticketRevenue = event.ticketRevenue ?? 0
  const expenses = Array.isArray(event.expenses) ? event.expenses : []

  const summary = computeSettlement({
    guarantee: event.guarantee ?? null,
    door_split_pct: doorSplitPct,
    ticket_revenue: ticketRevenue,
    expenses,
  })

  const totalExpenses = summary.totalExpenses
  const amountOwed = summary.amountOwedToArtist

  const pnl = ticketRevenue - amountOwed - totalExpenses
  const isPositive = pnl > 0
  const isNegative = pnl < 0

  // Thermometer: simple bar, 0 = break-even; scale for display
  const maxAbs = Math.max(Math.abs(pnl), 1)
  const pct = Math.min(100, (pnl / maxAbs) * 50 + 50)

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${
            isPositive ? "bg-primary/10" : isNegative ? "bg-destructive/10" : "bg-muted"
          }`}>
            {isPositive ? (
              <TrendingUp className="w-5 h-5 text-primary" />
            ) : isNegative ? (
              <TrendingDown className="w-5 h-5 text-destructive" />
            ) : (
              <Minus className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <CardTitle>P&L</CardTitle>
            <CardDescription>Forecast vs actual (venue perspective)</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg border border-border bg-muted/20">
          <p className="text-sm text-muted-foreground mb-1">Net (revenue − artist − expenses)</p>
          <p className={`text-2xl font-bold font-mono ${
            isPositive ? "text-primary" : isNegative ? "text-destructive" : "text-foreground"
          }`}>
            {isPositive ? "+" : ""}${pnl.toLocaleString()}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">P&L bar</p>
          <div className="h-2 rounded-full bg-muted overflow-hidden flex">
            <div
              className={`h-full transition-all ${
                isPositive ? "bg-primary" : isNegative ? "bg-destructive" : "bg-muted-foreground/50"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Loss</span>
            <span>Break-even</span>
            <span>Profit</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Revenue</span>
            <span className="font-mono">${ticketRevenue.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">To artist</span>
            <span className="font-mono">${amountOwed.toLocaleString()}</span>
          </div>
          {totalExpenses > 0 && (
            <div className="flex justify-between col-span-2">
              <span className="text-muted-foreground">Expenses</span>
              <span className="font-mono">${totalExpenses.toLocaleString()}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
