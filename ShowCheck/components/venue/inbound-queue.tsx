"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useInbound } from "@/lib/use-inbound"
import { updateInbound } from "@/lib/inbound-api"
import type { InboundSubmissionRow, InboundStatus } from "@/lib/venue-types"
import { Inbox, Link2, Anchor, FileSignature, Check, X, MoreHorizontal } from "lucide-react"
import { format } from "date-fns"

interface InboundQueueProps {
  venueId: string | null
  groupId: string | null
  inboundFormBaseUrl?: string
  onCreateHold?: (submission: InboundSubmissionRow) => void
  onCreateOffer?: (submission: InboundSubmissionRow) => void
}

const STATUS_LABELS: Record<InboundStatus, string> = {
  new: "New",
  reviewed: "Reviewed",
  converted: "Converted",
  rejected: "Rejected",
}

export function InboundQueue({
  venueId,
  groupId,
  inboundFormBaseUrl = "",
  onCreateHold,
  onCreateOffer,
}: InboundQueueProps) {
  const PAGE_SIZE = 20
  const { submissions, loading, error, refetch } = useInbound(venueId, groupId)
  const [statusFilter, setStatusFilter] = useState<InboundStatus | "all">("all")
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (statusFilter === "all") return submissions
    return submissions.filter((s) => s.status === statusFilter)
  }, [submissions, statusFilter])
  const visible = filtered.slice(0, visibleCount)
  const hasMore = filtered.length > visibleCount
  const showLoadMore = hasMore && filtered.length > PAGE_SIZE

  const formLink = venueId && inboundFormBaseUrl
    ? `${inboundFormBaseUrl.replace(/\/$/, "")}/inbound/${venueId}`
    : ""

  const setStatus = async (id: string, status: InboundStatus) => {
    setUpdatingId(id)
    try {
      await updateInbound(id, { status })
      await refetch()
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading && submissions.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-12 text-center text-muted-foreground">
          Loading inbound…
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-12 text-center text-destructive">
          {error.message}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Inbox className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">Inbound requests</h3>
        </div>
        {formLink && (
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={formLink}
              className="font-mono text-xs h-8 max-w-[280px]"
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => navigator.clipboard.writeText(formLink)}
            >
              <Link2 className="w-3.5 h-3.5" />
              Copy link
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <Tabs
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as InboundStatus | "all")
            setVisibleCount(PAGE_SIZE)
          }}
        >
          <div className="px-4 pb-2">
            <TabsList className="bg-secondary/50 p-1 h-auto flex-wrap">
              <TabsTrigger value="all" className="text-xs data-[state=active]:bg-card">All</TabsTrigger>
              <TabsTrigger value="new" className="text-xs data-[state=active]:bg-card">New</TabsTrigger>
              <TabsTrigger value="reviewed" className="text-xs data-[state=active]:bg-card">Reviewed</TabsTrigger>
              <TabsTrigger value="converted" className="text-xs data-[state=active]:bg-card">Converted</TabsTrigger>
              <TabsTrigger value="rejected" className="text-xs data-[state=active]:bg-card">Rejected</TabsTrigger>
            </TabsList>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Artist</TableHead>
                  <TableHead className="text-muted-foreground">Contact</TableHead>
                  <TableHead className="text-muted-foreground">Requested dates</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Submitted</TableHead>
                  <TableHead className="text-muted-foreground w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => (
                  <TableRow key={row.id} className="border-border">
                    <TableCell className="font-medium text-foreground">
                      {row.artist_name || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.contact_email || row.contact_phone || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                      {Array.isArray(row.requested_dates) && row.requested_dates.length > 0
                        ? (row.requested_dates as string[]).join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          row.status === "new"
                            ? "border-amber-500/50 text-amber-400"
                            : row.status === "converted"
                              ? "border-emerald-500/50 text-emerald-400"
                              : row.status === "rejected"
                                ? "border-destructive/50 text-destructive"
                                : "border-border text-muted-foreground"
                        }
                      >
                        {STATUS_LABELS[row.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {format(new Date(row.submitted_at), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={!!updatingId}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[180px]">
                          {onCreateHold && (
                            <DropdownMenuItem onClick={() => onCreateHold(row)} className="gap-2">
                              <Anchor className="w-4 h-4" />
                              Create hold
                            </DropdownMenuItem>
                          )}
                          {onCreateOffer && (
                            <DropdownMenuItem onClick={() => onCreateOffer(row)} className="gap-2">
                              <FileSignature className="w-4 h-4" />
                              Create offer
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => setStatus(row.id, "reviewed")}
                            disabled={updatingId === row.id || row.status === "reviewed"}
                            className="gap-2"
                          >
                            <Check className="w-4 h-4" />
                            Mark reviewed
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setStatus(row.id, "rejected")}
                            disabled={updatingId === row.id || row.status === "rejected"}
                            className="gap-2 text-destructive"
                          >
                            <X className="w-4 h-4" />
                            Reject
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Inbox className="w-10 h-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {statusFilter === "all" ? "No inbound requests yet" : `No ${statusFilter} requests`}
              </p>
              {formLink && (
                <p className="text-xs text-muted-foreground mt-1">
                  Share the form link above so artists can submit.
                </p>
              )}
            </div>
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
        </Tabs>
      </CardContent>
    </Card>
  )
}
