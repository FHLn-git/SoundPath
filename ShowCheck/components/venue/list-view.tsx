"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEvent, type Event } from "@/components/event-context"
import type { EventStatus } from "@/components/event-context"
import { format } from "date-fns"
import { Calendar, FileSignature } from "lucide-react"

type StatusFilter = "all" | EventStatus | "past"

const STATUS_LABELS: Record<EventStatus, string> = {
  draft: "Draft",
  open: "Open",
  hold: "Hold",
  hold_1: "Hold 1",
  hold_2: "Hold 2",
  challenged: "Challenged",
  confirmed: "Confirmed",
  "pending-approval": "Pending",
  on_sale: "On sale",
  cancelled: "Cancelled",
  completed: "Completed",
}

function getStatusLabel(s: EventStatus): string {
  return STATUS_LABELS[s] ?? s
}

interface ListViewProps {
  onEventClick?: (event: Event) => void
  onConvertHold?: (event: Event) => void
  /** Called when user clicks Remove; parent can open a dialog and then call actual remove with autoPromote */
  onRemoveHold?: (event: Event) => void
}

export function ListView({ onEventClick, onConvertHold, onRemoveHold }: ListViewProps) {
  const { events } = useEvent()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const today = format(new Date(), "yyyy-MM-dd")

  const filtered = events.filter((ev) => {
    if (statusFilter === "all") return true
    if (statusFilter === "past") return ev.date < today
    return ev.status === statusFilter
  })

  const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-medium text-foreground">Events & holds</h3>
          <Tabs
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            className="w-full sm:w-auto"
          >
            <TabsList className="bg-secondary/50 p-1 h-auto flex-wrap">
              <TabsTrigger value="all" className="text-xs data-[state=active]:bg-card">
                All
              </TabsTrigger>
              <TabsTrigger value="hold" className="text-xs data-[state=active]:bg-card">
                Holds
              </TabsTrigger>
              <TabsTrigger value="confirmed" className="text-xs data-[state=active]:bg-card">
                Confirmed
              </TabsTrigger>
              <TabsTrigger value="on_sale" className="text-xs data-[state=active]:bg-card">
                On sale
              </TabsTrigger>
              <TabsTrigger value="past" className="text-xs data-[state=active]:bg-card">
                Past
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-mono text-muted-foreground">Date</TableHead>
                <TableHead className="text-muted-foreground">Stage</TableHead>
                <TableHead className="text-muted-foreground">Artist</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Offer</TableHead>
                {(onConvertHold || onRemoveHold) && (
                  <TableHead className="text-muted-foreground w-[120px]">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((ev) => (
                <TableRow
                  key={ev.id}
                  className="border-border cursor-pointer hover:bg-muted/30"
                  onClick={() => onEventClick?.(ev)}
                >
                  <TableCell className="font-mono text-sm text-foreground">
                    {format(new Date(ev.date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {ev.stageName ?? (ev.linkedStageIds?.length ? "Multi" : "—")}
                  </TableCell>
                  <TableCell className="text-sm text-foreground">
                    {ev.bands?.[0]?.name ?? ev.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        ev.status === "hold"
                          ? "border-amber-500/50 text-amber-400"
                          : ev.status === "confirmed"
                            ? "border-emerald-500/50 text-emerald-400"
                            : "border-border text-muted-foreground"
                      }
                    >
                      {getStatusLabel(ev.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {ev.offerId ? (
                      <span className="inline-flex items-center gap-1 text-primary">
                        <FileSignature className="w-3.5 h-3.5" />
                        Linked
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  {(onConvertHold || onRemoveHold) && ev.status === "hold" && (
                    <TableCell onClick={(e) => e.stopPropagation()} className="space-x-1">
                      {onConvertHold && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => onConvertHold(ev)}
                        >
                          Confirm
                        </Button>
                      )}
                      {onRemoveHold && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => onRemoveHold?.(ev)}
                        >
                          Remove
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="w-10 h-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {statusFilter === "all" ? "No events yet" : `No ${statusFilter} events`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
