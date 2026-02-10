"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useEvent, type Event } from "@/components/event-context"
import { computeSettlement } from "@/lib/settlement-calc"
import { DollarSign } from "lucide-react"
import { format } from "date-fns"

type PayoutFilter = "all" | "pending" | "scheduled" | "paid"

interface PaymentTrackerViewProps {
  onEventClick?: (event: Event) => void
}

const PAGE_SIZE = 20

export function PaymentTrackerView({ onEventClick }: PaymentTrackerViewProps) {
  const { events, saveEvent } = useEvent()
  const [statusFilter, setStatusFilter] = useState<PayoutFilter>("all")
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    return events
      .filter((e) => {
        const s = (e.payoutStatus ?? "pending") as string
        if (statusFilter === "all") return true
        return s === statusFilter
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [events, statusFilter])
  const visible = filtered.slice(0, visibleCount)
  const hasMore = filtered.length > visibleCount
  const showLoadMore = hasMore && filtered.length > PAGE_SIZE

  const handleMarkPaid = async (event: Event) => {
    if (!saveEvent) return
    await saveEvent({
      ...event,
      payoutStatus: "paid",
      settlementFinalizedAt: event.settlementFinalizedAt ?? new Date().toISOString(),
    })
  }

  const getAmountOwed = (e: Event) => {
    const summary = computeSettlement({
      guarantee: e.guarantee ?? null,
      door_split_pct: e.doorSplitPct ?? null,
      ticket_revenue: e.ticketRevenue ?? null,
      expenses: Array.isArray(e.expenses) ? e.expenses : [],
    })
    return summary.amountOwedToArtist
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Payment tracker
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Shows with payout status. Mark as paid when settled.
          </CardDescription>
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as PayoutFilter)
            setVisibleCount(PAGE_SIZE)
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No shows match the filter.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-muted-foreground">Event</TableHead>
                <TableHead className="text-muted-foreground">Amount owed</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((ev) => {
                const status = (ev.payoutStatus ?? "pending") as string
                const amount = getAmountOwed(ev)
                return (
                  <TableRow
                    key={ev.id}
                    className="border-border cursor-pointer hover:bg-muted/30"
                    onClick={() => onEventClick?.(ev)}
                  >
                    <TableCell className="font-mono text-sm">
                      {format(new Date(ev.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{ev.name}</TableCell>
                    <TableCell className="font-mono text-sm">
                      ${amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status === "paid" ? "default" : "secondary"}>
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {status !== "paid" && saveEvent && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkPaid(ev)}
                          className="gap-1"
                        >
                          Mark paid
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        {showLoadMore && (
          <div className="px-4 py-3 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
            >
              Load more ({filtered.length - visibleCount} remaining)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
