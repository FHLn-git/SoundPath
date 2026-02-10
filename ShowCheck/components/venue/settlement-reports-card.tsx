"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEvent, type Event } from "@/components/event-context"
import { computeSettlement } from "@/lib/settlement-calc"
import { BarChart3, DollarSign, Calendar } from "lucide-react"
import { format } from "date-fns"

interface SettlementReportsCardProps {
  onEventClick?: (event: Event) => void
}

export function SettlementReportsCard({ onEventClick }: SettlementReportsCardProps) {
  const { events } = useEvent()
  const now = new Date()
  const thisMonthStart = format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd")
  const thisMonthEnd = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), "yyyy-MM-dd")

  const { monthShows, totalOwedThisMonth, pendingCount, scheduledCount, paidCount, totalPaidOwed } =
    useMemo(() => {
      const monthEvents = events.filter(
        (e) => e.date >= thisMonthStart && e.date <= thisMonthEnd
      )
      let totalOwed = 0
      let pending = 0
      let scheduled = 0
      let paid = 0
      let paidOwed = 0
      events.forEach((e) => {
        const summary = computeSettlement({
          guarantee: e.guarantee ?? null,
          door_split_pct: e.doorSplitPct ?? null,
          ticket_revenue: e.ticketRevenue ?? null,
          expenses: Array.isArray(e.expenses) ? e.expenses : [],
        })
        if (e.date >= thisMonthStart && e.date <= thisMonthEnd) {
          totalOwed += summary.amountOwedToArtist
        }
        const s = (e.payoutStatus ?? "pending") as string
        if (s === "pending") pending++
        else if (s === "scheduled") scheduled++
        else if (s === "paid") {
          paid++
          paidOwed += summary.amountOwedToArtist
        }
      })
      return {
        monthShows: monthEvents.length,
        totalOwedThisMonth: totalOwed,
        pendingCount: pending,
        scheduledCount: scheduled,
        paidCount: paid,
        totalPaidOwed: paidOwed,
      }
    }, [events, thisMonthStart, thisMonthEnd])

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            This month
          </CardTitle>
          <CardDescription className="text-xs">
            {format(now, "MMMM yyyy")} · {monthShows} show(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold font-mono text-foreground">
            ${totalOwedThisMonth.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Amount owed (artist) this month</p>
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            By status
          </CardTitle>
          <CardDescription className="text-xs">Pending · Scheduled · Paid</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="text-muted-foreground">Pending:</span>
            <span className="font-mono font-medium">{pendingCount}</span>
            <span className="text-muted-foreground ml-2">Scheduled:</span>
            <span className="font-mono font-medium">{scheduledCount}</span>
            <span className="text-muted-foreground ml-2">Paid:</span>
            <span className="font-mono font-medium">{paidCount}</span>
          </div>
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Total paid
          </CardTitle>
          <CardDescription className="text-xs">Amount owed on paid shows</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold font-mono text-foreground">
            ${totalPaidOwed.toLocaleString()}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
